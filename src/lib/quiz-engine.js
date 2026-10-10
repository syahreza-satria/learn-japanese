// Pembuatan soal kuis & pemeriksaan jawaban. Murni (tanpa DOM/storage) agar mudah dites.
import { isCorrectRomaji } from "./romaji.js";
import { shuffle } from "./random.js";

export const SOURCES = ["hiragana", "katakana", "vocab", "kanji"];
export const COUNTS = [10, 20, 50];
const DISTRACTORS = 3;

export const MODES = {
  kana: [
    { id: "mc", label: "Pilihan ganda: kana → romaji" },
    { id: "mcr", label: "Pilihan ganda: romaji → kana" },
    { id: "listen", label: "Mendengar: dengar → pilih romaji" },
    { id: "type", label: "Ketik romaji" },
  ],
  vocab: [
    { id: "mc", label: "Pilihan ganda: kata → arti" },
    { id: "mcr", label: "Pilihan ganda: arti → kata" },
    { id: "listen", label: "Mendengar: dengar → pilih arti" },
    { id: "type", label: "Ketik romaji (dari arti)" },
  ],
  kanji: [
    { id: "mc", label: "Pilihan ganda: kanji → arti" },
    { id: "mcr", label: "Pilihan ganda: arti → kanji" },
  ],
};

export const modesFor = (source) => (source === "kanji" ? MODES.kanji : source === "vocab" ? MODES.vocab : MODES.kana);

/** Baca parameter URL untuk deep link, contoh: ?source=hiragana&row=a&mode=mc&count=10 */
export function parseQuizParams(search) {
  const params = new URLSearchParams(search);
  let source = params.get("source");
  if (source === "kosakata") source = "vocab";
  if (!SOURCES.includes(source)) source = "hiragana";
  const modes = modesFor(source).map((m) => m.id);
  const mode = modes.includes(params.get("mode")) ? params.get("mode") : "mc";
  const count = Number(params.get("count"));
  return {
    source,
    mode,
    count: COUNTS.includes(count) ? count : 10,
    row: params.get("row") || "",
    group: params.get("group") || "",
    theme: params.get("theme") || "",
    scope: ["fav", "weak"].includes(params.get("scope")) ? params.get("scope") : "",
    timer: params.get("timer") === "10" ? 10 : 0,
    autostart: ["row", "group", "theme", "scope"].some((k) => params.has(k)),
  };
}

/** Saring item sumber berdasarkan baris/kelompok (kana) atau tema (kosakata). */
export function filterPool(items, { row = "", group = "", theme = "", ids = null } = {}) {
  const allowed = ids ? new Set(ids) : null;
  return items.filter((item) => {
    if (allowed && !allowed.has(item.id)) return false;
    if (row && item.row !== row) return false;
    if (group) {
      const groups = group === "dakuten" ? ["dakuten", "handakuten"] : [group];
      if (!groups.includes(item.group)) return false;
    }
    if (theme && item.theme !== theme) return false;
    return true;
  });
}

const DIRECTION = {
  "kana:mc": "kana-romaji",
  "kana:mcr": "romaji-kana",
  "kana:listen": "listen-romaji",
  "kana:type": "kana-type",
  "vocab:mc": "word-meaning",
  "vocab:mcr": "meaning-word",
  "vocab:listen": "listen-meaning",
  "vocab:type": "meaning-type",
  "kanji:mc": "kanji-meaning",
  "kanji:mcr": "meaning-kanji",
};

const CHOICE_DIRECTIONS = [
  "kana-romaji", "romaji-kana", "listen-romaji", "word-meaning", "meaning-word", "listen-meaning", "kanji-meaning", "meaning-kanji",
];

const correctLabel = (item, direction) => {
  switch (direction) {
    case "kana-romaji":
    case "listen-romaji":
      return item.romaji;
    case "romaji-kana":
    case "meaning-kanji":
      return item.char;
    case "word-meaning":
    case "listen-meaning":
    case "kanji-meaning":
      return item.meaning;
    case "meaning-word":
      return item.word;
    default:
      return null;
  }
};

const romajiAnswers = (item) => [item.romaji, ...(item.alt ?? [])];

function buildChoices(item, direction, universe, rng) {
  const correct = correctLabel(item, direction);
  const sameKind = (other) =>
    item.type === "vocab" ? other.theme === item.theme : item.type === "kanji" ? true : other.group === item.group;
  const others = universe.filter((o) => o.id !== item.id);
  // Pengecoh sejenis (grup/tema sama) diutamakan, lalu sisanya.
  const ordered = [...shuffle(others.filter(sameKind), rng), ...shuffle(others.filter((o) => !sameKind(o)), rng)];

  const labels = new Set([correct]);
  const distractors = [];
  for (const other of ordered) {
    const label = correctLabel(other, direction);
    if (labels.has(label)) continue;
    labels.add(label);
    distractors.push(label);
    if (distractors.length === DISTRACTORS) break;
  }
  return shuffle([correct, ...distractors], rng);
}

/**
 * Buat daftar soal tanpa duplikat.
 * @param {object[]} pool item yang diujikan
 * @param {object[]} universe seluruh item sejenis (sumber pengecoh)
 */
export function buildQuiz({ pool, universe = pool, mode, count, rng = Math.random }) {
  if (!pool.length) return [];
  const type = pool[0].type;
  const direction = DIRECTION[`${type}:${mode}`] ?? DIRECTION[`${type}:mc`];

  // Soal yang jawabannya ambigu tidak dibuat: romaji sama (じ/ぢ, ず/づ) pada romaji→kana,
  // dan arti sama pada arti→kata / arti→kanji.
  const ambiguousBy = { "romaji-kana": "romaji", "meaning-word": "meaning", "meaning-kanji": "meaning" }[direction];
  const candidates = ambiguousBy
    ? pool.filter((item) => !universe.some((o) => o.id !== item.id && o[ambiguousBy] === item[ambiguousBy]))
    : pool;

  return shuffle(candidates, rng)
    .slice(0, Math.min(count, candidates.length))
    .map((item) => {
      const isChoice = CHOICE_DIRECTIONS.includes(direction);
      return {
        item,
        direction,
        kind: isChoice ? "mc" : "type",
        correct: isChoice ? correctLabel(item, direction) : null,
        choices: isChoice ? buildChoices(item, direction, universe, rng) : [],
        accept: isChoice ? [] : romajiAnswers(item),
      };
    });
}

/** Label jawaban benar yang ditampilkan ke pengguna setelah menjawab. */
export function answerLabel(question) {
  if (question.kind === "mc") return question.correct;
  const { item } = question;
  return item.type === "vocab" ? `${item.kana} (${item.romaji})` : item.romaji;
}

export function checkAnswer(question, given) {
  if (question.kind === "mc") return given === question.correct;
  return isCorrectRomaji(given, question.accept[0], question.accept.slice(1));
}
