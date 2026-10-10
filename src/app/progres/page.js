import ProgressPage from "@/features/ProgressPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Progres & Pengaturan",
  description: "Lihat statistik belajar, streak, dan riwayat kuis. Atur tema, romaji, kecepatan suara, serta ekspor atau impor data.",
  path: "progres",
});

export default function Page() {
  return <ProgressPage />;
}
