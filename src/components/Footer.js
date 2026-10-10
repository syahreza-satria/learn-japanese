import { SITE } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="mb-footer">
      <div className="container py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
        <div>
          <span className="mb-serif">
            Manabii <span lang="ja">まなび</span>
          </span>{" "}
          — belajar bahasa Jepang N5, gratis &amp; open source (MIT).
        </div>
        <div className="d-flex flex-wrap gap-3">
          <a href={SITE.githubUrl} rel="noopener">
            <i className="bi bi-github" aria-hidden="true" /> GitHub
          </a>
          <a href={`${SITE.githubUrl}/blob/main/ATTRIBUTION.md`} rel="noopener">
            Atribusi materi
          </a>
          <span>Progres tersimpan di browser Anda.</span>
        </div>
      </div>
    </footer>
  );
}
