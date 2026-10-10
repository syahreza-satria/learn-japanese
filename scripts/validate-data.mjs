// Validasi file di data/ terhadap JSON Schema (subset) + aturan tambahan. Tanpa dependensi.
// Pakai: node scripts/validate-data.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../data/", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

/** Validator untuk subset JSON Schema yang dipakai di data/schema/. Mengembalikan daftar error. */
export function validate(schema, value, path = "$") {
  const errors = [];
  const fail = (message) => errors.push(`${path}: ${message}`);
  const typeOf = (v) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

  if (schema.type) {
    const actual = typeOf(value);
    const ok = schema.type === "integer" ? Number.isInteger(value) : actual === schema.type;
    if (!ok) {
      fail(`harus bertipe ${schema.type}, ditemukan ${actual}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) fail(`harus salah satu dari ${schema.enum.join(", ")}`);
  if (typeof value === "string") {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) fail("terlalu pendek");
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) fail("terlalu panjang");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(`tidak cocok dengan pola ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) fail("terlalu sedikit item");
    if (schema.items) value.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required ?? []) if (!(key in value)) fail(`properti "${key}" wajib ada`);
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in value) errors.push(...validate(sub, value[key], `${path}.${key}`));
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (schema.properties ?? {}))) fail(`properti "${key}" tidak dikenal`);
    }
  }
  return errors;
}

const duplicates = (list) => list.filter((v, i) => list.indexOf(v) !== i);

/** Jalankan semua pemeriksaan; mengembalikan daftar pesan error. */
export function validateAll() {
  const errors = [];
  const check = (file, schemaFile) => {
    const data = read(file);
    errors.push(...validate(read(`schema/${schemaFile}`), data).map((e) => `${file} ${e}`));
    const dupes = duplicates(data.map((d) => d.id));
    if (dupes.length) errors.push(`${file}: id ganda: ${[...new Set(dupes)].join(", ")}`);
    return data;
  };

  for (const file of ["hiragana.json", "katakana.json"]) check(file, "kana.schema.json");
  const themes = check("themes.json", "themes.schema.json");
  const vocab = check("vocab-n5.json", "vocab.schema.json");

  const themeIds = new Set(themes.map((t) => t.id));
  for (const word of vocab) {
    if (!themeIds.has(word.theme)) errors.push(`vocab-n5.json ${word.id}: tema "${word.theme}" tidak ada di themes.json`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateAll();
  if (errors.length) {
    console.error(errors.join("\n"));
    console.error(`\n${errors.length} error ditemukan.`);
    process.exit(1);
  }
  console.log("Semua data valid.");
}
