"use client";
import { useEffect } from "react";
import { useSettings } from "@/lib/hooks";
import { applyTheme } from "@/lib/theme";

/** Menjaga atribut data-bs-theme sesuai pengaturan, termasuk saat preferensi OS berubah. */
export default function ThemeSync() {
  const [settings, ready] = useSettings();
  useEffect(() => {
    if (!ready) return undefined;
    applyTheme(settings.theme);
    if (settings.theme !== "auto") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("auto");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [settings.theme, ready]);
  return null;
}
