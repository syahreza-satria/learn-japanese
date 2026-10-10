import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldRemind } from "../src/lib/reminder.js";

const settings = { reminder: true, reminderTime: "19:00", dailyGoal: 10 };
const at = (h, m = 0) => new Date(2026, 2, 1, h, m);

test("pengingat: hanya setelah waktu yang dipilih", () => {
  const state = { settings, meta: {}, due: 5, done: 0 };
  assert.equal(shouldRemind({ ...state, now: at(18, 59) }), false);
  assert.equal(shouldRemind({ ...state, now: at(19, 0) }), true);
  assert.equal(shouldRemind({ ...state, now: at(21, 30) }), true);
});

test("pengingat: sekali per hari dan bisa dimatikan", () => {
  const now = at(20);
  assert.equal(shouldRemind({ settings, meta: { lastNotified: "2026-03-01" }, due: 5, done: 0, now }), false);
  assert.equal(shouldRemind({ settings, meta: { lastNotified: "2026-02-28" }, due: 5, done: 0, now }), true);
  assert.equal(shouldRemind({ settings: { ...settings, reminder: false }, meta: {}, due: 5, done: 0, now }), false);
});

test("pengingat: tidak diganggu bila target tercapai dan tak ada kartu jatuh tempo", () => {
  const now = at(20);
  assert.equal(shouldRemind({ settings, meta: {}, due: 0, done: 10, now }), false);
  assert.equal(shouldRemind({ settings, meta: {}, due: 0, done: 3, now }), true);
  assert.equal(shouldRemind({ settings, meta: {}, due: 2, done: 10, now }), true);
});
