// Tema terang/gelap: resolusi dari pengaturan (auto mengikuti prefers-color-scheme).
export function resolveTheme(setting) {
  if (setting === "dark" || setting === "light") return setting;
  const dark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return dark ? "dark" : "light";
}

export function applyTheme(setting) {
  const theme = resolveTheme(setting);
  document.documentElement.setAttribute("data-bs-theme", theme);
  return theme;
}
