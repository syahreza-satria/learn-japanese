import Link from "next/link";
import Hanko from "@/components/Hanko";

export const metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="text-center py-5">
      <div className="mb-3">
        <Hanko char="無" round />
      </div>
      <h1 className="h3">Halaman tidak ditemukan</h1>
      <p className="text-secondary">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Link prefetch={false} className="btn btn-primary" href="/">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
