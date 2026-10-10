// Loader + cache untuk file JSON di data/. Materi hanya hidup di sana.
const cache = new Map();

export function loadJson(name) {
  if (!cache.has(name)) {
    const url = new URL(`../../../data/${name}.json`, import.meta.url);
    const promise = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`Gagal memuat ${name}.json (${res.status})`);
      return res.json();
    });
    promise.catch(() => cache.delete(name));
    cache.set(name, promise);
  }
  return cache.get(name);
}

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

/** Jawaban romaji yang diterima untuk sebuah item. */
export const romajiAnswers = (item) => [item.romaji, ...(item.alt ?? [])];
