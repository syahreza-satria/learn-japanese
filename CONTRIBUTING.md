# Berkontribusi ke Manabii

Terima kasih sudah membantu! Kontribusi paling berharga saat ini adalah **koreksi materi** (terjemahan, romaji, contoh kalimat) dari penutur asli atau pengajar bahasa Jepang.

## Aturan dasar

- Tech stack terkunci: Next.js (App Router, `output: 'export'`) + React + JavaScript + Bootstrap 5.3. Tanpa TypeScript, backend/SSR dinamis, atau database.
- Teks UI berbahasa Indonesia; nama file, variabel, fungsi, dan komentar kode berbahasa Inggris.
- Materi pelajaran **hanya** di `data/*.json`, jangan di-hardcode di komponen.
- Jangan menyalin materi berhak cipta. Gunakan sumber berlisensi terbuka dan catat di [ATTRIBUTION.md](ATTRIBUTION.md).
- Commit kecil dengan pesan [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).

## Menjalankan lokal

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # static export ke out/ + precache service worker
npm start              # pratinjau hasil build di /learn-japanese/
npm run lint           # ESLint
node --test            # tes logika murni & data
node scripts/validate-data.mjs
npm run test:e2e       # Playwright lintas browser (butuh build + `npx playwright install`)
```

## Menambah atau memperbaiki materi

### Kosakata (`data/vocab-n5.json`)

```json
{
  "id": "v0012",
  "word": "学生",
  "kana": "がくせい",
  "romaji": "gakusei",
  "meaning": "pelajar, mahasiswa",
  "theme": "sekolah",
  "level": "N5",
  "example": { "jp": "わたしは がくせいです。", "id": "Saya pelajar." },
  "reviewed": false
}
```

- `id`: `v` + 4 digit, unik. Entri baru diberi nomor berikutnya; jangan menggunakan ulang nomor lama (id dipakai untuk progres pengguna).
- `word`: tulisan umum (kanji bila lazim). Bila hanya kana, samakan dengan `kana`.
- `kana`: bacaan; juga dibacakan oleh TTS. Boleh memakai spasi untuk ungkapan multi-kata.
- `romaji`: Hepburn huruf kecil, vokal panjang ditulis sesuai kana (`ou`, `oo`, `uu`, tanpa makron), `ん` sebelum vokal/y ditulis `n'`.
- `theme`: salah satu `id` di `data/themes.json`.
- Contoh kalimat: gaya pemula, kata dipisah spasi.
- Setelah seorang penutur asli/guru meninjau entri, ubah `reviewed` menjadi `true`.

### Kana (`data/hiragana.json`, `data/katakana.json`)

Isinya baku (104 karakter per aksara). Koreksi biasanya hanya pada `example` (contoh kata). Aturan khusus: `ん` berada di baris `nn`; `ぢ/づ` memakai `alt` (`di`/`du`) dan `を` memakai `alt` `o`.

### Kanji (`data/kanji-n5.json`)

`id` `j###`, `char`, `meaning`, `onyomi`/`kunyomi` (kana, tanpa okurigana), `strokes` (harus sama dengan jumlah path di `data/strokes.json`), `examples[]` (`word`, `kana`, `meaning`).
Data goresan `data/strokes.json` berasal dari KanjiVG (CC BY-SA 3.0); jangan diedit manual.

### Tata bahasa (`data/grammar-n5.json`)

`id` `g###`, `category`, `pattern`, `title`, `explanation`, `examples[]` (`jp`, `id`), dan `exercise` (`prompt` memuat `___`, `answer`, `choices` termasuk jawaban, `hint` opsional).
Pastikan **hanya satu** pilihan yang benar secara tata bahasa.

### Tema (`data/themes.json`)

Tambahkan objek `{ id, label, icon, description }`; `icon` adalah nama kelas Bootstrap Icons (`bi-...`).

## Meninjau materi (untuk penutur asli / guru)

```bash
npm run review-report                       # tabel entri "reviewed": false
node scripts/review-report.mjs vocab --csv  # ekspor CSV (vocab | kanji | grammar)
node scripts/mark-reviewed.mjs vocab v0001 v0002   # tandai sudah ditinjau (atau --all)
```

Perbaiki teks yang keliru langsung di JSON (jangan mengubah `id`), lalu tandai entri yang sudah benar dengan `mark-reviewed`.

## Validasi

Setiap PR yang menyentuh `data/` divalidasi otomatis (`.github/workflows/validate-data.yml`). Jalankan lokal:

```bash
node scripts/validate-data.mjs
```

Skema ada di `data/schema/`. Validator memeriksa tipe, properti wajib, pola, `id` ganda, dan tema yang tidak dikenal.

## Kode

- Komponen fungsi React + hooks; `"use client"` hanya bila perlu. Akses `localStorage`/`window` hanya di effect atau event handler.
- Jangan memakai `dangerouslySetInnerHTML` untuk teks dari data.
- Logika murni (SRS, pembuatan soal, normalisasi romaji, statistik) tinggal di `src/lib/`, tanpa DOM/React, dan wajib punya tes `node --test`.
- Komponen `PascalCase`; file di `src/lib/` dan class CSS kustom `kebab-case`, class kustom berawalan `mb-`.
- Pastikan: responsif 360/768/1280 px, mode terang & gelap terbaca, bisa dioperasikan dengan keyboard, tidak ada error di console, dan `npm run build` berhasil.
