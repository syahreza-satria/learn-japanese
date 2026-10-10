# Manabii (まなび)

Website gratis dan open source untuk belajar bahasa Jepang dari nol sampai **JLPT N5**, untuk pengguna berbahasa Indonesia.

Jalur belajar: Hiragana → Katakana → Kosakata → Kanji dasar → Tata bahasa N5.
Tanpa akun; progres disimpan di `localStorage` browser. Dibangun dengan **Next.js (App Router, static export)**, React, JavaScript, dan Bootstrap 5.3; hasilnya situs statis untuk GitHub Pages.

> Status: **v1.0 (MVP)** — Kana, Kosakata, Flashcard SRS, Kuis, Progres. Kanji & tata bahasa menyusul (v1.1–v1.2).

## Tampilan

| Beranda                                  | Kana                                      | Flashcard                                           | Kuis                                      |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| ![Beranda](docs/screenshots/beranda.png) | ![Kana](docs/screenshots/kana-mobile.png) | ![Flashcard](docs/screenshots/flashcard-mobile.png) | ![Kuis](docs/screenshots/kuis-mobile.png) |

## Menjalankan secara lokal

Butuh Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Build statis (hasil di `out/`, memakai basePath `/learn-japanese`):

```bash
npm run build
# uji lokal: salin out/ ke folder bernama "learn-japanese", lalu sajikan folder induknya
npx serve <folder-induk>   # buka http://localhost:3000/learn-japanese/
```

## Tes & validasi data

Tes logika murni tidak membutuhkan dependensi tambahan:

```bash
node --test                      # tes SRS, romaji, statistik, mesin kuis, dan data
node scripts/validate-data.mjs   # validasi data/*.json terhadap data/schema/*.json
```

## Struktur folder

```
src/app/         rute App Router (/, /kana, /kosakata, /flashcard, /kuis, /progres, not-found)
src/features/    satu komponen client per halaman
src/components/  Navbar, Footer, ToastHost, ThemeSync, dll.
src/lib/         logika murni (srs, romaji, stats, quiz-engine) + storage, tts, data, hooks
src/styles/      theme.css (design tokens + override Bootstrap), components.css
data/            hiragana, katakana, vocab-n5, themes (+ schema/)
public/          og-image.svg
scripts/         validate-data.mjs
tests/           tes `node --test`
.github/         workflow validasi data & deploy GitHub Pages, template issue
```

## Berkontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Atribusi materi pihak ketiga ada di [ATTRIBUTION.md](ATTRIBUTION.md).

## Lisensi

Kode: [MIT](LICENSE).

## Catatan keputusan

Keputusan yang tidak tercakup di `context.md` dan dipilih seperti berikut (opsi paling sederhana):

- **Prototipe lama dihapus.** Repo sebelumnya berisi satu halaman statis ("Belajar Nippon"); diganti total oleh struktur Manabii. Versi lama tetap ada di riwayat git.
- **Migrasi ke Next.js (v1.1):** App Router dengan `output: 'export'` + JavaScript. Navbar/footer kini komponen React yang ikut di-prerender (tanpa layout shift). `react-bootstrap` dipakai untuk Modal/Offcanvas/Toast agar tidak mengelola JS Bootstrap manual.
- **Base URL:** `https://syahreza-satria.github.io/learn-japanese/` ada di `src/lib/config.js` (dipakai untuk canonical, Open Graph, sitemap, robots) dan `basePath` di `next.config.mjs`; ganti keduanya saat domain final ditentukan.
- **Tema kosakata** disimpan di `data/themes.json` (label, ikon, deskripsi) agar materi tetap hanya ada di folder `data/`.
- **Kana:** `ん` berada di baris `nn` (bukan `n`, yang dipakai baris な). `ぢ/づ` (romaji `ji`/`zu`) punya `alt` (`di`/`du`), dan `を` punya `alt` `o` untuk jawaban ketik. Pada mode romaji→kana, kana yang romajinya ambigu (じ/ぢ, ず/づ) tidak dijadikan soal.
- **Romaji vokal panjang** ditulis sesuai kana (`ou`, `oo`, `uu`), bukan makron, supaya mudah diketik.
- **Item SRS dibuat saat pertama kali dinilai**, ditambahkan dari Kosakata ("Tambahkan ke flashcard"), atau saat salah menjawab kuis. Dek Hiragana/Katakana/Kosakata menampilkan item baru dan yang jatuh tempo.
- **`reviewed: false`** ditandai pada seluruh entri kosakata: materi belum ditinjau penutur asli/guru. Koreksi sangat diharapkan.
- **Skrip kecil di `<head>`** (inline, di `layout.js`) menerapkan `data-bs-theme` sebelum render dan menyisipkan CSS Google Fonts secara non-blocking.
- **TTS cadangan online:** bila perangkat tak punya voice Jepang, `tts.js` memutar audio dari endpoint `translate.google.com/translate_tts` (tidak resmi: bisa berubah atau dibatasi sewaktu-waktu, dan teks materi yang dibacakan dikirim ke Google). Voice bawaan perangkat tetap diprioritaskan; untuk TTS yang stabil, ganti dengan layanan resmi berkunci atau berkas audio.
- **Data materi di-import dinamis** (`import()` JSON) sehingga ikut code-splitting per halaman; `Link` memakai `prefetch={false}` karena prefetch RSC pada static export menghasilkan 404 di console.
- **Kartu baru flashcard dibatasi 20 per sesi** agar sesi tetap 5–15 menit; bila tidak ada kartu jatuh tempo tersedia tombol "Latih tetap" (maks. 30 kartu acak, penilaian tetap memperbarui SRS).
- **Impor data menimpa seluruh data** setelah konfirmasi, dan hanya menerima cadangan Manabii versi ≤ 1.
- **og-image berformat SVG** sesuai rencana; sebagian platform sosial hanya menampilkan PNG/JPG, jadi ganti bila pratinjau tidak muncul.
