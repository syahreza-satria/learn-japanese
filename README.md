# Manabii (まなび)

Website gratis dan open source untuk belajar bahasa Jepang dari nol sampai **JLPT N5**, untuk pengguna berbahasa Indonesia.

Jalur belajar: Hiragana → Katakana → Kosakata → Kanji dasar → Tata bahasa N5.
Tanpa akun; progres disimpan di `localStorage` browser. Situs statis (HTML + Bootstrap 5.3 + vanilla JS ES modules), tanpa build step.

> Status: **v1.0 (MVP)** — Kana, Kosakata, Flashcard SRS, Kuis, Progres. Kanji & tata bahasa menyusul (v1.1–v1.2).

## Menjalankan secara lokal

`fetch()` JSON tidak berjalan di `file://`, jadi gunakan static server:

```bash
npx serve .
# atau
python -m http.server 8000
```

Lalu buka `http://localhost:3000` (serve) atau `http://localhost:8000` (python).

## Tes & validasi data

Butuh Node.js 20+ (tanpa dependensi tambahan):

```bash
node --test                      # tes SRS, romaji, statistik, mesin kuis, dan data
node scripts/validate-data.mjs   # validasi data/*.json terhadap data/schema/*.json
```

## Struktur folder

```
index.html · kana.html · kosakata.html · flashcard.html · kuis.html · progres.html · 404.html
assets/css/      theme.css (design tokens + override Bootstrap), components.css
assets/js/core/  storage, tts, data, ui, srs, romaji, stats, quiz-engine (modul inti, logika murni dipisah)
assets/js/features/  satu modul per halaman
assets/img/      favicon & og-image (SVG)
data/            hiragana, katakana, vocab-n5, themes (+ schema/)
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
- **Navbar & footer disisipkan lewat JS** (`core/ui.js`) agar hanya ada satu sumber markup tanpa build step. Tinggi placeholder dipesan di CSS supaya tidak ada layout shift.
- **Base URL:** `https://syahreza-satria.github.io/learn-japanese/` disimpan di `assets/js/core/config.js`. Nilai yang sama juga muncul statis di `<head>` (canonical/OG), `sitemap.xml`, `robots.txt`, dan `<base>` di `404.html`; ganti semuanya saat domain final ditentukan.
- **Tema kosakata** disimpan di `data/themes.json` (label, ikon, deskripsi) agar materi tetap hanya ada di folder `data/`.
- **Kana:** `ん` berada di baris `nn` (bukan `n`, yang dipakai baris な). `ぢ/づ` (romaji `ji`/`zu`) punya `alt` (`di`/`du`), dan `を` punya `alt` `o` untuk jawaban ketik. Pada mode romaji→kana, kana yang romajinya ambigu (じ/ぢ, ず/づ) tidak dijadikan soal.
- **Romaji vokal panjang** ditulis sesuai kana (`ou`, `oo`, `uu`), bukan makron, supaya mudah diketik.
- **Item SRS dibuat saat pertama kali dinilai**, ditambahkan dari Kosakata ("Tambahkan ke flashcard"), atau saat salah menjawab kuis. Dek Hiragana/Katakana/Kosakata menampilkan item baru dan yang jatuh tempo.
- **`reviewed: false`** ditandai pada seluruh entri kosakata: materi belum ditinjau penutur asli/guru. Koreksi sangat diharapkan.
- **og-image berformat SVG** sesuai rencana; sebagian platform sosial hanya menampilkan PNG/JPG, jadi ganti bila pratinjau tidak muncul.
