import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "landing", path: "/" },
  { name: "home", path: "/home" },
  { name: "discover", path: "/discover" },
  { name: "search", path: "/search" },
  { name: "install", path: "/install" },
];

for (const { name, path } of PAGES) {
  test.describe(`Visual regression: ${name}`, () => {
    test(`desktop screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page).toHaveScreenshot(`${name}-desktop.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });

    test(`mobile screenshot`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page).toHaveScreenshot(`${name}-mobile.png`, {
        maxDiffPixelRatio: 0.01,
      });
    });
  });
}
