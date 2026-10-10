// Normalisasi romaji untuk jawaban ketik. Murni dan mudah dites.

// Urutan penting: pola yang lebih panjang dulu.
const VARIANTS = [
  [/sya/g, "sha"], [/syu/g, "shu"], [/syo/g, "sho"],
  [/tya/g, "cha"], [/tyu/g, "chu"], [/tyo/g, "cho"],
  [/cya/g, "cha"], [/cyu/g, "chu"], [/cyo/g, "cho"],
  [/zya/g, "ja"], [/zyu/g, "ju"], [/zyo/g, "jo"],
  [/jya/g, "ja"], [/jyu/g, "ju"], [/jyo/g, "jo"],
  [/dya/g, "ja"], [/dyu/g, "ju"], [/dyo/g, "jo"],
  [/si/g, "shi"],
  [/ti/g, "chi"],
  [/tu/g, "tsu"],
  [/([cs])?hu/g, (m, p) => (p ? m : "fu")],
  [/zi/g, "ji"],
  [/di/g, "ji"],
  [/du/g, "zu"],
];

/** huruf kecil, buang spasi/tanda baca pemisah, samakan ejaan Kunrei/Nihon-shiki ke Hepburn. */
export function normalizeRomaji(input) {
  let s = String(input ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s'’`\-.,!?]/g, "");
  for (const [pattern, replacement] of VARIANTS) s = s.replace(pattern, replacement);
  return s;
}

/** Cocokkan jawaban pengguna dengan romaji yang benar (+ alternatif). */
export function isCorrectRomaji(answer, expected, alternatives = []) {
  const given = normalizeRomaji(answer);
  if (!given) return false;
  return [expected, ...alternatives].some((e) => normalizeRomaji(e) === given);
}
