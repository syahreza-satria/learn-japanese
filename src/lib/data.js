// Loader JSON materi di data/ (di-code-split per berkas). Materi hanya hidup di sana.
const loaders = {
  hiragana: () => import("../../data/hiragana.json"),
  katakana: () => import("../../data/katakana.json"),
  "vocab-n5": () => import("../../data/vocab-n5.json"),
  themes: () => import("../../data/themes.json"),
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

/** Map id -> item untuk seluruh materi (dipakai flashcard & progres). */
export async function loadItemIndex() {
  const [hira, kata, vocab] = await Promise.all([loadKana("hiragana"), loadKana("katakana"), loadVocab()]);
  return new Map([...hira, ...kata, ...vocab].map((item) => [item.id, item]));
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
export const speechText = (item) => (item.type === "vocab" ? item.kana : item.char);
