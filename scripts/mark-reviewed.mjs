// Tandai entri sebagai sudah ditinjau ("reviewed": true) setelah diperiksa penutur asli/guru.
// Pakai: node scripts/mark-reviewed.mjs <vocab|kanji|grammar> <id> [id...]   atau   ... --all
import { readFileSync, writeFileSync } from "node:fs";

const FILES = { vocab: "vocab-n5.json", kanji: "kanji-n5.json", grammar: "grammar-n5.json" };
const [kind, ...rest] = process.argv.slice(2);
if (!FILES[kind] || !rest.length) {
  console.error("Pemakaian: node scripts/mark-reviewed.mjs <vocab|kanji|grammar> <id...|--all>");
  process.exit(1);
}

const path = new URL(`../data/${FILES[kind]}`, import.meta.url);
const items = JSON.parse(readFileSync(path, "utf8"));
const ids = new Set(rest);
let changed = 0;
for (const item of items) {
  if ((ids.has("--all") || ids.has(item.id)) && item.reviewed !== true) {
    item.reviewed = true;
    changed += 1;
  }
}
const unknown = rest.filter((id) => id !== "--all" && !items.some((i) => i.id === id));
if (unknown.length) console.warn(`ID tidak ditemukan: ${unknown.join(", ")}`);
writeFileSync(path, JSON.stringify(items, null, 2) + "\n");
console.log(`${changed} entri ditandai sudah ditinjau di ${FILES[kind]}.`);
