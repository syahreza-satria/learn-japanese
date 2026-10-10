// TTS bahasa Jepang: Web Speech API bila perangkat punya voice ja-JP,
// jika tidak, cadangan suara online (endpoint TTS Google Translate yang tidak resmi).
import { getSettings } from "./storage.js";
import { showToast } from "./toast.js";

const hasSynthesis = typeof window !== "undefined" && "speechSynthesis" in window;
// Penting: permintaan tidak boleh membawa header Referer (layout.js menyetel meta referrer=no-referrer);
// jika ada, endpoint ini membalas 404.
const ONLINE_TTS = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=";
const MAX_ONLINE_CHARS = 180;

let warned = false;
let audio = null;

const isJapanese = (voice) => voice.lang.replace("_", "-").toLowerCase().startsWith("ja");
const isJaJp = (voice) => voice.lang.replace("_", "-").toLowerCase() === "ja-jp";

function bestVoice() {
  if (!hasSynthesis) return null;
  const voices = speechSynthesis.getVoices().filter(isJapanese);
  return voices.find((v) => isJaJp(v) && !v.localService) || voices.find(isJaJp) || voices[0] || null;
}

/** Panggil sekali saat halaman dimuat; voice di Chrome dimuat async (`voiceschanged`). */
export function initTts() {
  if (!hasSynthesis) return;
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.("voiceschanged", () => speechSynthesis.getVoices());
}

function warnUnavailable() {
  if (warned) return;
  warned = true;
  showToast("Suara tidak dapat diputar. Periksa koneksi internet atau pasang voice Jepang di perangkat.", {
    type: "warning",
    delay: 7000,
  });
}

function stopAll() {
  if (hasSynthesis) speechSynthesis.cancel();
  if (audio) audio.pause();
}

function speakOnline(text, rate) {
  if (typeof Audio === "undefined" || text.length > MAX_ONLINE_CHARS) {
    warnUnavailable();
    return false;
  }
  stopAll();
  audio = new Audio(`${ONLINE_TTS}${encodeURIComponent(text)}`);
  audio.playbackRate = rate;
  audio.addEventListener("error", warnUnavailable, { once: true });
  audio.play().catch(warnUnavailable);
  return true;
}

export function speak(text, { rate } = {}) {
  if (!text) return false;
  const speed = rate ?? getSettings().ttsRate;
  const voice = bestVoice();
  if (!voice) return speakOnline(text, speed);

  stopAll();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.voice = voice;
  utterance.rate = speed;
  speechSynthesis.speak(utterance);
  return true;
}
