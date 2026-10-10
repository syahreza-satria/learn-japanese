import HomePage from "@/features/HomePage";
import { pageMeta } from "@/lib/seo";

const TITLE = "Manabii (まなび) — Belajar Bahasa Jepang N5 Gratis";

export const metadata = {
  ...pageMeta({
    title: TITLE,
    description:
      "Belajar bahasa Jepang dari nol sampai JLPT N5 secara gratis: Hiragana, Katakana, kosakata, flashcard SRS, dan kuis. Tanpa akun.",
  }),
  title: { absolute: TITLE },
};

export default function Page() {
  return <HomePage />;
}
