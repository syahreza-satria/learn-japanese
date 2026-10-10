# context.md — Manabii (まなび)

> Dokumen ini adalah konteks lengkap untuk agent (Claude Code) yang membangun proyek **Manabii**.
> Baca seluruh file ini sebelum menulis kode. Ikuti instruksi di bagian **"Tugas sekarang"** di akhir dokumen.
> Tip: simpan juga sebagai `CLAUDE.md` di root repo agar otomatis dibaca Claude Code di setiap sesi.
>
> **Revisi v1.1:** stack dimigrasi dari HTML + vanilla JS ke **Next.js (static export)**. Bagian §2, §3, §4, dan §11 sudah disesuaikan; fitur, desain, skema data, dan acceptance criteria (§5–§10) tidak berubah.

---

## 1. Ringkasan proyek

**Manabii (まなび)** adalah website gratis dan **open source** untuk belajar bahasa Jepang dari nol sampai level **JLPT N5**, untuk pengguna berbahasa Indonesia.

- Jalur belajar: Hiragana → Katakana → Kosakata → Kanji dasar → Tata bahasa N5.
- Tanpa akun / login di v1. Progres disimpan di `localStorage` browser.
- Tampilan **minimalis bergaya Jepang** (washi, sumi, aksen merah shu), mobile-first.
- Situs statis, di-host di **GitHub Pages**.

Target pengguna: pemula total (mahasiswa, karyawan persiapan JLPT N5, guru ekskul) yang belajar dalam sesi pendek 5–15 menit, sebagian besar lewat HP.

---

## 2. Aturan wajib (constraints)

1. **Tech stack terkunci:** **Next.js (App Router) dengan `output: 'export'`** + React + **JavaScript** (bukan TypeScript) + **Bootstrap 5.3** (paket npm) + `react-bootstrap` untuk modal/offcanvas/toast.
   - DILARANG: TypeScript, Tailwind, jQuery, Vue/Svelte, backend/server (route handler, API, SSR dinamis), database.
   - Situs harus selalu bisa diekspor statis ke `out/` dan di-host di GitHub Pages.
   - Library tambahan hanya jika benar-benar perlu; tanyakan dulu sebelum menambah.
2. **Build step diperbolehkan** (`npm run build` → `out/`). Pengembangan lewat `npm run dev`. Hasil build memakai `basePath` `/learn-japanese` (hanya di produksi); untuk mengujinya secara lokal, salin `out/` ke folder bernama `learn-japanese` lalu sajikan folder induknya dengan `npx serve`.
3. **Tanpa login di v1.** Jangan membuat sistem akun, auth, atau sinkron cloud (itu fitur v2).
4. **Audio = TTS** lewat Web Speech API (`speechSynthesis`, voice `ja-JP`). Jangan menambahkan file audio MP3/OGG.
5. **Teks UI berbahasa Indonesia.** Nama file, variabel, fungsi, dan komentar kode dalam bahasa Inggris.
6. Setiap teks Jepang dibungkus elemen dengan `lang="ja"`.
7. Materi pelajaran **hanya** di file JSON di folder `data/` (di-import oleh `src/lib/data.js`) — jangan di-hardcode di komponen.
8. Jangan menyalin materi berhak cipta. Gunakan sumber berlisensi terbuka dan cantumkan atribusi.

---

## 3. Tech stack

| Lapisan        | Pilihan                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Framework      | Next.js (App Router, `output: 'export'`) + React, JavaScript                                      |
| UI             | Bootstrap 5.3 (npm: `bootstrap`) + `react-bootstrap` (Modal, Offcanvas, Toast)                   |
| Ikon           | `bootstrap-icons` (npm)                                                                          |
| Font           | Google Fonts: Noto Serif JP, Noto Sans JP, Inter (disisipkan non-blocking dari `layout.js`)       |
| Logika         | Modul murni di `src/lib/` (SRS, romaji, quiz-engine, stats) + komponen client di `src/features/`  |
| Data           | File JSON statis di `data/` (di-code-split lewat dynamic `import()`)                             |
| Penyimpanan    | `localStorage`, prefix key `manabii:v1:`                                                          |
| Audio          | Web Speech API (`speechSynthesis`, `lang = 'ja-JP'`)                                              |
| Offline (v1.1) | Service worker + `manifest.webmanifest` (belum dikerjakan)                                        |
| Kualitas       | `node --test` untuk logika murni; validasi data via `scripts/validate-data.mjs`                  |
| Hosting        | GitHub Pages + GitHub Actions (build `next build`, unggah `out/`)                                 |

---

## 4. Struktur folder

```
manabii/
├── next.config.mjs        # output: 'export', basePath produksi
├── jsconfig.json          # alias @/ → src/
├── public/                # og-image.svg
├── src/
│   ├── app/               # App Router
│   │   ├── layout.js      # Navbar, Footer, ToastHost, ThemeSync, skrip tema + font
│   │   ├── page.js        # Beranda
│   │   ├── kana/ kosakata/ flashcard/ kuis/ progres/   # page.js = metadata + <XxxPage />
│   │   ├── not-found.js   # → 404.html
│   │   ├── icon.svg · robots.js · sitemap.js
│   ├── components/        # Navbar, Footer, ToastHost, ThemeSync, PageTitle, Hanko, JaWord, LoadError
│   ├── features/          # HomePage, KanaPage, VocabPage, FlashcardPage, QuizPage, ProgressPage ("use client")
│   ├── lib/               # srs, romaji, stats, quiz-engine, random (murni) · storage, tts, data, toast, hooks, theme, seo, lesson, config
│   └── styles/            # theme.css (design tokens + override Bootstrap), components.css
├── data/
│   ├── hiragana.json · katakana.json · vocab-n5.json · themes.json
│   ├── kanji-n5.json      # (v1.1)
│   ├── grammar-n5.json    # (v1.2)
│   └── schema/            # JSON Schema untuk validasi data
├── scripts/validate-data.mjs
├── tests/                 # node --test
├── .github/               # workflows (validasi data, deploy Pages), ISSUE_TEMPLATE
├── README.md · CONTRIBUTING.md · LICENSE (MIT) · ATTRIBUTION.md
```

Komponen halaman memakai `"use client"`; akses `localStorage`/`window` hanya di dalam effect atau event handler agar prerender statis dan hydration konsisten.

---

## 5. Desain UI

### Arah visual

Minimalis Jepang (_ma_ — ruang kosong). Kesan "Jepang" datang dari **warna, tipografi, dan ruang**, bukan ornamen. Tanpa gradien mencolok, tanpa ilustrasi anime.

### Design tokens (`assets/css/theme.css`)

```css
:root {
  --jp-paper: #f7f3ea; /* washi — latar terang */
  --jp-ink: #1f1f1f; /* sumi — teks, latar gelap */
  --jp-shu: #c8402f; /* merah vermilion — aksen, tombol utama, hanko */
  --jp-ai: #264653; /* indigo — link, sekunder */
  --jp-matcha: #7a9a5a; /* benar / berhasil */
  --jp-sakura: #f2d7d9; /* highlight lembut, badge */
  --jp-stone: #8c8578; /* teks sekunder, border */

  --jp-font-serif: "Noto Serif JP", serif;
  --jp-font-sans: "Inter", "Noto Sans JP", system-ui, sans-serif;
  --jp-radius: 6px;
}
```

- Petakan token ke variabel Bootstrap (`--bs-body-bg`, `--bs-body-color`, `--bs-primary` = shu, `--bs-link-color` = ai, `--bs-border-radius`, dll.).
- **Mode gelap** memakai `data-bs-theme="dark"` di `<html>`: latar `--jp-ink`, teks `--jp-paper`. Default mengikuti `prefers-color-scheme`, bisa di-override user (disimpan di settings).
- Kontras teks minimal 4.5:1 di kedua mode.

### Tipografi

- Judul & karakter besar: Noto Serif JP. Isi: Inter + Noto Sans JP.
- Karakter kana di kartu: 64–96 px.
- Judul halaman bilingual, contoh: `<h1><span lang="ja">ひらがな</span> Hiragana</h1>`.

### Komponen & detail

- Kartu: latar kertas, border 1px `--jp-stone` tipis, radius 4–8px, bayangan sangat halus.
- Pemisah tipis ala shoji/tatami. Motif _seigaiha_ sangat samar (opacity ≤ 0.06) hanya di hero Beranda (buat dengan SVG/CSS, bukan gambar raster).
- **Hanko**: lingkaran/kotak merah shu dengan karakter 済 atau 完 yang muncul saat pelajaran/kuis selesai.
- Animasi: flip flashcard 300ms, fade antarbagian. Matikan saat `prefers-reduced-motion: reduce`.
- Komponen Bootstrap yang dipakai: navbar + offcanvas (menu mobile), card, modal (hasil kuis), progress, badge, toast, form-check switch, btn-group.

### Prinsip UX

- Mobile-first, nyaman mulai 360px.
- Satu tujuan utama per layar.
- Maksimal 3 klik dari Beranda ke latihan apa pun.
- Beranda selalu menampilkan **"Lanjutkan belajar"** dan **"Review hari ini (n kartu)"**.

---

## 6. Halaman & navigasi

Navigasi datar; navbar sama di semua halaman: **Beranda · Kana · Kosakata · Flashcard · Kuis · Progres** + tombol mode gelap. Di mobile navbar memakai offcanvas.

| Halaman          | Isi utama                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`     | Hero singkat, kartu "Lanjutkan belajar", "Review hari ini", streak, 4 jalur belajar (kana, kosakata, kanji*, tata bahasa*) — \*bertanda "Segera hadir" di MVP |
| `kana.html`      | Tab Hiragana / Katakana; sub-tab Gojūon / Dakuten / Yōon; grid kartu; toggle romaji; tombol "Kuis baris ini"                                                  |
| `kosakata.html`  | Daftar tema → daftar kata; pencarian (kana/romaji/arti); filter tema; detail kata di modal/offcanvas                                                          |
| `flashcard.html` | Pilih dek (Hiragana, Katakana, Kosakata per tema, atau "Review hari ini"); kartu flip; 4 tombol penilaian                                                     |
| `kuis.html`      | Setup kuis (sumber, mode, jumlah soal, timer) → sesi kuis → modal hasil                                                                                       |
| `progres.html`   | Statistik, streak, target harian, pengaturan, ekspor/impor/reset data                                                                                         |

Parameter URL boleh dipakai untuk deep link, contoh: `kuis.html?source=hiragana&row=a&mode=mc&count=10`.

---

## 7. Spesifikasi fitur & acceptance criteria

### F1 — Hiragana & Katakana (`kana.html`)

- F1.1 Grid gojūon (46), dakuten/handakuten (25), yōon (33) untuk Hiragana dan Katakana. Sel kosong pada tabel gojūon (mis. yi, ye, wu) tetap diberi slot kosong agar grid rapi.
- F1.2 Kartu menampilkan karakter besar, romaji, dan satu contoh kata (kana + arti).
- F1.3 Klik/tap kartu → TTS membacakan karakter. Juga bisa via keyboard (Enter/Space).
- F1.4 Toggle "Tampilkan romaji" (state disimpan di settings).
- F1.5 Tombol "Kuis baris ini" per baris → membuka `kuis.html` dengan parameter.
- F1.6 (v1.1) Animasi urutan goresan.
- **Diterima jika:** semua 104 karakter per skrip tampil benar, audio berbunyi di Chrome Android & desktop, grid tidak scroll horizontal di 360px.

### F2 — Kosakata (`kosakata.html`)

- F2.1 Daftar tema dengan jumlah kata per tema.
- F2.2 Entri: kanji/kana, furigana (`<ruby>`), romaji, arti Indonesia, contoh kalimat + terjemahan, tombol audio TTS.
- F2.3 Pencarian real-time (kana, romaji, atau arti) + filter tema.
- F2.4 Tombol "Tambahkan ke flashcard" per kata/tema.
- **Diterima jika:** ±300 kata MVP terbaca dari `vocab-n5.json`, pencarian < 100ms, furigana tampil benar.

### F3 — Flashcard SRS (`flashcard.html`)

- F3.1 Kartu dua sisi; depan: Jepang (tanpa romaji kecuali toggle aktif), belakang: romaji + arti + contoh. Flip dengan klik, Space, atau tombol.
- F3.2 Penilaian: **Lupa (0) / Sulit (1) / Bisa (2) / Mudah (3)**; shortcut keyboard 1–4.
- F3.3 Penjadwalan memakai SM-2 sederhana (lihat §9).
- F3.4 Dek "Review hari ini" = semua item dengan `due <= hari ini`.
- F3.5 Layar selesai menampilkan hanko + ringkasan.
- **Diterima jika:** penilaian mengubah `due` sesuai algoritma, refresh halaman tidak menghilangkan progres.

### F4 — Kuis (`kuis.html`)

- F4.1 Sumber: Hiragana / Katakana (semua atau per baris) / Kosakata (per tema).
- F4.2 Mode: pilihan ganda (kana→romaji, romaji→kana, kata→arti) dan ketik jawaban (input romaji, case-insensitive, trim spasi; terima variasi umum: `shi/si`, `chi/ti`, `tsu/tu`, `fu/hu`, `ji/zi`).
- F4.3 Jumlah soal 10 / 20 / 50; timer opsional (off / 10 dtk per soal).
- F4.4 Pengecoh pilihan ganda diambil acak dari item sejenis, tanpa duplikat.
- F4.5 Feedback langsung (warna matcha/shu + jawaban benar), lalu modal hasil: skor, daftar salah, tombol **"Ulangi yang salah"**.
- F4.6 Jawaban salah otomatis menambah item ke antrian SRS.
- **Diterima jika:** tidak ada soal ganda dalam satu sesi, skor tersimpan di riwayat.

### F5 — Progres & pengaturan (`progres.html`)

- F5.1 Statistik: kana dikuasai (per skrip), kata dikuasai, total review, streak harian, target harian (default 10 review/hari).
- F5.2 Item dianggap **dikuasai** jika `interval >= 21` hari.
- F5.3 Streak bertambah jika ada ≥ 1 aktivitas belajar di hari itu (zona waktu lokal browser).
- F5.4 Ekspor semua data `manabii:v1:*` ke file `manabii-backup-YYYY-MM-DD.json`; impor dengan validasi versi; reset dengan konfirmasi modal.
- F5.5 Pengaturan: mode gelap (auto/terang/gelap), tampilkan romaji, kecepatan TTS (0.6–1.2), target harian.

### F6 — Kanji & tata bahasa (v1.1–v1.2, JANGAN dikerjakan di MVP)

- Kanji N5 (±100): onyomi, kunyomi, arti, jumlah goresan, contoh kata, SVG KanjiVG.
- Tata bahasa N5 (±80 pola): pola, penjelasan Indonesia, contoh, latihan isian.

---

## 8. Skema data (`data/`)

### `hiragana.json` / `katakana.json`

```json
[
  {
    "id": "h-ka",
    "char": "か",
    "romaji": "ka",
    "group": "gojuon",
    "row": "k",
    "col": "a",
    "example": { "word": "かさ", "romaji": "kasa", "meaning": "payung" }
  }
]
```

- `group`: `"gojuon" | "dakuten" | "handakuten" | "yoon"`.
- `id` prefix `h-` untuk hiragana, `k-` untuk katakana.

### `vocab-n5.json`

```json
[
  {
    "id": "v0012",
    "word": "学生",
    "kana": "がくせい",
    "romaji": "gakusei",
    "meaning": "pelajar, mahasiswa",
    "theme": "sekolah",
    "level": "N5",
    "example": { "jp": "わたしは がくせいです。", "id": "Saya pelajar." }
  }
]
```

- Teks yang dibacakan TTS: `kana` (bukan `word`, agar pelafalan kanji tidak salah), atau `example.jp`.
- Tema MVP (±300 kata total): salam & ungkapan, angka, waktu & hari, keluarga, orang & pekerjaan, sekolah, makanan & minuman, tempat, kata kerja dasar, kata sifat dasar.
- Buat JSON Schema untuk setiap file di `data/schema/` dan validasi di CI.

---

## 9. Logika inti

### Storage (`core/storage.js`)

Key (semua berprefix `manabii:v1:`):

| Key           | Isi                                                                      |
| ------------- | ------------------------------------------------------------------------ |
| `settings`    | `{ theme, showRomaji, ttsRate, dailyGoal }`                              |
| `srs`         | `{ [itemId]: { ease, interval, reps, due, lastReviewed } }`              |
| `quizHistory` | array `{ date, source, mode, total, correct }` (maks 100 entri terakhir) |
| `activity`    | `{ "YYYY-MM-DD": jumlahReview }`                                         |
| `lastLesson`  | `{ page, params, label }` untuk "Lanjutkan belajar"                      |

- Semua akses `localStorage` dibungkus `try/catch`; jika gagal, aplikasi tetap jalan (state di memori) dan tampilkan toast peringatan sekali.
- Ekspor/impor menyertakan `{ app: "manabii", version: 1, exportedAt, data }`.

### SRS — SM-2 sederhana (`core/srs.js`)

Item baru: `ease = 2.5, interval = 0, reps = 0, due = hari ini`.

| Nilai   | Efek                                                                                      |
| ------- | ----------------------------------------------------------------------------------------- |
| 0 Lupa  | `reps = 0`, `interval = 0` (muncul lagi di sesi yang sama), `ease = max(1.3, ease - 0.2)` |
| 1 Sulit | `interval = max(1, round(interval * 1.2))`, `ease = max(1.3, ease - 0.15)`                |
| 2 Bisa  | `reps += 1`; interval = 1 (reps 1), 3 (reps 2), lalu `round(interval * ease)`             |
| 3 Mudah | seperti Bisa lalu `interval = round(interval * 1.3)`, `ease += 0.15`                      |

`due = hari ini + interval` (tanggal lokal, format `YYYY-MM-DD`). Fungsi harus murni dan mudah dites.

### TTS (`core/tts.js`)

- `speak(text, { rate })`: batalkan ucapan sebelumnya, lalu ucapkan dengan voice `ja-JP` terbaik yang tersedia.
- Tangani `voiceschanged` (voice dimuat async di Chrome).
- Jika tidak ada voice `ja-JP`: tombol audio tetap ada tetapi menampilkan toast "Suara bahasa Jepang tidak tersedia di perangkat ini" (sekali per sesi).

---

## 10. Kebutuhan non-fungsional

- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90.
- Total JS kustom < 100 KB (tidak di-minify pun tidak masalah).
- WCAG 2.1 AA: navigasi keyboard penuh, fokus terlihat, `aria-label` pada tombol ikon, `lang="ja"` pada teks Jepang.
- Browser: 2 versi terakhir Chrome, Firefox, Safari, Edge; Safari iOS 15+.
- SEO: `<title>` & meta description unik per halaman, Open Graph, `sitemap.xml`, `robots.txt`, `<html lang="id">`.
- Privasi: tidak ada data dikirim ke server. Tanpa cookie, tanpa tracker pihak ketiga.

---

## 11. Konvensi kode

- ES modules, `const`/`let`, komponen fungsi + hooks. `"use client"` hanya di komponen yang membutuhkan state/efek/browser API.
- Render via JSX (React meng-escape teks). Hindari `dangerouslySetInnerHTML`, kecuali skrip init tema di `layout.js`.
- Satu komponen fitur per halaman (`src/features/`); logika murni (SRS, pembuatan soal kuis, normalisasi romaji, statistik) tetap di `src/lib/` tanpa DOM/React agar bisa dites. Impor relatif dengan ekstensi `.js` di `src/lib/` (dipakai langsung oleh `node --test`).
- Penamaan: `camelCase` untuk fungsi/variabel, `PascalCase` untuk komponen React, `kebab-case` untuk file di `src/lib/` dan class CSS kustom (prefix `mb-`, mis. `.mb-kana-card`).
- Commit kecil dengan pesan Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Tes ringan untuk logika murni dengan `node --test` (tanpa dependensi tambahan); jalankan juga `npm run build` sebelum merge.

---

## 12. Open source

- Lisensi **MIT** untuk kode. Materi pihak ketiga mengikuti lisensinya (KanjiVG = CC BY-SA 3.0) dan dicatat di `ATTRIBUTION.md` + halaman/footer atribusi.
- `README.md`: deskripsi, screenshot, cara menjalankan lokal, struktur folder, cara berkontribusi, lisensi.
- `CONTRIBUTING.md`: cara menambah/memperbaiki materi JSON, aturan format, cara menjalankan validasi.
- GitHub Actions:
  1. `validate-data.yml` — validasi semua JSON di `data/` terhadap schema pada setiap PR.
  2. `deploy.yml` — `npm ci`, `next build`, lalu deploy `out/` ke GitHub Pages saat push ke `main`.
- Template issue: laporan bug, koreksi materi, usulan fitur.

---

## 13. Roadmap

| Fase                   | Perkiraan      | Lingkup                                                                                |
| ---------------------- | -------------- | -------------------------------------------------------------------------------------- |
| Fase 0 — Fondasi       | Minggu 1–2     | Struktur repo, design tokens, layout & navbar, core modules, data kana lengkap, schema |
| Fase 1 — MVP v1.0      | Minggu 3–6     | Kana, kosakata ±300, flashcard SRS, kuis, progres, mode gelap, README, deploy          |
| **Gerbang rilis v1.0** | akhir minggu 6 | Lighthouse ≥ 90 + uji coba ke 5 pengguna                                               |
| Fase 2 — v1.1          | Minggu 7–9     | Kanji N5 + goresan SVG, PWA offline                                                    |
| Fase 3 — v1.2          | Minggu 10–12   | Tata bahasa N5, kosakata ±800, review materi                                           |
| v2                     | setelah v1.2   | Login opsional, sinkron progres antar perangkat, materi N4                             |

---

## 14. Tugas sekarang (eksekusi ini)

Kerjakan **Fase 0 lalu Fase 1** secara berurutan. Jangan mengerjakan F6, PWA, atau fitur v2.

### Fase 0 — Fondasi

- [ ] Inisialisasi struktur folder sesuai §4, `LICENSE` (MIT), `.gitignore`, `README.md` awal.
- [ ] `theme.css` dengan design tokens + mapping ke Bootstrap + mode gelap; `components.css` dasar.
- [ ] Layout bersama: navbar (+ offcanvas mobile), footer (atribusi + link GitHub), theme toggle, untuk semua 6 halaman + `404.html`.
- [ ] Core modules: `storage.js`, `tts.js`, `data.js`, `ui.js`, `srs.js`.
- [ ] `hiragana.json` dan `katakana.json` lengkap (gojūon, dakuten, handakuten, yōon) + schema.
- [ ] Tes `node --test` untuk `srs.js` dan normalisasi romaji.

### Fase 1 — MVP

- [ ] F1 halaman Kana.
- [ ] `vocab-n5.json` ±300 kata (10 tema di §8) + schema; F2 halaman Kosakata.
- [ ] F3 Flashcard SRS.
- [ ] F4 Kuis.
- [ ] F5 Progres, pengaturan, ekspor/impor/reset.
- [ ] Beranda: lanjutkan belajar, review hari ini, streak, jalur belajar.
- [ ] SEO dasar, `sitemap.xml`, `robots.txt`, favicon & og-image sederhana (SVG).
- [ ] `CONTRIBUTING.md`, `ATTRIBUTION.md`, template issue, workflow `validate-data.yml` dan `deploy.yml`.

### Cara kerja

1. Buat rencana singkat dulu, lalu kerjakan per checklist di atas; commit setelah setiap item selesai.
2. Setelah setiap halaman selesai, jalankan `npm run dev` (atau build + `npx serve`) dan periksa tidak ada error di console.
3. Jika ada keputusan yang tidak tercakup dokumen ini, pilih opsi paling sederhana yang konsisten dengan §2, lalu catat di bagian "Catatan keputusan" di `README.md`.
4. Di akhir Fase 1, laporkan: apa yang selesai, apa yang belum, dan hasil cek terhadap acceptance criteria §7.

### Definition of Done (per fitur)

- Memenuhi acceptance criteria di §7.
- Responsif di 360px, 768px, 1280px; mode terang & gelap terbaca.
- Bisa dioperasikan dengan keyboard.
- Tidak ada error di console; tes `node --test` lulus.

---

## 15. Masih terbuka (jangan diblokir oleh ini)

- Domain situs belum ditentukan → pakai URL GitHub Pages dulu; simpan base URL di satu konstanta/config agar mudah diganti.
- Validator materi belum ditentukan → tandai materi dengan `"reviewed": false` opsional bila perlu, jangan menunda pengerjaan.
