// Static export untuk GitHub Pages. basePath hanya dipakai di build produksi.
const basePath = process.env.NODE_ENV === "production" ? "/learn-japanese" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
