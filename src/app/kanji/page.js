import KanjiPage from "@/features/KanjiPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Kanji N5",
  description: "Pelajari ±100 kanji dasar JLPT N5 dengan animasi urutan goresan, bacaan onyomi/kunyomi, arti, dan contoh kata.",
  path: "kanji",
});

export default function Page() {
  return <KanjiPage />;
}
