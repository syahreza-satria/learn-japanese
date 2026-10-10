"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import { useSettings } from "@/lib/hooks";
import { updateSettings } from "@/lib/storage";
import { resolveTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/kana", label: "Kana" },
  { href: "/kosakata", label: "Kosakata" },
  { href: "/flashcard", label: "Flashcard" },
  { href: "/kuis", label: "Kuis" },
  { href: "/progres", label: "Progres" },
];

function ThemeToggle() {
  const [settings, ready] = useSettings();
  const [resolved, setResolved] = useState("light");
  useEffect(() => {
    if (ready) setResolved(resolveTheme(settings.theme));
  }, [settings.theme, ready]);
  const isDark = resolved === "dark";
  return (
    <button
      type="button"
      className="btn btn-outline-secondary border-0 mb-theme-toggle"
      onClick={() => updateSettings({ theme: isDark ? "light" : "dark" })}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      title={isDark ? "Mode terang" : "Mode gelap"}
    >
      <i className={`bi ${isDark ? "bi-sun" : "bi-moon-stars"}`} aria-hidden="true" />
    </button>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const links = (onClick) =>
    NAV_ITEMS.map(({ href, label }) => (
      <li className="nav-item" key={href}>
        <Link prefetch={false}
          className={`nav-link${isActive(href) ? " active" : ""}`}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          onClick={onClick}
        >
          {label}
        </Link>
      </li>
    ));

  return (
    <header>
      <nav className="navbar navbar-expand-md mb-navbar sticky-top" aria-label="Navigasi utama">
        <div className="container">
          <Link prefetch={false} className="navbar-brand mb-brand" href="/">
            <span className="mb-brand-mark" lang="ja" aria-hidden="true">
              学
            </span>
            <span>Manabii</span>
          </Link>
          <ul className="navbar-nav flex-row ms-md-3 flex-grow-1 d-none d-md-flex">{links()}</ul>
          <div className="ms-auto d-flex align-items-center gap-1">
            <ThemeToggle />
            <button
              className="navbar-toggler border-0 d-md-none"
              type="button"
              aria-label="Buka menu"
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
            >
              <span className="navbar-toggler-icon" />
            </button>
          </div>
        </div>
      </nav>
      <Offcanvas show={open} onHide={() => setOpen(false)} placement="end" id="mbMenu" className="d-md-none">
        <Offcanvas.Header closeButton closeLabel="Tutup menu">
          <Offcanvas.Title className="mb-brand">
            <span lang="ja">まなび</span> Manabii
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <ul className="navbar-nav mb-navbar">{links(() => setOpen(false))}</ul>
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  );
}
