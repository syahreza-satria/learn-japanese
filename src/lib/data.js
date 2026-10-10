// Loader JSON materi di data/ (di-code-split per berkas). Materi hanya hidup di sana.
const loaders = {
  hiragana: () => import("../../data/hiragana.json"),
  katakana: () => import("../../data/katakana.json"),
  "vocab-n5": () => import("../../data/vocab-n5.json"),
  themes: () => import("../../data/themes.json"),
  "kanji-n5": () => import("../../data/kanji-n5.json"),
  "grammar-n5": () => import("../../data/grammar-n5.json"),
  strokes: () => import("../../data/strokes.json"),
};

export const loadJson = async (name) => (await loaders[name]()).default;

/** @param {"hiragana"|"katakana"} script */
export async function loadKana(script) {
  const items = await loadJson(script);
  return items.map((item) => ({ ...item, type: "kana", script }));
}

export async function loadVocab() {
  const items = await loadJson("vocab-n5");
  return items.map((item) => ({ ...item, type: "vocab" }));
}

export const loadThemes = () => loadJson("themes");

export async function loadKanji() {
  const items = await loadJson("kanji-n5");
  return items.map((item) => ({ ...item, type: "kanji" }));
}

export const loadGrammar = () => loadJson("grammar-n5");

/** Peta karakter -> daftar path SVG goresan (KanjiVG, viewBox 0 0 109 109). */
export async function loadStrokes() {
  return (await loadJson("strokes")).strokes;
}

/** Map id -> item untuk seluruh materi (dipakai flashcard & progres). */
export async function loadItemIndex() {
  const [hira, kata, vocab, kanji] = await Promise.all([
    loadKana("hiragana"),
    loadKana("katakana"),
    loadVocab(),
    loadKanji(),
  ]);
  return new Map([...hira, ...kata, ...vocab, ...kanji].map((item) => [item.id, item]));
}

/** Kelompokkan item kana per baris (urutan sesuai file). */
export function groupRows(items) {
  const rows = new Map();
  for (const item of items) {
    if (!rows.has(item.row)) rows.set(item.row, []);
    rows.get(item.row).push(item);
  }
  return [...rows].map(([row, rowItems]) => ({ row, group: rowItems[0].group, items: rowItems }));
}

/** Teks yang dibacakan TTS: kana untuk kosakata (bukan kanji), karakter untuk kana. */
export function speechText(item) {
  if (item.type === "vocab") return item.kana;
  if (item.type === "kanji") return item.examples[0].kana;
  return item.char;
}
