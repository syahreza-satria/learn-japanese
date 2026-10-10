# Atribusi

## Kode

Kode Manabii dilisensikan di bawah [MIT](LICENSE).

## Perangkat lunak pihak ketiga

| Nama | Lisensi | Sumber |
| ---- | ------- | ------ |
| Next.js, React | MIT | https://nextjs.org · https://react.dev |
| Bootstrap 5.3, react-bootstrap | MIT | https://getbootstrap.com · https://react-bootstrap.github.io |
| Bootstrap Icons 1.11 | MIT | https://icons.getbootstrap.com |
| Noto Serif JP, Noto Sans JP (Google Fonts, CDN) | SIL Open Font License 1.1 | https://fonts.google.com/noto |
| Inter | SIL Open Font License 1.1 | https://rsms.me/inter |

## Layanan online

- Suara cadangan memakai endpoint TTS Google Translate (tidak resmi, tanpa jaminan layanan). Hanya dipakai bila perangkat tidak punya voice Jepang.

## Materi pelajaran

- Daftar kana (Hiragana & Katakana), contoh kata, kosakata, kanji (arti, bacaan, contoh), pola tata bahasa, terjemahan, dan contoh kalimat di `data/` (selain `strokes.json`) ditulis sendiri untuk proyek ini dan dirilis di bawah lisensi yang sama dengan kode (MIT). Daftar kosakata mengikuti cakupan umum level JLPT N5, tetapi **bukan** salinan dari daftar resmi mana pun.
- Materi belum ditinjau penutur asli (`"reviewed": false`). Koreksi sangat diharapkan; lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## Data goresan (KanjiVG)

- `data/strokes.json` memuat path goresan kana dan kanji yang diturunkan dari **KanjiVG** (http://kanjivg.tagaini.net), © 2009–2011 Ulrich Apel, dilisensikan [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Koordinat dibulatkan ke satu desimal; berkas turunan ini mengikuti lisensi yang sama (BY-SA).
