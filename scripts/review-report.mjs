// Laporan materi yang belum ditinjau penutur asli ("reviewed": false) untuk peninjau.
// Pakai: node scripts/review-report.mjs [vocab|kanji|grammar] [--csv]
import { readFileSync } from "node:fs";

const FILES = {
  vocab: ["vocab-n5.json", (i) => [i.id, i.theme, i.word, i.kana, i.meaning, i.example.jp, i.example.id]],
  kanji: [
    "kanji-n5.json",
    (i) => [i.id, "-", i.char, [...i.onyomi, ...i.kunyomi].join(" "), i.meaning, i.examples.map((e) => `${e.word}(${e.kana})=${e.meaning}`).join("; "), ""],
  ],
  grammar: ["grammar-n5.json", (i) => [i.id, i.category, i.pattern, i.title, i.explanation, i.examples.map((e) => e.jp).join(" / "), i.exercise.prompt + " → " + i.exercise.answer]],
};

const args = process.argv.slice(2);
const csv = args.includes("--csv");
const which = args.find((a) => FILES[a]);
const header = ["id", "kelompok", "item", "bacaan/judul", "arti/penjelasan", "contoh", "contoh (terjemahan)/soal"];
const cell = (v) => (csv ? `"${String(v).replaceAll('"', '""')}"` : String(v).replaceAll("|", "\\|"));

for (const [name, [file, row]] of Object.entries(FILES)) {
  if (which && which !== name) continue;
  const items = JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"));
  const pending = items.filter((i) => i.reviewed === false);
  if (csv) {
    console.log(header.join(","));
    for (const i of pending) console.log(row(i).map(cell).join(","));
  } else {
    console.log(`\n## ${file}: ${pending.length} dari ${items.length} belum ditinjau\n`);
    console.log(`| ${header.join(" | ")} |\n|${header.map(() => "---").join("|")}|`);
    for (const i of pending) console.log(`| ${row(i).map(cell).join(" | ")} |`);
  }
}
