// Layout bersama (navbar, footer), tema, toast, dan helper render.
import { SITE } from "./config.js";
import { getSettings, updateSettings } from "./storage.js";

const NAV_ITEMS = [
  { page: "home", href: "index.html", label: "Beranda" },
  { page: "kana", href: "kana.html", label: "Kana" },
  { page: "vocab", href: "kosakata.html", label: "Kosakata" },
  { page: "flashcard", href: "flashcard.html", label: "Flashcard" },
  { page: "quiz", href: "kuis.html", label: "Kuis" },
  { page: "progress", href: "progres.html", label: "Progres" },
];

// ---- Helper render -------------------------------------------------------------

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Teks Jepang dengan furigana (`<ruby>`) bila `word` memuat kanji. */
export function japaneseHtml(word, kana) {
  if (word && kana && word !== kana) {
    return `<ruby lang="ja">${escapeHtml(word)}<rp>(</rp><rt>${escapeHtml(kana)}</rt><rp>)</rp></ruby>`;
  }
  return `<span lang="ja">${escapeHtml(kana || word)}</span>`;
}

export function hankoHtml(char = "済", { round = false } = {}) {
  return `<span class="mb-hanko${round ? " mb-hanko-round" : ""}" lang="ja" aria-hidden="true">${escapeHtml(char)}</span>`;
}

// ---- Tema ----------------------------------------------------------------------

const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

export function resolveTheme(setting = getSettings().theme) {
  if (setting === "dark" || setting === "light") return setting;
  return darkQuery?.matches ? "dark" : "light";
}

export function applyTheme() {
  const theme = resolveTheme();
  document.documentElement.setAttribute("data-bs-theme", theme);
  const toggle = document.getElementById("mbThemeToggle");
  if (toggle) {
    const isDark = theme === "dark";
    toggle.innerHTML = `<i class="bi ${isDark ? "bi-sun" : "bi-moon-stars"}" aria-hidden="true"></i>`;
    toggle.setAttribute("aria-label", isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap");
    toggle.setAttribute("title", isDark ? "Mode terang" : "Mode gelap");
  }
}

// ---- Toast & modal -------------------------------------------------------------

const TOAST_STYLES = {
  info: "text-bg-secondary",
  success: "text-bg-success",
  warning: "text-bg-warning",
  danger: "text-bg-danger",
};

export function showToast(message, { type = "info", delay = 4500 } = {}) {
  let container = document.getElementById("mbToasts");
  if (!container) {
    container = document.createElement("div");
    container.id = "mbToasts";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.append(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 ${TOAST_STYLES[type] ?? TOAST_STYLES.info}`;
  toast.setAttribute("role", type === "danger" || type === "warning" ? "alert" : "status");
  toast.setAttribute("aria-live", "polite");
  toast.innerHTML = `<div class="d-flex"><div class="toast-body"></div>
    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
  toast.querySelector(".toast-body").textContent = message;
  container.append(toast);
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  if (window.bootstrap) window.bootstrap.Toast.getOrCreateInstance(toast, { delay }).show();
  else toast.classList.add("show");
}

export function showModal(element) {
  window.bootstrap.Modal.getOrCreateInstance(element).show();
}

export function hideModal(element) {
  window.bootstrap.Modal.getOrCreateInstance(element).hide();
}

// ---- Layout ----------------------------------------------------------------------

function navbarHtml(activePage) {
  const links = NAV_ITEMS.map(
    ({ page, href, label }) =>
      `<li class="nav-item"><a class="nav-link${page === activePage ? " active" : ""}" href="${href}"${
        page === activePage ? ' aria-current="page"' : ""
      }>${label}</a></li>`,
  ).join("");

  return `
<nav class="navbar navbar-expand-md mb-navbar sticky-top" aria-label="Navigasi utama">
  <div class="container">
    <a class="navbar-brand mb-brand" href="index.html">
      <span class="mb-brand-mark" lang="ja" aria-hidden="true">学</span><span>Manabii</span>
    </a>
    <div class="ms-auto ms-md-0 order-md-last d-flex align-items-center gap-1">
      <button type="button" class="btn btn-outline-secondary border-0" id="mbThemeToggle"></button>
      <button class="navbar-toggler border-0 d-md-none" type="button" data-bs-toggle="offcanvas"
        data-bs-target="#mbMenu" aria-controls="mbMenu" aria-label="Buka menu">
        <span class="navbar-toggler-icon"></span>
      </button>
    </div>
    <div class="offcanvas offcanvas-end flex-grow-1" tabindex="-1" id="mbMenu" aria-labelledby="mbMenuLabel">
      <div class="offcanvas-header">
        <span class="offcanvas-title mb-brand" id="mbMenuLabel"><span lang="ja">まなび</span> Manabii</span>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Tutup menu"></button>
      </div>
      <div class="offcanvas-body">
        <ul class="navbar-nav ms-md-3 flex-grow-1">${links}</ul>
      </div>
    </div>
  </div>
</nav>`;
}

function footerHtml() {
  return `
<div class="container py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
  <div><span class="mb-serif">Manabii <span lang="ja">まなび</span></span> — belajar bahasa Jepang N5, gratis &amp; open source (MIT).</div>
  <div class="d-flex flex-wrap gap-3">
    <a href="${SITE.githubUrl}" rel="noopener"><i class="bi bi-github" aria-hidden="true"></i> GitHub</a>
    <a href="${SITE.githubUrl}/blob/main/ATTRIBUTION.md" rel="noopener">Atribusi materi</a>
    <span>Progres tersimpan di browser Anda.</span>
  </div>
</div>`;
}

/** Sisipkan navbar + footer ke placeholder halaman dan aktifkan tema. */
export function renderLayout(activePage) {
  const header = document.getElementById("mb-header");
  const footer = document.getElementById("mb-footer");
  if (header) header.innerHTML = navbarHtml(activePage);
  if (footer) footer.innerHTML = footerHtml();

  applyTheme();
  document.getElementById("mbThemeToggle")?.addEventListener("click", () => {
    updateSettings({ theme: resolveTheme() === "dark" ? "light" : "dark" });
    applyTheme();
  });
  darkQuery?.addEventListener?.("change", () => {
    if (getSettings().theme === "auto") applyTheme();
  });
  window.addEventListener("mb:storage-error", () =>
    showToast("Penyimpanan browser tidak tersedia. Progres hanya tersimpan selama halaman terbuka.", {
      type: "warning",
      delay: 8000,
    }),
  );
}

/** Tampilkan pesan galat pemuatan data di dalam container. */
export function showLoadError(container, error) {
  console.error(error);
  container.innerHTML = `<div class="alert alert-danger" role="alert">
    Gagal memuat materi. Jika membuka file langsung (<code>file://</code>), jalankan lewat static server
    (<code>npx serve .</code>) lalu muat ulang halaman.</div>`;
}
