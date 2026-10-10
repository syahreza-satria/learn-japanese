import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/styles/theme.css";
import "@/styles/components.css";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ThemeSync from "@/components/ThemeSync";
import ToastHost from "@/components/ToastHost";
import { SITE } from "@/lib/config";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@600&display=swap";

// Dijalankan sebelum render: tema (tanpa kilatan) + font Google yang tidak memblokir render.
const INIT_SCRIPT = `(function(){var t="auto";try{var s=JSON.parse(localStorage.getItem("manabii:v1:settings")||"{}");if(s&&s.theme)t=s.theme}catch(e){}
if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}
document.documentElement.setAttribute("data-bs-theme",t);
var l=document.createElement("link");l.rel="stylesheet";l.href=${JSON.stringify(FONTS_URL)};document.head.appendChild(l)})();`;

export const metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: { default: "Manabii (まなび) — Belajar Bahasa Jepang N5 Gratis", template: "%s — Manabii" },
  description:
    "Belajar bahasa Jepang dari nol sampai JLPT N5 secara gratis: Hiragana, Katakana, kosakata, flashcard SRS, dan kuis. Tanpa akun.",
};

export const viewport = { themeColor: "#f7f3ea" };

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
        <noscript>
          <link rel="stylesheet" href={FONTS_URL} />
        </noscript>
      </head>
      <body>
        <a className="skip-link" href="#main">
          Lewati ke konten
        </a>
        <Navbar />
        <main id="main" className="mb-main">
          <div className="container">{children}</div>
        </main>
        <Footer />
        <ToastHost />
        <ThemeSync />
      </body>
    </html>
  );
}
