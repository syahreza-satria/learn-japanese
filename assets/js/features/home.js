// Beranda: lanjutkan belajar, review hari ini, streak, target harian.
import { getActivity, getLastLesson, getSettings, getSrs } from "../core/storage.js";
import { toDateStr } from "../core/srs.js";
import { computeStreak, countDue } from "../core/stats.js";
import { escapeHtml } from "../core/ui.js";

const today = toDateStr();
const srs = getSrs();
const activity = getActivity();
const lastLesson = getLastLesson();

// Lanjutkan belajar
const continueCard = document.getElementById("continueCard");
const target = lastLesson?.page ? `${lastLesson.page}${lastLesson.params ?? ""}` : "kana.html";
const safeTarget = /^[a-z]+\.html(\?[\w=&.%-]*)?$/i.test(target) ? target : "kana.html";
continueCard.innerHTML = `
  <h2 class="h6 text-secondary mb-2">Lanjutkan belajar</h2>
  <p class="mb-3 fs-5 mb-serif">${escapeHtml(lastLesson?.label ?? "Hiragana — Gojūon")}</p>
  <a class="btn btn-primary" href="${escapeHtml(safeTarget)}">${lastLesson ? "Lanjutkan" : "Mulai belajar"}
    <i class="bi bi-arrow-right" aria-hidden="true"></i></a>`;

if (lastLesson) {
  const start = document.getElementById("heroStart");
  start.textContent = "Lanjutkan belajar";
  start.href = safeTarget;
}

// Review hari ini
const due = countDue(srs, today);
document.getElementById("reviewCard").innerHTML = due
  ? `<h2 class="h6 text-secondary mb-2">Review hari ini</h2>
     <p class="mb-3 fs-5 mb-serif">${due} kartu menunggu</p>
     <a class="btn btn-primary" href="flashcard.html?deck=due">Mulai review <i class="bi bi-arrow-right" aria-hidden="true"></i></a>`
  : `<h2 class="h6 text-secondary mb-2">Review hari ini</h2>
     <p class="mb-3 text-secondary">Tidak ada kartu yang jatuh tempo (0 kartu). Pilih dek untuk mulai berlatih.</p>
     <a class="btn btn-outline-secondary" href="flashcard.html">Pilih dek</a>`;

// Streak & target harian
document.getElementById("streakValue").textContent = computeStreak(activity, today).current;
const goal = Math.max(1, getSettings().dailyGoal);
const done = activity[today] ?? 0;
document.getElementById("goalText").textContent = `${done} / ${goal}`;
const bar = document.getElementById("goalBar");
const percent = Math.min(100, Math.round((done / goal) * 100));
bar.setAttribute("aria-valuenow", percent);
bar.firstElementChild.style.width = `${percent}%`;
