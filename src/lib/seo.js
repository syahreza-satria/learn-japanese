import { SITE } from "./config.js";

/** Metadata Next.js per halaman: title/description unik + Open Graph + canonical. */
export function pageMeta({ title, description, path = "" }) {
  const url = SITE.baseUrl + path;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "id_ID",
      title,
      description,
      url,
      images: [{ url: `${SITE.baseUrl}og-image.svg`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}
