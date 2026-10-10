// Server statis kecil untuk menguji hasil `npm run build` persis seperti di GitHub Pages:
// melayani out/ di bawah basePath /learn-japanese, URL tanpa ekstensi, dan 404.html untuk path tak dikenal.
// Pakai: node scripts/preview-server.mjs [port]
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const BASE = "/learn-japanese";
const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const candidates = [clean, `${clean}.html`, join(clean, "index.html")];
  for (const c of candidates) {
    const full = join(root, c);
    if (full.startsWith(root) && existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/" || pathname === BASE) {
    res.writeHead(302, { Location: `${BASE}/` }).end();
    return;
  }
  const inBase = pathname.startsWith(`${BASE}/`);
  const file = inBase ? resolveFile(pathname.slice(BASE.length)) : null;
  const target = file ?? join(root, "404.html");
  const status = file ? 200 : 404;
  const type = TYPES[extname(target)] ?? "application/octet-stream";
  const headers = { "Content-Type": type, "Cache-Control": "no-cache" };
  let body = readFileSync(target);
  // GitHub Pages mengompresi teks; lakukan hal yang sama agar ukuran transfer realistis.
  if (/text|json|javascript|svg|manifest/.test(type) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
    body = gzipSync(body);
    headers["Content-Encoding"] = "gzip";
  }
  res.writeHead(status, headers);
  res.end(body);
}).listen(port, () => console.log(`Manabii preview: http://localhost:${port}${BASE}/`));
