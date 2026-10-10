import KanaPage from "@/features/KanaPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Hiragana & Katakana",
  description: "Pelajari seluruh Hiragana dan Katakana: gojūon, dakuten, handakuten, dan yōon, lengkap dengan romaji, contoh kata, dan suara.",
  path: "kana",
});

export default function Page() {
  return <KanaPage />;
}
