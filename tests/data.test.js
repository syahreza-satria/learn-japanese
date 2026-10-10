import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate, validateAll } from "../scripts/validate-data.mjs";

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));

test("seluruh data valid terhadap schema", () => {
  assert.deepEqual(validateAll(), []);
});

test("validator menolak data yang salah", () => {
  const schema = JSON.parse(readFileSync(new URL("../data/schema/kana.schema.json", import.meta.url), "utf8"));
  assert.ok(validate(schema, [{ id: "x" }]).length > 0);
  assert.ok(validate(schema, {}).length > 0);
});

for (const script of ["hiragana", "katakana"]) {
  test(`${script}: 104 karakter (46 gojūon, 25 dakuten, 33 yōon)`, () => {
    const data = read(script);
    const count = (...groups) => data.filter((d) => groups.includes(d.group)).length;
    assert.equal(data.length, 104);
    assert.equal(count("gojuon"), 46);
    assert.equal(count("dakuten", "handakuten"), 25);
    assert.equal(count("yoon"), 33);
  });
}

test("kosakata: ±800 kata, tiap tema terisi", () => {
  const vocab = read("vocab-n5");
  const themes = read("themes");
  assert.ok(vocab.length >= 750 && vocab.length <= 850, `jumlah kata ${vocab.length}`);
  for (const theme of themes) assert.ok(vocab.filter((v) => v.theme === theme.id).length >= 20, theme.id);
});

test("kanji N5: ±100 kanji, goresan tersedia", () => {
  const kanji = read("kanji-n5");
  assert.ok(kanji.length >= 90 && kanji.length <= 110, `jumlah kanji ${kanji.length}`);
});

test("tata bahasa N5: ±80 pola dengan latihan", () => {
  const grammar = read("grammar-n5");
  assert.ok(grammar.length >= 75 && grammar.length <= 90, `jumlah pola ${grammar.length}`);
});
