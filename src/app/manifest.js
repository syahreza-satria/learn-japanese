export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function manifest() {
  return {
    name: "Manabii — Belajar Bahasa Jepang N5",
    short_name: "Manabii",
    description: "Belajar bahasa Jepang dari nol sampai JLPT N5, gratis dan tanpa akun.",
    lang: "id",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#f7f3ea",
    theme_color: "#c8402f",
    icons: [
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
