// Menyusun daftar precache untuk service worker setelah `next build` (hasil di out/).
// Pakai: node scripts/postbuild-sw.mjs
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out/", import.meta.url));
const SKIP = new Set(["sw.js", "sw-manifest.json"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(out)
  .map((f) => relative(out, f).split("\\").join("/"))
  // RSC payload (*.txt) tidak dipakai saat prefetch dimatikan; lewati agar cache ringkas.
  .filter((f) => !SKIP.has(f) && !f.endsWith(".txt") && !f.startsWith("_next/static/development"))
  .sort();

// Halaman dilayani tanpa ekstensi di GitHub Pages: tambahkan bentuk URL bersihnya.
const pages = files.filter((f) => f.endsWith(".html") && f !== "404.html").map((f) => (f === "index.html" ? "" : f.replace(/\.html$/, "")));
const all = [...new Set([...files, ...pages])];

const hash = createHash("sha1");
for (const f of files) hash.update(f).update(readFileSync(join(out, f)));
const version = hash.digest("hex").slice(0, 10);

writeFileSync(join(out, "sw-manifest.json"), JSON.stringify({ version, files: all }) + "\n");
console.log(`sw-manifest.json: ${all.length} berkas, versi ${version}`);
