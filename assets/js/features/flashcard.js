// Flashcard SRS: pilih dek → sesi kartu flip → penilaian 0–3 (SM-2 sederhana).
import { loadItemIndex, loadThemes, speechText } from "../core/data.js";
import { shuffle } from "../core/random.js";
import { GRADE, newCard, review, toDateStr } from "../core/srs.js";
import { getSettings, getSrs, gradeCard, setLastLesson, updateSettings } from "../core/storage.js";
import { speak } from "../core/tts.js";
import { escapeHtml, hankoHtml, japaneseHtml, showLoadError } from "../core/ui.js";

const NEW_PER_SESSION = 20;
const PRACTICE_ALL_LIMIT = 30;

const pickerEl = document.getElementById("deckPicker");
const sessionEl = document.getElementById("flashSession");

const GRADES = [
  { grade: GRADE.FORGOT, label: "Lupa", btn: "btn-outline-primary" },
  { grade: GRADE.HARD, label: "Sulit", btn: "btn-outline-secondary" },
  { grade: GRADE.GOOD, label: "Bisa", btn: "btn-outline-secondary" },
  { grade: GRADE.EASY, label: "Mudah", btn: "btn-outline-secondary" },
];

let index; // Map id -> item
let themes = [];
let session = null;

// ---- Pemilihan dek ---------------------------------------------------------------

const allItems = () => [...index.values()];
const deckItems = ({ deck, theme }) => {
  if (deck === "hiragana" || deck === "katakana") return allItems().filter((i) => i.script === deck);
  if (deck === "vocab") return allItems().filter((i) => i.type === "vocab" && (!theme || i.theme === theme));
  return [];
};

function deckLabel({ deck, theme }) {
  if (deck === "due") return "Review hari ini";
  if (deck === "hiragana") return "Hiragana";
  if (deck === "katakana") return "Katakana";
  return theme ? `Kosakata — ${themes.find((t) => t.id === theme)?.label ?? theme}` : "Kosakata";
}

/** Susun antrean kartu: yang jatuh tempo dulu, lalu kartu baru (dibatasi per sesi). */
function buildQueue(spec) {
  const today = toDateStr();
  const srs = getSrs();
  if (spec.all) {
    const items = spec.deck === "due" ? allItems().filter((i) => srs[i.id]) : deckItems(spec);
    return shuffle(items.map((i) => i.id)).slice(0, PRACTICE_ALL_LIMIT);
  }
  if (spec.deck === "due") {
    return Object.keys(srs)
      .filter((id) => index.has(id) && srs[id].due <= today)
      .sort((a, b) => srs[a].due.localeCompare(srs[b].due));
  }
  const items = deckItems(spec);
  const due = items.filter((i) => srs[i.id] && srs[i.id].due <= today).map((i) => i.id);
  const fresh = items.filter((i) => !srs[i.id]).map((i) => i.id);
  return [...shuffle(due), ...fresh.slice(0, NEW_PER_SESSION)];
}

function renderPicker(notice = "") {
  const srs = getSrs();
  const today = toDateStr();
  const dueCount = Object.keys(srs).filter((id) => index.has(id) && srs[id].due <= today).length;
  const available = (spec) => buildQueue(spec).length;
  const card = (spec, icon, title, text) => `
    <div class="col-md-6"><div class="mb-card p-3 h-100 d-flex flex-column">
      <div class="d-flex align-items-start gap-3 mb-3">
        <i class="bi ${icon} fs-2 text-primary" aria-hidden="true"></i>
        <div><h2 class="h5 mb-1">${title}</h2><p class="small text-secondary mb-0">${text}</p></div>
      </div>
      <div class="mt-auto">${spec.extra ?? ""}
        <button type="button" class="btn btn-primary" data-start='${JSON.stringify({ deck: spec.deck })}' ${spec.disabled ? "disabled" : ""}>Mulai</button>
      </div></div></div>`;

  const themeSelect = `<label class="form-label small" for="deckTheme">Tema</label>
    <select class="form-select form-select-sm mb-2" id="deckTheme">
      <option value="">Semua tema</option>
      ${themes.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join("")}</select>`;

  pickerEl.innerHTML = `
    ${notice}
    <div class="row g-3">
      ${card({ deck: "due", disabled: dueCount === 0 }, "bi-calendar-check", `Review hari ini <span class="badge text-bg-sakura">${dueCount} kartu</span>`, dueCount ? "Kartu yang sudah jatuh tempo." : "Belum ada kartu jatuh tempo. Tambahkan dari Kosakata atau mulai dek di bawah.")}
      ${card({ deck: "hiragana" }, "bi-translate", `<span lang="ja">ひらがな</span> Hiragana`, `${available({ deck: "hiragana" })} kartu tersedia hari ini.`)}
      ${card({ deck: "katakana" }, "bi-translate", `<span lang="ja">カタカナ</span> Katakana`, `${available({ deck: "katakana" })} kartu tersedia hari ini.`)}
      ${card({ deck: "vocab", extra: themeSelect }, "bi-card-text", "Kosakata", "Pilih tema, atau semua tema sekaligus.")}
    </div>
    <p class="small text-secondary mt-3 mb-0">Setiap sesi memuat kartu yang jatuh tempo ditambah maksimal ${NEW_PER_SESSION} kartu baru.</p>`;
}

// ---- Sesi ------------------------------------------------------------------------

function startSession(spec) {
  const queue = buildQueue(spec);
  if (!queue.length) {
    const practice = JSON.stringify({ deck: spec.deck, theme: spec.theme, all: true });
    renderPicker(`<div class="alert alert-info d-flex flex-wrap align-items-center gap-2" role="status">
      <span class="me-auto">Tidak ada kartu yang perlu ditinjau di dek ini hari ini.</span>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-start='${practice}'>Latih tetap</button></div>`);
    return;
  }
  session = { spec, queue, total: queue.length, done: new Set(), counts: [0, 0, 0, 0], flipped: false };
  const params = new URLSearchParams({ deck: spec.deck });
  if (spec.theme) params.set("theme", spec.theme);
  history.replaceState(null, "", `?${params}`);
  setLastLesson({ page: "flashcard.html", params: `?${params}`, label: `Flashcard — ${deckLabel(spec)}` });

  pickerEl.hidden = true;
  sessionEl.hidden = false;
  renderSession();
}

const currentItem = () => index.get(session.queue[0]);

function frontHtml(item, showRomaji) {
  if (item.type === "kana") {
    return `<div class="mb-flashcard-big" lang="ja">${escapeHtml(item.char)}</div>
      ${showRomaji ? `<div class="text-secondary">${escapeHtml(item.romaji)}</div>` : ""}`;
  }
  return `<div class="mb-flashcard-big is-word" lang="ja">${escapeHtml(item.word)}</div>
    ${showRomaji ? `<div class="text-secondary">${escapeHtml(item.romaji)}</div>` : ""}`;
}

function backHtml(item) {
  if (item.type === "kana") {
    return `<div class="mb-flashcard-big" lang="ja">${escapeHtml(item.char)}</div>
      <div class="h3 mb-0">${escapeHtml(item.romaji)}</div>
      <div class="text-secondary small">Contoh</div>
      <div><span lang="ja" class="fs-5">${escapeHtml(item.example.word)}</span>
        <span class="text-secondary">(${escapeHtml(item.example.romaji)})</span><br>${escapeHtml(item.example.meaning)}</div>`;
  }
  return `<div class="mb-word fs-2">${japaneseHtml(item.word, item.kana)}</div>
    <div class="text-secondary">${escapeHtml(item.romaji)}</div>
    <div class="h4 mb-1">${escapeHtml(item.meaning)}</div>
    <div class="small text-secondary">Contoh</div>
    <div><span lang="ja">${escapeHtml(item.example.jp)}</span><br>${escapeHtml(item.example.id)}</div>`;
}

function hintFor(item, grade) {
  if (grade === GRADE.FORGOT) return "ulang sesi ini";
  const days = review(getSrs()[item.id] ?? newCard(), grade).interval;
  return `${days} hari`;
}

function renderSession() {
  if (!session.queue.length) return renderDone();
  const item = currentItem();
  const { showRomaji } = getSettings();
  const percent = Math.round((session.done.size / session.total) * 100);

  sessionEl.innerHTML = `
    <div class="mb-flip-scene mb-fade-in">
      <div class="d-flex justify-content-between align-items-center small text-secondary mb-1">
        <span>${escapeHtml(deckLabel(session.spec))}</span><span>Sisa ${session.queue.length} kartu</span>
      </div>
      <div class="progress mb-3" role="progressbar" aria-label="Kemajuan sesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <div class="progress-bar" style="width:${percent}%"></div></div>

      <div class="mb-flashcard" id="flashCard" role="button" tabindex="0" aria-label="Kartu. Tekan untuk membalik.">
        <div class="mb-card mb-flashcard-face mb-flashcard-front" id="faceFront">${frontHtml(item, showRomaji)}</div>
        <div class="mb-card mb-flashcard-face mb-flashcard-back" id="faceBack" aria-hidden="true">${backHtml(item)}</div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3 mb-3">
        <button type="button" class="btn btn-sm btn-outline-secondary" id="flashSpeak"><i class="bi bi-volume-up" aria-hidden="true"></i> Dengarkan</button>
        <div class="form-check form-switch mb-0">
          <input class="form-check-input" type="checkbox" role="switch" id="flashRomaji" ${showRomaji ? "checked" : ""}>
          <label class="form-check-label small" for="flashRomaji">Romaji</label></div>
      </div>

      <div id="flashControls"></div>
    </div>`;
  session.flipped = false;
  renderControls();
}

function renderControls() {
  const controls = document.getElementById("flashControls");
  if (!session.flipped) {
    controls.innerHTML = `<button type="button" class="btn btn-primary w-100" id="flipBtn">
      Balik kartu <span class="mb-kbd ms-2">Space</span></button>`;
    return;
  }
  const item = currentItem();
  controls.innerHTML = `<div class="btn-group mb-grade-btns w-100" role="group" aria-label="Nilai ingatan Anda">${GRADES.map(
    ({ grade, label, btn }, i) => `<button type="button" class="btn ${btn}" data-grade="${grade}">
      <span><span class="mb-kbd">${i + 1}</span>${label}</span><small>${hintFor(item, grade)}</small></button>`,
  ).join("")}</div>`;
}

function flip() {
  if (!session || !session.queue.length) return;
  session.flipped = !session.flipped;
  document.getElementById("flashCard").classList.toggle("is-flipped", session.flipped);
  document.getElementById("faceFront").setAttribute("aria-hidden", session.flipped);
  document.getElementById("faceBack").setAttribute("aria-hidden", !session.flipped);
  renderControls();
}

function grade(value) {
  if (!session?.flipped) return;
  const id = session.queue.shift();
  gradeCard(id, value);
  session.counts[value] += 1;
  if (value === GRADE.FORGOT) {
    // Muncul lagi beberapa kartu kemudian dalam sesi yang sama.
    session.queue.splice(Math.min(3, session.queue.length), 0, id);
  } else {
    session.done.add(id);
  }
  renderSession();
}

function renderDone() {
  const reviewed = session.counts.reduce((a, b) => a + b, 0);
  const remembered = session.counts[2] + session.counts[3];
  sessionEl.innerHTML = `
    <div class="text-center py-4 mb-fade-in">
      <div class="mb-3">${hankoHtml("済")}</div>
      <h2 class="h4">Sesi selesai!</h2>
      <p class="text-secondary">${session.done.size} kartu ditinjau (${reviewed} penilaian), ${remembered} dijawab “Bisa” atau “Mudah”.</p>
      <ul class="list-inline small text-secondary">
        ${GRADES.map(({ label }, i) => `<li class="list-inline-item">${label}: <strong>${session.counts[i]}</strong></li>`).join("")}
      </ul>
      <div class="d-flex flex-wrap gap-2 justify-content-center">
        <a class="btn btn-primary" href="flashcard.html">Pilih dek lain</a>
        <a class="btn btn-outline-secondary" href="index.html">Ke Beranda</a>
      </div>
    </div>`;
  history.replaceState(null, "", "flashcard.html");
}

// ---- Event -----------------------------------------------------------------------

pickerEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-start]");
  if (!btn) return;
  const spec = JSON.parse(btn.dataset.start);
  if (spec.deck === "vocab" && !spec.all) spec.theme = document.getElementById("deckTheme")?.value ?? "";
  startSession(spec);
});

sessionEl.addEventListener("click", (event) => {
  if (event.target.closest("#flashCard") || event.target.closest("#flipBtn")) return flip();
  const gradeBtn = event.target.closest("[data-grade]");
  if (gradeBtn) return grade(Number(gradeBtn.dataset.grade));
  if (event.target.closest("#flashSpeak")) return speak(speechText(currentItem()));
});

sessionEl.addEventListener("change", (event) => {
  if (event.target.id !== "flashRomaji") return;
  updateSettings({ showRomaji: event.target.checked });
  document.getElementById("faceFront").innerHTML = frontHtml(currentItem(), event.target.checked);
});

document.addEventListener("keydown", (event) => {
  if (!session || sessionEl.hidden || !session.queue.length) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest("input, select, textarea, .modal")) return;
  if (event.key === " " || event.key === "Enter") {
    if (event.target.closest("button, a")) return; // biarkan tombol bekerja normal
    event.preventDefault();
    flip();
  } else if (["1", "2", "3", "4"].includes(event.key) && session.flipped) {
    grade(Number(event.key) - 1);
  }
});

try {
  [index, themes] = await Promise.all([loadItemIndex(), loadThemes()]);
  const params = new URLSearchParams(location.search);
  const deck = params.get("deck");
  if (["due", "hiragana", "katakana", "vocab"].includes(deck)) {
    startSession({ deck, theme: params.get("theme") ?? "" });
  } else {
    renderPicker();
  }
} catch (error) {
  showLoadError(pickerEl, error);
}
