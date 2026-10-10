import { test } from "node:test";
import assert from "node:assert/strict";
import { isCorrectRomaji, normalizeRomaji } from "../assets/js/core/romaji.js";

test("case-insensitive dan trim spasi", () => {
  assert.equal(normalizeRomaji("  KA  "), "ka");
  assert.ok(isCorrectRomaji(" Ka ", "ka"));
});

test("variasi umum: shi/si, chi/ti, tsu/tu, fu/hu, ji/zi", () => {
  assert.ok(isCorrectRomaji("si", "shi"));
  assert.ok(isCorrectRomaji("ti", "chi"));
  assert.ok(isCorrectRomaji("tu", "tsu"));
  assert.ok(isCorrectRomaji("hu", "fu"));
  assert.ok(isCorrectRomaji("zi", "ji"));
  assert.ok(isCorrectRomaji("shi", "si"));
});

test("variasi yoon dan ぢ/づ", () => {
  assert.ok(isCorrectRomaji("sya", "sha"));
  assert.ok(isCorrectRomaji("tyo", "cho"));
  assert.ok(isCorrectRomaji("zyu", "ju"));
  assert.ok(isCorrectRomaji("jya", "ja"));
  assert.ok(isCorrectRomaji("di", "ji"));
  assert.ok(isCorrectRomaji("du", "zu"));
});

test("hu tidak merusak chu/shu", () => {
  assert.equal(normalizeRomaji("chu"), "chu");
  assert.equal(normalizeRomaji("shu"), "shu");
  assert.ok(isCorrectRomaji("shuu", "shuu"));
  assert.ok(!isCorrectRomaji("sfu", "shu"));
});

test("kata multi-suku: spasi dan apostrof diabaikan", () => {
  assert.ok(isCorrectRomaji("gakusei", "gakusei"));
  assert.ok(isCorrectRomaji("hon'ya", "honya"));
  assert.ok(isCorrectRomaji("o hayou", "ohayou"));
  assert.ok(isCorrectRomaji("gakusei", "gakusei"));
  assert.ok(isCorrectRomaji("tomodati", "tomodachi"));
});

test("alternatif eksplisit (を = wo / o)", () => {
  assert.ok(isCorrectRomaji("o", "wo", ["o"]));
  assert.ok(isCorrectRomaji("wo", "wo", ["o"]));
  assert.ok(!isCorrectRomaji("o", "wo"));
});

test("jawaban salah atau kosong ditolak", () => {
  assert.ok(!isCorrectRomaji("", "ka"));
  assert.ok(!isCorrectRomaji("   ", "ka"));
  assert.ok(!isCorrectRomaji("ki", "ka"));
  assert.ok(!isCorrectRomaji(undefined, "ka"));
});
