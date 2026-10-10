// Tes end-to-end lintas browser (Chromium, Firefox, WebKit/Safari, emulasi Android & iPhone).
// Jalankan setelah `npm run build`:  npx playwright test
import { expect, test } from "@playwright/test";

const PAGES = [
  ["", "Belajar bahasa Jepang"],
  ["kana", "Hiragana"],
  ["kanji", "Kanji N5"],
  ["kosakata", "Kosakata N5"],
  ["tata-bahasa", "Tata bahasa N5"],
  ["flashcard", "Flashcard"],
  ["kuis", "Kuis"],
  ["progres", "Progres"],
];

const storage = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(`manabii:v1:${k}`)), key);
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.beforeEach(async ({ page }) => {
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) page.problems.push(m.text());
  });
});
test.afterEach(async ({ page }) => expect(page.problems, "error di console").toEqual([]));

for (const [path, title] of PAGES) {
  test(`halaman /${path} termuat tanpa error & tanpa scroll horizontal`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1").first()).toContainText(title);
    expect(await noHScroll(page)).toBe(true);
  });
}

test("kana: pilih sel, animasi goresan, toggle romaji", async ({ page }) => {
  await page.goto("kana");
  await page.getByRole("button", { name: "か, ka" }).click();
  await expect(page.locator("#kanaPreview .mb-kana-big")).toHaveText("か");
  await expect(page.locator(".mb-stroke-draw")).toHaveCount(3);
  await page.getByLabel("Tampilkan romaji").uncheck();
  await expect(page.locator("#kanaGrid")).toHaveClass(/mb-hide-romaji/);
});

test("kanji: detail & jumlah goresan, cari, favorit", async ({ page }) => {
  await page.goto("kanji");
  await page.getByRole("button", { name: /^語/ }).click();
  await expect(page.locator(".mb-stroke-draw")).toHaveCount(14);
  await page.getByLabel("Cari kanji").fill("sungai");
  await expect(page.locator(".mb-kanji-cell")).toHaveCount(1);
  await page.locator(".mb-kanji-cell").click();
  await page.locator(".mb-kanji-detail").getByRole("button", { name: /favorit/i }).click();
  expect((await storage(page, "favorites")).length).toBe(1);
});

test("kosakata: cari, filter tema, tambah ke flashcard", async ({ page }) => {
  await page.goto("kosakata?theme=sekolah");
  expect(await page.locator(".mb-word-row").count()).toBeGreaterThan(30);
  await page.getByLabel("Cari kata").fill("gakusei");
  await expect(page.locator(".mb-word-row ruby rt").first()).toHaveText("がくせい");
  await page.locator(".mb-word-row").first().getByRole("button", { name: /^Tambahkan/ }).click();
  expect(Object.keys(await storage(page, "srs")).length).toBe(1);
});

test("tata bahasa: latihan isian", async ({ page }) => {
  await page.goto("tata-bahasa");
  await page.locator(".accordion-button").first().click();
  await page.locator(".accordion-body").first().getByRole("button", { name: "は", exact: true }).click();
  await expect(page.locator(".accordion-body [role=status]").first()).toHaveText("Benar!");
});

test("flashcard: balik, nilai, jadwal SRS tersimpan", async ({ page }) => {
  await page.goto("flashcard?deck=hiragana");
  await expect(page.getByText("Sisa 20 kartu")).toBeVisible();
  await page.getByRole("button", { name: /Balik kartu/ }).click();
  await page.getByRole("button", { name: /Bisa/ }).click();
  const srs = await storage(page, "srs");
  expect(srs["h-a"]).toMatchObject({ interval: 1, reps: 1 });
});

test("kuis: sesi pilihan ganda sampai hasil + riwayat", async ({ page }) => {
  await page.goto("kuis?source=hiragana&row=a&mode=mc&count=10");
  for (let i = 0; i < 5; i += 1) {
    await page.locator(".mb-choice").first().click();
    await page.getByRole("button", { name: /Lanjut|Lihat hasil/ }).click();
  }
  await expect(page.getByRole("dialog")).toContainText("/ 5");
  expect((await storage(page, "quizHistory"))[0]).toMatchObject({ source: "hiragana", total: 5 });
});

test("progres: ekspor/impor/reset data", async ({ page }) => {
  await page.goto("kosakata?theme=salam");
  await page.getByRole("button", { name: /kata ke flashcard/ }).click();
  await page.goto("progres");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Ekspor data/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/^manabii-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await page.getByRole("button", { name: /Reset semua data/ }).click();
  await page.getByRole("button", { name: "Ya, hapus semua" }).click();
  await expect.poll(() => storage(page, "srs")).toBeNull();
});

test("navigasi: tautan menu bekerja (desktop) / offcanvas (mobile)", async ({ page, isMobile }) => {
  await page.goto("");
  if (isMobile) {
    await page.getByRole("button", { name: "Buka menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Kanji", exact: true }).click();
  } else {
    await page.getByRole("navigation").getByRole("link", { name: "Kanji", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/kanji$/);
  await expect(page.locator("h1")).toContainText("Kanji N5");
});

test("mode gelap tersimpan & diterapkan", async ({ page }) => {
  await page.goto("progres");
  await page.getByText("Gelap", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  expect((await storage(page, "settings")).theme).toBe("dark");
});

test("PWA: service worker aktif dan halaman terbuka offline", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Service worker di WebKit headless tidak stabil untuk tes offline");
  await page.goto("");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith("manabii-")))).toBe(true);
  await context.setOffline(true);
  await page.goto("kanji");
  await expect(page.locator("h1")).toContainText("Kanji N5");
  await expect(page.locator(".mb-stroke-draw").first()).toBeAttached();
  await context.setOffline(false);
});
