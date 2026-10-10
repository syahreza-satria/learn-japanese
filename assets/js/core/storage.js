// Wrapper localStorage. Semua akses dibungkus try/catch; bila gagal, state disimpan di memori.
import { STORAGE_PREFIX, DATA_VERSION } from "./config.js";
import { newCard, review, toDateStr } from "./srs.js";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "auto",
  showRomaji: true,
  ttsRate: 0.9,
  dailyGoal: 10,
});

const KEYS = ["settings", "srs", "quizHistory", "activity", "lastLesson"];
const MAX_HISTORY = 100;
const memory = new Map();
let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  window.dispatchEvent(new CustomEvent("mb:storage-error"));
}

export function getItem(key, fallback) {
  const full = STORAGE_PREFIX + key;
  try {
    const raw = localStorage.getItem(full);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    warnOnce();
  }
  if (memory.has(full)) return JSON.parse(memory.get(full));
  return fallback;
}

export function setItem(key, value) {
  const full = STORAGE_PREFIX + key;
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(full, raw);
    memory.delete(full);
  } catch {
    memory.set(full, raw);
    warnOnce();
  }
}

function removeItem(key) {
  const full = STORAGE_PREFIX + key;
  memory.delete(full);
  try {
    localStorage.removeItem(full);
  } catch {
    warnOnce();
  }
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isDateStr = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---- Settings ----------------------------------------------------------------

export function getSettings() {
  const stored = getItem("settings", {});
  return { ...DEFAULT_SETTINGS, ...(isPlainObject(stored) ? stored : {}) };
}

export function updateSettings(patch) {
  const next = { ...getSettings(), ...patch };
  setItem("settings", next);
  return next;
}

// ---- SRS ---------------------------------------------------------------------

export function getSrs() {
  const srs = getItem("srs", {});
  return isPlainObject(srs) ? srs : {};
}

/** Masukkan item ke antrian SRS. `forceDue` memajukan jadwal item yang sudah ada ke hari ini. */
export function addToSrs(ids, { forceDue = false } = {}) {
  const today = toDateStr();
  const srs = getSrs();
  let added = 0;
  for (const id of ids) {
    if (!srs[id]) {
      srs[id] = newCard(today);
      added += 1;
    } else if (forceDue && srs[id].due > today) {
      srs[id] = { ...srs[id], due: today };
    }
  }
  setItem("srs", srs);
  return added;
}

/** Nilai satu kartu, simpan, dan catat aktivitas. */
export function gradeCard(id, grade) {
  const today = toDateStr();
  const srs = getSrs();
  const next = review(srs[id] ?? newCard(today), grade, today);
  srs[id] = next;
  setItem("srs", srs);
  recordActivity();
  return next;
}

// ---- Aktivitas, kuis, pelajaran terakhir ------------------------------------------

export function getActivity() {
  const activity = getItem("activity", {});
  return isPlainObject(activity) ? activity : {};
}

export function recordActivity(count = 1) {
  const activity = getActivity();
  const today = toDateStr();
  activity[today] = (activity[today] ?? 0) + count;
  setItem("activity", activity);
}

export function getQuizHistory() {
  const history = getItem("quizHistory", []);
  return Array.isArray(history) ? history : [];
}

export function addQuizResult({ source, mode, total, correct }) {
  const history = getQuizHistory();
  history.push({ date: toDateStr(), source, mode, total, correct });
  setItem("quizHistory", history.slice(-MAX_HISTORY));
}

export function getLastLesson() {
  return getItem("lastLesson", null);
}

export function setLastLesson({ page, params = "", label }) {
  setItem("lastLesson", { page, params, label });
}

// ---- Ekspor / impor / reset -----------------------------------------------------

export function exportData() {
  const data = {};
  for (const key of KEYS) {
    const value = getItem(key, undefined);
    if (value !== undefined) data[key] = value;
  }
  return { app: "manabii", version: DATA_VERSION, exportedAt: new Date().toISOString(), data };
}

function validateImport(payload) {
  if (!isPlainObject(payload) || payload.app !== "manabii") {
    throw new Error("Berkas ini bukan cadangan Manabii.");
  }
  if (!Number.isInteger(payload.version) || payload.version < 1 || payload.version > DATA_VERSION) {
    throw new Error(`Versi cadangan (${payload.version}) tidak didukung.`);
  }
  if (!isPlainObject(payload.data)) throw new Error("Isi cadangan tidak valid.");

  const { settings, srs, quizHistory, activity } = payload.data;
  if (settings !== undefined && !isPlainObject(settings)) throw new Error("Pengaturan tidak valid.");
  if (srs !== undefined) {
    const ok =
      isPlainObject(srs) &&
      Object.values(srs).every(
        (c) => isPlainObject(c) && Number.isFinite(c.ease) && Number.isFinite(c.interval) && isDateStr(c.due),
      );
    if (!ok) throw new Error("Data SRS tidak valid.");
  }
  if (quizHistory !== undefined && !Array.isArray(quizHistory)) throw new Error("Riwayat kuis tidak valid.");
  if (activity !== undefined) {
    const ok =
      isPlainObject(activity) && Object.entries(activity).every(([d, n]) => isDateStr(d) && Number.isFinite(n));
    if (!ok) throw new Error("Data aktivitas tidak valid.");
  }
}

/** Ganti semua data dengan isi cadangan. Melempar Error berpesan Indonesia bila tidak valid. */
export function importData(payload) {
  validateImport(payload);
  resetData();
  for (const key of KEYS) {
    if (payload.data[key] !== undefined) setItem(key, payload.data[key]);
  }
}

export function resetData() {
  for (const key of KEYS) removeItem(key);
}
