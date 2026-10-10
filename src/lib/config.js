// Satu tempat untuk URL situs. Ganti di sini (dan basePath di next.config.mjs) saat domain final ditentukan.
export const SITE = {
  name: "Manabii",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://syahreza-satria.github.io/learn-japanese/",
  githubUrl: "https://github.com/syahreza-satria/learn-japanese",
};

// TTS online cadangan. Template URL dengan {text}; ganti lewat NEXT_PUBLIC_TTS_URL saat build
// (mis. proxy milik sendiri atau layanan resmi). Bawaan: endpoint tidak resmi Google Translate.
export const TTS_ONLINE_URL =
  process.env.NEXT_PUBLIC_TTS_URL || "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q={text}";

export const STORAGE_PREFIX = "manabii:v1:";
export const DATA_VERSION = 1;
