import GrammarPage from "@/features/GrammarPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Tata bahasa N5",
  description: "Pola tata bahasa JLPT N5 dalam bahasa Indonesia, lengkap dengan contoh kalimat, suara, dan latihan isian.",
  path: "tata-bahasa",
});

export default function Page() {
  return <GrammarPage />;
}
