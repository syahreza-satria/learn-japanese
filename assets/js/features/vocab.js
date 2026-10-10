// Halaman Kosakata: tema, pencarian real-time, detail kata, tambah ke flashcard.
import { loadThemes, loadVocab } from "../core/data.js";
import { normalizeRomaji } from "../core/romaji.js";
import { addToSrs, getSrs, setLastLesson } from "../core/storage.js";
import { speak } from "../core/tts.js";
import { escapeHtml, japaneseHtml, showLoadError, showModal, showToast } from "../core/ui.js";

const contentEl = document.getElementById("vocabContent");
const searchEl = document.getElementById("vocabSearch");
const themeEl = document.getElementById("vocabTheme");
const modalBody = document.getElementById("wordModalBody");
const modalEl = document.getElementById("wordModal");

const params = new URLSearchParams(location.search);
const state = { themes: [], vocab: [], theme: params.get("theme") ?? "", query: params.get("q") ?? "", inSrs: new Set() };

const themeLabel = (id) => state.themes.find((t) => t.id === id)?.label ?? id;
const countIn = (id) => state.vocab.filter((v) => v.theme === id).length;

function filtered() {
  const q = state.query.trim().toLowerCase();
  const qr = normalizeRomaji(q);
  return state.vocab.filter((v) => {
    if (state.theme && v.theme !== state.theme) return false;
    if (!q) return true;
    return v._hay.includes(q) || (qr && v._romaji.includes(qr));
  });
}

function addButton(id, label) {
  const added = state.inSrs.has(id);
  return `<button type="button" class="btn btn-sm btn-outline-secondary" data-add="${id}" ${added ? "disabled" : ""}
    aria-label="${added ? "Sudah di flashcard" : `Tambahkan ${escapeHtml(label)} ke flashcard`}"
    title="${added ? "Sudah di flashcard" : "Tambahkan ke flashcard"}">
    <i class="bi ${added ? "bi-check-circle-fill" : "bi-plus-circle"}" aria-hidden="true"></i></button>`;
}

function renderThemes() {
  contentEl.innerHTML = `<div class="row g-3">${state.themes
    .map(
      (t) => `<div class="col-6 col-lg-4"><button type="button" class="mb-card mb-theme-card" data-theme="${t.id}">
        <i class="bi ${escapeHtml(t.icon)} fs-3 text-primary" aria-hidden="true"></i>
        <div class="h6 mt-2 mb-1">${escapeHtml(t.label)}</div>
        <div class="small text-secondary">${escapeHtml(t.description)}</div>
        <span class="badge text-bg-sakura mt-2">${countIn(t.id)} kata</span></button></div>`,
    )
    .join("")}</div>`;
}

function renderList() {
  const words = filtered();
  const title = state.theme ? themeLabel(state.theme) : "Hasil pencarian";
  const rows = words
    .map(
      (v) => `<div class="mb-word-row">
        <button type="button" class="mb-word-main" data-detail="${v.id}">
          <span class="mb-word">${japaneseHtml(v.word, v.kana)}</span>
          <div class="mb-word-meaning">${escapeHtml(v.meaning)}</div>
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-speak="${v.id}" aria-label="Dengarkan ${escapeHtml(v.kana)}">
          <i class="bi bi-volume-up" aria-hidden="true"></i></button>
        ${addButton(v.id, v.word)}</div>`,
    )
    .join("");

  contentEl.innerHTML = `
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <h2 class="h5 mb-0 me-auto">${escapeHtml(title)} <span class="badge text-bg-sakura">${words.length} kata</span></h2>
      ${state.theme ? `<a class="btn btn-sm btn-outline-secondary" href="kuis.html?source=vocab&theme=${state.theme}&mode=mc&count=10">
        <i class="bi bi-patch-question" aria-hidden="true"></i> Kuis tema ini</a>` : ""}
      ${words.length ? `<button type="button" class="btn btn-sm btn-outline-primary" data-add-all>
        <i class="bi bi-plus-circle" aria-hidden="true"></i> Tambahkan ${words.length} kata ke flashcard</button>` : ""}
    </div>
    ${words.length ? `<div class="mb-card">${rows}</div>` : `<p class="text-secondary">Tidak ada kata yang cocok.</p>`}`;
}

function render() {
  const showThemes = !state.theme && !state.query.trim();
  if (showThemes) renderThemes();
  else renderList();

  themeEl.value = state.theme;
  const url = new URL(location.href);
  const next = new URLSearchParams();
  if (state.theme) next.set("theme", state.theme);
  if (state.query) next.set("q", state.query);
  url.search = next.toString() ? `?${next}` : "";
  history.replaceState(null, "", url);
}

function openDetail(id) {
  const v = state.vocab.find((w) => w.id === id);
  document.getElementById("wordModalLabel").textContent = themeLabel(v.theme);
  modalBody.innerHTML = `
    <div class="text-center mb-3">
      <div class="mb-word display-5">${japaneseHtml(v.word, v.kana)}</div>
      <div class="text-secondary">${escapeHtml(v.romaji)}</div>
      <div class="h5 mt-2">${escapeHtml(v.meaning)}</div>
    </div>
    <div class="mb-card p-3 mb-3">
      <div class="small text-secondary mb-1">Contoh kalimat</div>
      <div class="fs-5" lang="ja">${escapeHtml(v.example.jp)}</div>
      <div>${escapeHtml(v.example.id)}</div>
    </div>
    <div class="d-flex flex-wrap gap-2 justify-content-center">
      <button type="button" class="btn btn-outline-secondary" data-speak="${v.id}"><i class="bi bi-volume-up" aria-hidden="true"></i> Kata</button>
      <button type="button" class="btn btn-outline-secondary" data-speak-example="${v.id}"><i class="bi bi-volume-up" aria-hidden="true"></i> Kalimat</button>
      <button type="button" class="btn btn-primary" data-add="${v.id}" ${state.inSrs.has(v.id) ? "disabled" : ""}>
        <i class="bi bi-plus-circle" aria-hidden="true"></i> ${state.inSrs.has(v.id) ? "Sudah di flashcard" : "Tambahkan ke flashcard"}</button>
    </div>`;
  showModal(modalEl);
}

function addWords(ids) {
  const added = addToSrs(ids);
  ids.forEach((id) => state.inSrs.add(id));
  showToast(added ? `${added} kata ditambahkan ke flashcard.` : "Semua kata sudah ada di flashcard.", {
    type: added ? "success" : "info",
  });
  if (!modalEl.classList.contains("show")) render();
  else {
    render();
    const btn = modalBody.querySelector("[data-add]");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Sudah di flashcard`;
    }
  }
}

function setTheme(id) {
  state.theme = id;
  if (id) setLastLesson({ page: "kosakata.html", params: `?theme=${id}`, label: `Kosakata — ${themeLabel(id)}` });
  render();
}

contentEl.addEventListener("click", (event) => {
  const themeBtn = event.target.closest("[data-theme]");
  if (themeBtn) return setTheme(themeBtn.dataset.theme);
  const detail = event.target.closest("[data-detail]");
  if (detail) return openDetail(detail.dataset.detail);
  if (event.target.closest("[data-add-all]")) return addWords(filtered().map((v) => v.id));
  handleItemButtons(event);
});

modalBody.addEventListener("click", handleItemButtons);

function handleItemButtons(event) {
  const speakBtn = event.target.closest("[data-speak]");
  if (speakBtn) return speak(state.vocab.find((v) => v.id === speakBtn.dataset.speak).kana);
  const exampleBtn = event.target.closest("[data-speak-example]");
  if (exampleBtn) return speak(state.vocab.find((v) => v.id === exampleBtn.dataset.speakExample).example.jp);
  const addBtn = event.target.closest("[data-add]");
  if (addBtn) addWords([addBtn.dataset.add]);
}

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  render();
});
themeEl.addEventListener("change", () => setTheme(themeEl.value));
document.getElementById("vocabFilters").addEventListener("submit", (event) => event.preventDefault());

try {
  const [themes, vocab] = await Promise.all([loadThemes(), loadVocab()]);
  state.themes = themes;
  state.vocab = vocab.map((v) => ({
    ...v,
    _hay: `${v.word} ${v.kana} ${v.romaji} ${v.meaning}`.toLowerCase(),
    _romaji: normalizeRomaji(v.romaji),
  }));
  if (!themes.some((t) => t.id === state.theme)) state.theme = "";
  state.inSrs = new Set(Object.keys(getSrs()));

  themeEl.innerHTML =
    `<option value="">Semua tema</option>` +
    themes.map((t) => `<option value="${t.id}">${escapeHtml(t.label)} (${countIn(t.id)})</option>`).join("");
  searchEl.value = state.query;
  render();
} catch (error) {
  showLoadError(contentEl, error);
}
