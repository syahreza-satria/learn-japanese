import FlashcardPage from "@/features/FlashcardPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Flashcard SRS",
  description: "Ulangi kana dan kosakata dengan flashcard dan penjadwalan spaced repetition (SRS) agar cepat hafal.",
  path: "flashcard",
});

export default function Page() {
  return <FlashcardPage />;
}
