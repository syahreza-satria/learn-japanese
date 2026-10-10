/* Dijalankan sebelum render (script klasik di <head>) agar tidak ada kilatan tema. */
(function () {
  var theme = "auto";
  try {
    var stored = JSON.parse(localStorage.getItem("manabii:v1:settings") || "{}");
    if (stored && stored.theme) theme = stored.theme;
  } catch (e) {}
  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-bs-theme", theme);
})();
