// Pemicu toast tanpa ketergantungan pada React; ditampilkan oleh <ToastHost />.
export const TOAST_EVENT = "mb:toast";

export function showToast(message, { type = "info", delay = 4500 } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, type, delay } }));
}
