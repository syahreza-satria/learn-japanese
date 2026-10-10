// Static export. basePath menyesuaikan tempat hosting:
//  - GitHub Pages (project site): /learn-japanese  (bawaan untuk build produksi)
//  - Vercel / hosting di akar domain: kosong (terdeteksi otomatis lewat env VERCEL)
//  - Paksa nilai lain lewat env BASE_PATH (gunakan "" untuk akar domain)
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.BASE_PATH ?? (process.env.VERCEL ? "" : isProd ? "/learn-japanese" : "");

// URL publik situs untuk canonical/Open Graph/sitemap.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/` : undefined);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath, ...(siteUrl ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {}) },
};

export default nextConfig;
