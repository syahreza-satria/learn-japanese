// Progres: statistik, riwayat kuis, pengaturan, ekspor/impor/reset data.
import { loadItemIndex } from "../core/data.js";
import { toDateStr } from "../core/srs.js";
import {
  exportData,
  getActivity,
  getQuizHistory,
  getSettings,
  getSrs,
  importData,
  resetData,
  updateSettings,
} from "../core/storage.js";
import { computeStreak, countMastered, totalReviews } from "../core/stats.js";
import { speak } from "../core/tts.js";
import { applyTheme, escapeHtml, hideModal, showLoadError, showModal, showToast } from "../core/ui.js";

const contentEl = document.getElementById("progressContent");
const SOURCE_LABELS = { hiragana: "Hiragana", katakana: "Katakana", vocab: "Kosakata" };
const MODE_LABELS = { mc: "Pilihan ganda", mcr: "Romaji → kana", type: "Ketik" };
const THEMES = [
  ["auto", "Otomatis"],
  ["light", "Terang"],
  ["dark", "Gelap"],
];

const statCard = (value, label, extra = "") =>
  `<div class="col-6 col-md-4"><div class="mb-card mb-stat h-100">
    <div class="mb-stat-value">${value}</div><div class="mb-stat-label">${label}</div>${extra}</div></div>`;

function render(index) {
  const items = [...index.values()];
  const idsOf = (pred) => items.filter(pred).map((i) => i.id);
  const hiraIds = idsOf((i) => i.script === "hiragana");
  const kataIds = idsOf((i) => i.script === "katakana");
  const vocabIds = idsOf((i) => i.type === "vocab");

  const srs = getSrs();
  const activity = getActivity();
  const settings = getSettings();
  const today = toDateStr();
  const streak = computeStreak(activity, today);
  const doneToday = activity[today] ?? 0;
  const goalPercent = Math.min(100, Math.round((doneToday / settings.dailyGoal) * 100));
  const history = getQuizHistory().slice(-10).reverse();

  contentEl.innerHTML = `
    <section aria-labelledby="statsTitle" class="mb-4">
      <h2 class="h4 mb-3" id="statsTitle">Statistik</h2>
      <div class="row g-3">
        ${statCard(`${countMastered(srs, hiraIds)} / ${hiraIds.length}`, "Hiragana dikuasai")}
        ${statCard(`${countMastered(srs, kataIds)} / ${kataIds.length}`, "Katakana dikuasai")}
        ${statCard(`${countMastered(srs, vocabIds)} / ${vocabIds.length}`, "Kata dikuasai")}
        ${statCard(totalReviews(activity), "Total review")}
        ${statCard(`${streak.current} <small class="fs-6">hari</small>`, `Streak saat ini (terbaik ${streak.best})`)}
        ${statCard(
          `${doneToday} / ${settings.dailyGoal}`,
          "Target harian",
          `<div class="progress mt-2" role="progressbar" aria-label="Target harian" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${goalPercent}">
            <div class="progress-bar" style="width:${goalPercent}%"></div></div>`,
        )}
      </div>
      <p class="small text-secondary mt-2 mb-0">Sebuah item dianggap dikuasai bila interval ulangannya sudah 21 hari atau lebih.</p>
    </section>

    <section aria-labelledby="historyTitle" class="mb-4">
      <h2 class="h4 mb-3" id="historyTitle">Riwayat kuis</h2>
      ${
        history.length
          ? `<div class="table-responsive mb-card"><table class="table table-sm align-middle mb-0">
              <thead><tr><th scope="col">Tanggal</th><th scope="col">Sumber</th><th scope="col">Mode</th><th scope="col" class="text-end">Skor</th></tr></thead>
              <tbody>${history
                .map(
                  (h) => `<tr><td>${escapeHtml(h.date)}</td><td>${escapeHtml(SOURCE_LABELS[h.source] ?? h.source)}</td>
                  <td>${escapeHtml(MODE_LABELS[h.mode] ?? h.mode)}</td><td class="text-end">${h.correct} / ${h.total}</td></tr>`,
                )
                .join("")}</tbody></table></div>`
          : `<p class="text-secondary">Belum ada kuis. <a href="kuis.html">Coba kuis pertama</a>.</p>`
      }
    </section>

    <section aria-labelledby="settingsTitle" class="mb-4">
      <h2 class="h4 mb-3" id="settingsTitle">Pengaturan</h2>
      <form class="mb-card p-3 p-md-4" id="settingsForm" onsubmit="return false">
        <div class="row g-4">
          <div class="col-md-6">
            <span class="form-label d-block" id="themeLabel">Mode tampilan</span>
            <div class="btn-group" role="group" aria-labelledby="themeLabel">
              ${THEMES.map(
                ([value, label]) => `<input type="radio" class="btn-check" name="theme" id="theme-${value}" value="${value}"${settings.theme === value ? " checked" : ""}>
                  <label class="btn btn-outline-secondary" for="theme-${value}">${label}</label>`,
              ).join("")}
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-check form-switch mt-md-4">
              <input class="form-check-input" type="checkbox" role="switch" id="setRomaji"${settings.showRomaji ? " checked" : ""}>
              <label class="form-check-label" for="setRomaji">Tampilkan romaji</label>
            </div>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="setRate">Kecepatan suara: <span id="rateValue">${settings.ttsRate.toFixed(1)}</span>×</label>
            <div class="d-flex align-items-center gap-2">
              <input type="range" class="form-range" id="setRate" min="0.6" max="1.2" step="0.1" value="${settings.ttsRate}">
              <button type="button" class="btn btn-sm btn-outline-secondary text-nowrap" id="rateTest"><i class="bi bi-volume-up" aria-hidden="true"></i> Coba</button>
            </div>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="setGoal">Target harian (review)</label>
            <input type="number" class="form-control" id="setGoal" min="1" max="200" value="${settings.dailyGoal}">
          </div>
        </div>
      </form>
    </section>

    <section aria-labelledby="dataTitle">
      <h2 class="h4 mb-3" id="dataTitle">Data saya</h2>
      <div class="mb-card p-3 p-md-4">
        <p class="text-secondary">Progres hanya tersimpan di browser ini. Unduh cadangan untuk memindahkannya ke perangkat lain.</p>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-secondary" id="exportBtn"><i class="bi bi-download" aria-hidden="true"></i> Ekspor data</button>
          <button type="button" class="btn btn-outline-secondary" id="importBtn"><i class="bi bi-upload" aria-hidden="true"></i> Impor data</button>
          <input type="file" id="importFile" accept="application/json,.json" hidden>
          <button type="button" class="btn btn-outline-primary ms-md-auto" id="resetBtn"><i class="bi bi-trash" aria-hidden="true"></i> Reset semua data</button>
        </div>
      </div>
    </section>`;
}

// ---- Event -----------------------------------------------------------------------

contentEl.addEventListener("change", (event) => {
  const { target } = event;
  if (target.name === "theme") {
    updateSettings({ theme: target.value });
    applyTheme();
  } else if (target.id === "setRomaji") {
    updateSettings({ showRomaji: target.checked });
  } else if (target.id === "setRate") {
    updateSettings({ ttsRate: Number(target.value) });
  } else if (target.id === "setGoal") {
    const goal = Math.min(200, Math.max(1, Math.round(Number(target.value)) || 10));
    target.value = goal;
    updateSettings({ dailyGoal: goal });
    boot();
  } else if (target.id === "importFile") {
    importFromFile(target.files[0]);
    target.value = "";
  }
});

contentEl.addEventListener("input", (event) => {
  if (event.target.id === "setRate") {
    document.getElementById("rateValue").textContent = Number(event.target.value).toFixed(1);
  }
});

contentEl.addEventListener("click", (event) => {
  if (event.target.closest("#rateTest")) {
    speak("こんにちは。よろしくおねがいします。", { rate: Number(document.getElementById("setRate").value) });
  } else if (event.target.closest("#exportBtn")) {
    downloadBackup();
  } else if (event.target.closest("#importBtn")) {
    document.getElementById("importFile").click();
  } else if (event.target.closest("#resetBtn")) {
    showModal(document.getElementById("resetModal"));
  }
});

document.getElementById("resetConfirm").addEventListener("click", () => {
  resetData();
  hideModal(document.getElementById("resetModal"));
  applyTheme();
  showToast("Semua data telah dihapus.", { type: "success" });
  boot();
});

function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `manabii-backup-${toDateStr()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function importFromFile(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!window.confirm("Impor akan menimpa semua data saat ini. Lanjutkan?")) return;
    importData(payload);
    applyTheme();
    showToast("Data berhasil diimpor.", { type: "success" });
    boot();
  } catch (error) {
    const message = error instanceof SyntaxError ? "Berkas bukan JSON yang valid." : error.message;
    showToast(`Impor gagal: ${message}`, { type: "danger", delay: 8000 });
  }
}

let index;
async function boot() {
  try {
    index ??= await loadItemIndex();
    render(index);
  } catch (error) {
    showLoadError(contentEl, error);
  }
}

boot();
