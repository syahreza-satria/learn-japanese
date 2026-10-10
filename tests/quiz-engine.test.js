import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answerLabel, buildQuiz, checkAnswer, filterPool, parseQuizParams } from "../src/lib/quiz-engine.js";

const load = (name, type, extra = {}) =>
  JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8")).map((item) => ({
    ...item,
    type,
    ...extra,
  }));
const hira = load("hiragana", "kana", { script: "hiragana" });
const vocab = load("vocab-n5", "vocab");

// RNG deterministik sederhana (mulberry32)
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("tidak ada soal ganda dalam satu sesi", () => {
  for (const seed of [1, 2, 3]) {
    const quiz = buildQuiz({ pool: hira, mode: "mc", count: 50, rng: seeded(seed) });
    assert.equal(quiz.length, 50);
    assert.equal(new Set(quiz.map((q) => q.item.id)).size, 50);
  }
});

test("jumlah soal dibatasi ukuran pool", () => {
  const pool = filterPool(hira, { row: "k" });
  assert.equal(pool.length, 5);
  assert.equal(buildQuiz({ pool, universe: hira, mode: "mc", count: 20 }).length, 5);
});

test("pilihan ganda: jawaban benar ada, pengecoh unik dan sejenis", () => {
  const quiz = buildQuiz({ pool: hira, mode: "mc", count: 50, rng: seeded(7) });
  for (const q of quiz) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4, "pilihan tidak boleh ganda");
    assert.ok(q.choices.includes(q.correct));
    assert.ok(checkAnswer(q, q.correct));
    assert.ok(!checkAnswer(q, q.choices.find((c) => c !== q.correct)));
  }
  const vocabQuiz = buildQuiz({ pool: vocab, mode: "mc", count: 50, rng: seeded(9) });
  for (const q of vocabQuiz) {
    assert.equal(new Set(q.choices).size, q.choices.length);
    assert.ok(q.choices.includes(q.item.meaning));
  }
});

test("romaji → kana tidak memakai kana berromaji ambigu (ぢ/づ)", () => {
  const quiz = buildQuiz({ pool: hira, mode: "mcr", count: 200, rng: seeded(3) });
  const ids = quiz.map((q) => q.item.id);
  assert.ok(!ids.includes("h-di") && !ids.includes("h-du"));
  assert.ok(!ids.includes("h-ji") && !ids.includes("h-zu"));
  assert.ok(quiz.every((q) => q.choices.includes(q.item.char)));
});

test("mode ketik: terima variasi romaji dan alt", () => {
  const quiz = buildQuiz({ pool: hira.filter((i) => ["h-shi", "h-wo", "h-fu"].includes(i.id)), mode: "type", count: 3 });
  const byId = Object.fromEntries(quiz.map((q) => [q.item.id, q]));
  assert.ok(checkAnswer(byId["h-shi"], " SI "));
  assert.ok(checkAnswer(byId["h-wo"], "o"));
  assert.ok(checkAnswer(byId["h-fu"], "hu"));
  assert.ok(!checkAnswer(byId["h-fu"], "fa"));
  assert.equal(answerLabel(byId["h-shi"]), "shi");
});

test("kosakata mode ketik: prompt arti, jawaban romaji", () => {
  const [q] = buildQuiz({ pool: vocab.filter((v) => v.kana === "がくせい"), universe: vocab, mode: "type", count: 1 });
  assert.equal(q.kind, "type");
  assert.ok(checkAnswer(q, "gakusei"));
  assert.ok(checkAnswer(q, "Gaku Sei"));
  assert.equal(answerLabel(q), "がくせい (gakusei)");
});

test("hasil deterministik untuk seed sama", () => {
  const a = buildQuiz({ pool: hira, mode: "mc", count: 10, rng: seeded(42) }).map((q) => q.item.id);
  const b = buildQuiz({ pool: hira, mode: "mc", count: 10, rng: seeded(42) }).map((q) => q.item.id);
  assert.deepEqual(a, b);
});

test("filterPool: baris, kelompok, dan tema", () => {
  assert.equal(filterPool(hira, { group: "dakuten" }).length, 25);
  assert.equal(filterPool(hira, { group: "yoon" }).length, 33);
  assert.ok(filterPool(vocab, { theme: "sekolah" }).every((v) => v.theme === "sekolah"));
});

test("parseQuizParams: deep link & nilai default", () => {
  assert.deepEqual(parseQuizParams("?source=hiragana&row=a&mode=mc&count=10"), {
    source: "hiragana", mode: "mc", count: 10, row: "a", group: "", theme: "", scope: "", timer: 0, autostart: true,
  });
  const fallback = parseQuizParams("?source=xx&mode=zzz&count=7");
  assert.equal(fallback.source, "hiragana");
  assert.equal(fallback.mode, "mc");
  assert.equal(fallback.count, 10);
  assert.equal(parseQuizParams("?source=kosakata&mode=type&theme=angka").source, "vocab");
  assert.equal(parseQuizParams("?source=vocab&mode=mcr").mode, "mcr");
  assert.equal(parseQuizParams("?source=kanji&mode=listen").mode, "mc");
  assert.equal(parseQuizParams("?source=vocab&scope=weak").scope, "weak");
  assert.ok(parseQuizParams("?source=vocab&scope=fav").autostart);
});

const kanji = load("kanji-n5", "kanji");

test("mode baru: arti→kata, mendengar, kanji", () => {
  for (const q of buildQuiz({ pool: vocab, mode: "mcr", count: 50, rng: seeded(11) })) {
    assert.equal(q.direction, "meaning-word");
    assert.ok(q.choices.includes(q.item.word) && new Set(q.choices).size === q.choices.length);
    assert.ok(checkAnswer(q, q.item.word));
  }
  const listen = buildQuiz({ pool: hira, mode: "listen", count: 10, rng: seeded(5) });
  assert.ok(listen.every((q) => q.direction === "listen-romaji" && q.kind === "mc" && q.choices.includes(q.item.romaji)));
  const listenVocab = buildQuiz({ pool: vocab, mode: "listen", count: 10, rng: seeded(6) });
  assert.ok(listenVocab.every((q) => q.direction === "listen-meaning" && q.choices.includes(q.item.meaning)));
  const kq = buildQuiz({ pool: kanji, mode: "mc", count: 20, rng: seeded(7) });
  assert.ok(kq.every((q) => q.choices.length === 4 && q.choices.includes(q.item.meaning)));
  const kr = buildQuiz({ pool: kanji, mode: "mcr", count: 20, rng: seeded(8) });
  assert.ok(kr.every((q) => q.choices.includes(q.item.char) && new Set(q.choices).size === 4));
});

test("filterPool: ids terbatas (favorit / item lemah)", () => {
  const ids = vocab.slice(0, 5).map((v) => v.id);
  assert.equal(filterPool(vocab, { ids }).length, 5);
  assert.equal(filterPool(vocab, { ids: [] }).length, 0);
});
