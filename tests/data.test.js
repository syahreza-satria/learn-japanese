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

test("kosakata: ±300 kata, 10 tema, tiap tema terisi", () => {
  const vocab = read("vocab-n5");
  const themes = read("themes");
  assert.equal(themes.length, 10);
  assert.ok(vocab.length >= 290 && vocab.length <= 330, `jumlah kata ${vocab.length}`);
  for (const theme of themes) assert.ok(vocab.filter((v) => v.theme === theme.id).length >= 25, theme.id);
});
