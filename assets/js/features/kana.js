// Halaman Kana: grid Hiragana/Katakana dengan kartu detail dan TTS.
import { groupRows, loadKana } from "../core/data.js";
import { getSettings, setLastLesson, updateSettings } from "../core/storage.js";
import { speak } from "../core/tts.js";
import { escapeHtml, showLoadError } from "../core/ui.js";

const SCRIPTS = { hiragana: "Hiragana", katakana: "Katakana" };
const TABS = {
  gojuon: { label: "Gojūon", groups: ["gojuon"], cols: ["a", "i", "u", "e", "o"] },
  dakuten: { label: "Dakuten", groups: ["dakuten", "handakuten"], cols: ["a", "i", "u", "e", "o"] },
  yoon: { label: "Yōon", groups: ["yoon"], cols: ["a", "u", "o"] },
};

const gridEl = document.getElementById("kanaGrid");
const previewEl = document.getElementById("kanaPreview");
const romajiToggle = document.getElementById("romajiToggle");

const params = new URLSearchParams(location.search);
const state = {
  script: params.get("script") in SCRIPTS ? params.get("script") : "hiragana",
  tab: params.get("tab") in TABS ? params.get("tab") : "gojuon",
  selectedKey: null, // id tanpa prefix aksara, mis. "ka"
  data: {},
};

const keyOf = (item) => item.id.slice(2);
const rowLabel = (row) => (row === "nn" ? "n" : row);

function visibleItems() {
  const { groups } = TABS[state.tab];
  return state.data[state.script].filter((item) => groups.includes(item.group));
}

function selectedItem() {
  const items = visibleItems();
  return items.find((item) => keyOf(item) === state.selectedKey) ?? items[0];
}

function renderGrid() {
  const { cols } = TABS[state.tab];
  const items = visibleItems();
  gridEl.className = `mb-kana-grid${state.tab === "yoon" ? " is-yoon" : ""}`;
  gridEl.classList.toggle("mb-hide-romaji", !getSettings().showRomaji);

  const selected = selectedItem();
  const html = groupRows(items)
    .map(({ row, items: rowItems }) => {
      const label = rowLabel(row);
      const quizUrl = `kuis.html?source=${state.script}&row=${row}&mode=mc&count=10`;
      const cells = cols.map((col, index) => {
        const item = rowItems.find((i) => i.col === col) ?? (row === "nn" && index === 0 ? rowItems[0] : null);
        if (!item) return `<div class="mb-kana-cell is-empty" aria-hidden="true"></div>`;
        return `<button type="button" class="mb-kana-cell${item === selected ? " is-selected" : ""}" data-key="${keyOf(item)}"
          aria-label="${escapeHtml(item.char)}, ${escapeHtml(item.romaji)}" aria-pressed="${item === selected}">
          <span class="mb-kana-char" lang="ja">${escapeHtml(item.char)}</span>
          <span class="mb-kana-romaji">${escapeHtml(item.romaji)}</span></button>`;
      });
      return `<div class="mb-kana-rowlabel">
          <span>${escapeHtml(label)}</span>
          <a href="${quizUrl}" aria-label="Kuis baris ${escapeHtml(label)}" title="Kuis baris ini"><i class="bi bi-patch-question" aria-hidden="true"></i></a>
        </div>${cells.join("")}`;
    })
    .join("");
  gridEl.innerHTML = html;
}

function renderPreview() {
  const item = selectedItem();
  const { example } = item;
  previewEl.innerHTML = `
    <div class="mb-kana-big" lang="ja">${escapeHtml(item.char)}</div>
    <div>
      <div class="h3 mb-1">${escapeHtml(item.romaji)}</div>
      <div class="small text-secondary">Contoh kata</div>
      <div><span lang="ja" class="fs-5">${escapeHtml(example.word)}</span>
        <span class="text-secondary">${escapeHtml(example.romaji)}</span> — ${escapeHtml(example.meaning)}</div>
      <div class="mt-2 d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" data-speak="char"><i class="bi bi-volume-up" aria-hidden="true"></i> Bunyi</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-speak="word"><i class="bi bi-volume-up" aria-hidden="true"></i> Contoh</button>
      </div>
    </div>`;
}

function renderControls() {
  for (const btn of document.querySelectorAll("#scriptButtons [data-script]")) {
    const active = btn.dataset.script === state.script;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active);
  }
  for (const btn of document.querySelectorAll("#groupButtons [data-group]")) {
    const active = btn.dataset.group === state.tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active);
  }
}

function render() {
  renderControls();
  renderGrid();
  renderPreview();

  const url = new URL(location.href);
  url.search = `?script=${state.script}&tab=${state.tab}`;
  history.replaceState(null, "", url);
  setLastLesson({
    page: "kana.html",
    params: url.search,
    label: `${SCRIPTS[state.script]} — ${TABS[state.tab].label}`,
  });
}

function select(key, { sound = true } = {}) {
  state.selectedKey = key;
  render();
  if (sound) speak(selectedItem().char);
}

gridEl.addEventListener("click", (event) => {
  const cell = event.target.closest(".mb-kana-cell[data-key]");
  if (cell) {
    select(cell.dataset.key);
    gridEl.querySelector(`[data-key="${cell.dataset.key}"]`)?.focus({ preventScroll: true });
  }
});

previewEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-speak]");
  if (!btn) return;
  const item = selectedItem();
  speak(btn.dataset.speak === "word" ? item.example.word : item.char);
});

document.getElementById("scriptButtons").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-script]");
  if (!btn || btn.dataset.script === state.script) return;
  state.script = btn.dataset.script;
  render();
});

document.getElementById("groupButtons").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-group]");
  if (!btn || btn.dataset.group === state.tab) return;
  state.tab = btn.dataset.group;
  state.selectedKey = null;
  render();
});

romajiToggle.addEventListener("change", () => {
  updateSettings({ showRomaji: romajiToggle.checked });
  gridEl.classList.toggle("mb-hide-romaji", !romajiToggle.checked);
});

romajiToggle.checked = getSettings().showRomaji;

try {
  const [hiragana, katakana] = await Promise.all([loadKana("hiragana"), loadKana("katakana")]);
  state.data = { hiragana, katakana };
  render();
} catch (error) {
  showLoadError(gridEl, error);
}
