import QuizPage from "@/features/QuizPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Kuis",
  description: "Uji kemampuan Hiragana, Katakana, dan kosakata N5 dengan kuis pilihan ganda atau ketik jawaban.",
  path: "kuis",
});

export default function Page() {
  return <QuizPage />;
}
