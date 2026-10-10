import { test } from "node:test";
import assert from "node:assert/strict";
import { GRADE, addDays, isDue, isMastered, newCard, review, toDateStr } from "../src/lib/srs.js";
import { computeStreak, countDue, countMastered, totalReviews } from "../src/lib/stats.js";

const TODAY = "2026-03-01";

test("newCard memakai nilai awal SM-2", () => {
  assert.deepEqual(newCard(TODAY), { ease: 2.5, interval: 0, reps: 0, due: TODAY, lastReviewed: null });
});

test("Lupa: reset reps & interval, ease turun 0.2 (min 1.3), jatuh tempo hari ini", () => {
  const card = { ease: 2.5, interval: 10, reps: 4, due: TODAY, lastReviewed: null };
  const next = review(card, GRADE.FORGOT, TODAY);
  assert.equal(next.reps, 0);
  assert.equal(next.interval, 0);
  assert.ok(Math.abs(next.ease - 2.3) < 1e-9);
  assert.equal(next.due, TODAY);
  assert.equal(review({ ...card, ease: 1.4 }, GRADE.FORGOT, TODAY).ease, 1.3);
});

test("Sulit: interval minimal 1 dan x1.2, ease turun 0.15", () => {
  assert.equal(review(newCard(TODAY), GRADE.HARD, TODAY).interval, 1);
  const next = review({ ease: 2.5, interval: 10, reps: 3, due: TODAY, lastReviewed: null }, GRADE.HARD, TODAY);
  assert.equal(next.interval, 12);
  assert.ok(Math.abs(next.ease - 2.35) < 1e-9);
  assert.equal(next.due, "2026-03-13");
});

test("Bisa: interval 1, 3, lalu interval x ease", () => {
  const first = review(newCard(TODAY), GRADE.GOOD, TODAY);
  assert.equal(first.interval, 1);
  assert.equal(first.reps, 1);
  const second = review(first, GRADE.GOOD, TODAY);
  assert.equal(second.interval, 3);
  const third = review(second, GRADE.GOOD, TODAY);
  assert.equal(third.interval, Math.round(3 * 2.5));
  assert.equal(third.due, addDays(TODAY, 8));
});

test("Mudah: seperti Bisa lalu x1.3 dan ease naik 0.15", () => {
  const card = { ease: 2.5, interval: 10, reps: 3, due: TODAY, lastReviewed: null };
  const next = review(card, GRADE.EASY, TODAY);
  assert.equal(next.interval, Math.round(Math.round(10 * 2.5) * 1.3));
  assert.ok(Math.abs(next.ease - 2.65) < 1e-9);
  assert.equal(next.lastReviewed, TODAY);
});

test("review tidak mengubah kartu asal dan menolak nilai tak valid", () => {
  const card = newCard(TODAY);
  review(card, GRADE.GOOD, TODAY);
  assert.equal(card.reps, 0);
  assert.throws(() => review(card, 7, TODAY), RangeError);
});

test("tanggal lokal: addDays lintas bulan/tahun dan toDateStr", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(toDateStr(new Date(2026, 0, 5)), "2026-01-05");
});

test("isDue & isMastered (interval >= 21)", () => {
  assert.ok(isDue({ due: "2026-02-28" }, TODAY));
  assert.ok(isDue({ due: TODAY }, TODAY));
  assert.ok(!isDue({ due: "2026-03-02" }, TODAY));
  assert.ok(isMastered({ interval: 21 }));
  assert.ok(!isMastered({ interval: 20 }));
});

test("computeStreak", () => {
  const activity = { "2026-02-27": 3, "2026-02-28": 1, "2026-03-01": 2, "2026-02-20": 5, "2026-02-21": 1 };
  assert.deepEqual(computeStreak(activity, "2026-03-01"), { current: 3, best: 3 });
  // Hari ini belum belajar: streak belum putus
  assert.equal(computeStreak(activity, "2026-03-02").current, 3);
  // Lewat satu hari penuh: streak putus
  assert.equal(computeStreak(activity, "2026-03-03").current, 0);
  assert.deepEqual(computeStreak({}, TODAY), { current: 0, best: 0 });
});

test("countMastered, totalReviews, countDue", () => {
  const srs = { a: { interval: 30, due: "2026-04-01" }, b: { interval: 5, due: "2026-02-01" }, c: { interval: 0, due: TODAY } };
  assert.equal(countMastered(srs, ["a", "b", "x"]), 1);
  assert.equal(countDue(srs, TODAY), 2);
  assert.equal(totalReviews({ x: 2, y: 3 }), 5);
});
