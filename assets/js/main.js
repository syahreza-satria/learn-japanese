// Init bersama untuk semua halaman. Modul fitur diimpor terpisah oleh tiap halaman.
import { renderLayout } from "./core/ui.js";
import { initTts } from "./core/tts.js";

renderLayout(document.body.dataset.page);
initTts();
