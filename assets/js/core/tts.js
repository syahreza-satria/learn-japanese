// Wrapper Web Speech API (speechSynthesis) untuk bahasa Jepang.
import { getSettings } from "./storage.js";
import { showToast } from "./ui.js";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;
let warned = false;

const isJapanese = (voice) => voice.lang.replace("_", "-").toLowerCase().startsWith("ja");
const isJaJp = (voice) => voice.lang.replace("_", "-").toLowerCase() === "ja-jp";

function bestVoice() {
  const voices = speechSynthesis.getVoices().filter(isJapanese);
  return voices.find((v) => isJaJp(v) && !v.localService) || voices.find(isJaJp) || voices[0] || null;
}

/** Panggil sekali saat halaman dimuat; voice di Chrome dimuat async (`voiceschanged`). */
export function initTts() {
  if (!supported) return;
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
}

function warnUnavailable() {
  if (warned) return;
  warned = true;
  showToast("Suara bahasa Jepang tidak tersedia di perangkat ini.", { type: "warning" });
}

export function speak(text, { rate } = {}) {
  if (!text) return false;
  if (!supported) {
    warnUnavailable();
    return false;
  }
  const voice = bestVoice();
  // Bila daftar voice sudah termuat tetapi tidak ada voice Jepang, beri tahu pengguna.
  if (!voice && speechSynthesis.getVoices().length > 0) {
    warnUnavailable();
    return false;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  if (voice) utterance.voice = voice;
  utterance.rate = rate ?? getSettings().ttsRate;
  speechSynthesis.speak(utterance);
  return true;
}
