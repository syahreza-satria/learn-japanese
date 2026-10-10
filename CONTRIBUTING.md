# Berkontribusi ke Manabii

Terima kasih sudah membantu! Kontribusi paling berharga saat ini adalah **koreksi materi** (terjemahan, romaji, contoh kalimat) dari penutur asli atau pengajar bahasa Jepang.

## Aturan dasar

- Tech stack terkunci: HTML + Bootstrap 5.3 (CDN) + vanilla JavaScript ES modules. Tanpa framework, bundler, backend, atau database.
- Teks UI berbahasa Indonesia; nama file, variabel, fungsi, dan komentar kode berbahasa Inggris.
- Materi pelajaran **hanya** di `data/*.json`, jangan di-hardcode di JS/HTML.
- Jangan menyalin materi berhak cipta. Gunakan sumber berlisensi terbuka dan catat di [ATTRIBUTION.md](ATTRIBUTION.md).
- Commit kecil dengan pesan [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).

## Menjalankan lokal

```bash
npx serve .            # atau: python -m http.server 8000
node --test            # tes logika murni & data
node scripts/validate-data.mjs
```

`fetch()` JSON tidak berjalan di `file://`; selalu uji lewat static server.

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

### Tema (`data/themes.json`)

Tambahkan objek `{ id, label, icon, description }`; `icon` adalah nama kelas Bootstrap Icons (`bi-...`).

## Validasi

Setiap PR yang menyentuh `data/` divalidasi otomatis (`.github/workflows/validate-data.yml`). Jalankan lokal:

```bash
node scripts/validate-data.mjs
```

Skema ada di `data/schema/`. Validator memeriksa tipe, properti wajib, pola, `id` ganda, dan tema yang tidak dikenal.

## Kode

- ES modules, `const`/`let`, tanpa variabel global.
- Escape teks dari data sebelum masuk `innerHTML` (`escapeHtml`) atau pakai `textContent`.
- Logika murni (SRS, pembuatan soal, normalisasi romaji, statistik) dipisah dari DOM dan wajib punya tes `node --test`.
- Nama file dan class CSS kustom `kebab-case`, class kustom berawalan `mb-`.
- Pastikan: responsif 360/768/1280 px, mode terang & gelap terbaca, bisa dioperasikan dengan keyboard, tidak ada error di console.
