// Pengingat belajar harian. Web tanpa server push tidak bisa menjadwalkan notifikasi saat aplikasi tertutup,
// jadi pengingat bekerja sebagai banner dalam aplikasi + notifikasi bila Manabii sedang terbuka di waktunya.
import { toDateStr } from "./srs.js";
import { countDue } from "./stats.js";
import { getActivity, getMeta, getSettings, getSrs, updateMeta } from "./storage.js";

/** Murni: apakah notifikasi harus ditampilkan sekarang? */
export function shouldRemind({ settings, meta, due, done, now }) {
  if (!settings.reminder) return false;
  const today = toDateStr(now);
  if (meta.lastNotified === today) return false;
  const [hour, minute] = String(settings.reminderTime).split(":").map(Number);
  if (now.getHours() * 60 + now.getMinutes() < hour * 60 + minute) return false;
  return due > 0 || done < settings.dailyGoal;
}

export async function requestReminderPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function reminderState(now = new Date()) {
  const today = toDateStr(now);
  const settings = getSettings();
  const due = countDue(getSrs(), today);
  const done = getActivity()[today] ?? 0;
  return { settings, meta: getMeta(), due, done, now, today };
}

/** Tampilkan notifikasi browser bila sudah waktunya. Mengembalikan true bila ditampilkan. */
export async function maybeNotify(now = new Date()) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const state = reminderState(now);
  if (!shouldRemind(state)) return false;

  const body = state.due
    ? `Ada ${state.due} kartu menunggu review. Yuk belajar 5 menit!`
    : `Target hari ini ${state.done}/${state.settings.dailyGoal}. Yuk lanjut belajar!`;
  const options = { body, icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/icon-192.png`, tag: "manabii-reminder" };
  const registration = await navigator.serviceWorker?.getRegistration?.();
  if (registration?.showNotification) await registration.showNotification("Manabii まなび", options);
  else new Notification("Manabii まなび", options);
  updateMeta({ lastNotified: state.today });
  return true;
}
