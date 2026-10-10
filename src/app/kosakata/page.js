import VocabPage from "@/features/VocabPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Kosakata N5",
  description: "Daftar kosakata JLPT N5 per tema dengan furigana, romaji, arti dalam bahasa Indonesia, contoh kalimat, dan suara.",
  path: "kosakata",
});

export default function Page() {
  return <VocabPage />;
}
