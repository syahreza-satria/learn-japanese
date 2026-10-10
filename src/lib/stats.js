// Statistik turunan dari data storage. Murni.
import { addDays, isMastered, toDateStr } from "./srs.js";

/** Streak = jumlah hari beruntun dengan aktivitas. Hari ini boleh kosong (streak belum putus). */
export function computeStreak(activity, today = toDateStr()) {
  const active = (day) => (activity[day] ?? 0) > 0;
  let cursor = active(today) ? today : addDays(today, -1);
  let current = 0;
  while (active(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const days = Object.keys(activity).filter(active).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best };
}

export function countMastered(srs, ids) {
  return ids.filter((id) => srs[id] && isMastered(srs[id])).length;
}

export function totalReviews(activity) {
  return Object.values(activity).reduce((sum, n) => sum + n, 0);
}

export function countDue(srs, today = toDateStr()) {
  return Object.values(srs).filter((card) => card.due <= today).length;
}
