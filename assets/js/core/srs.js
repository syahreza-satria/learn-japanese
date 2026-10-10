// SM-2 sederhana. Semua fungsi murni (tanpa akses DOM/storage) agar mudah dites.

export const GRADE = Object.freeze({ FORGOT: 0, HARD: 1, GOOD: 2, EASY: 3 });
export const MASTERED_INTERVAL = 21;
const MIN_EASE = 1.3;

const pad = (n) => String(n).padStart(2, "0");

/** Format tanggal lokal `YYYY-MM-DD`. */
export function toDateStr(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateStr(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, days) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function newCard(today = toDateStr()) {
  return { ease: 2.5, interval: 0, reps: 0, due: today, lastReviewed: null };
}

/** Hitung state kartu setelah dinilai (0 Lupa, 1 Sulit, 2 Bisa, 3 Mudah). */
export function review(card, grade, today = toDateStr()) {
  let { ease, interval, reps } = card;

  if (grade === GRADE.FORGOT) {
    reps = 0;
    interval = 0;
    ease = Math.max(MIN_EASE, ease - 0.2);
  } else if (grade === GRADE.HARD) {
    interval = Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(MIN_EASE, ease - 0.15);
  } else if (grade === GRADE.GOOD || grade === GRADE.EASY) {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === GRADE.EASY) {
      interval = Math.round(interval * 1.3);
      ease += 0.15;
    }
  } else {
    throw new RangeError(`Nilai tidak valid: ${grade}`);
  }

  return { ease, interval, reps, due: addDays(today, interval), lastReviewed: today };
}

export function isDue(card, today = toDateStr()) {
  return card.due <= today;
}

export function isMastered(card) {
  return card.interval >= MASTERED_INTERVAL;
}
