// Efek suara kuis disintesis dengan Web Audio API (tanpa berkas audio).
import { getSettings } from "./storage.js";

let ctx = null;

function context() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Satu nada dengan envelope singkat; `slideTo` membuat frekuensi meluncur. */
function tone(audio, { freq, start = 0, duration = 0.15, type = "sine", gain = 0.18, slideTo }) {
  const t0 = audio.currentTime + start;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

const SOUNDS = {
  correct: (a) => {
    tone(a, { freq: 659.25, duration: 0.12 });
    tone(a, { freq: 987.77, start: 0.09, duration: 0.22 });
  },
  wrong: (a) => {
    tone(a, { freq: 220, slideTo: 110, duration: 0.3, type: "triangle", gain: 0.22 });
  },
  timeout: (a) => {
    tone(a, { freq: 300, duration: 0.12, type: "triangle", gain: 0.18 });
    tone(a, { freq: 180, start: 0.14, slideTo: 100, duration: 0.3, type: "triangle", gain: 0.2 });
  },
  win: (a) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone(a, { freq, start: i * 0.1, duration: i === 3 ? 0.5 : 0.18 }),
    );
  },
  done: (a) => {
    tone(a, { freq: 523.25, duration: 0.18 });
    tone(a, { freq: 392, start: 0.16, duration: 0.35 });
  },
};

/** @param {"correct"|"wrong"|"timeout"|"win"|"done"} name */
export function playSfx(name) {
  if (!getSettings().sfx) return;
  const audio = context();
  if (audio && SOUNDS[name]) SOUNDS[name](audio);
}
