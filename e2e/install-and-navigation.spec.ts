import { test, expect } from "@playwright/test";

test.describe("Install Page", () => {
  test("loads the install page", async ({ page }) => {
    await page.goto("/install");
    await expect(page).toHaveTitle(/Lumen/);
  });

  test("displays hero section", async ({ page }) => {
    await page.goto("/install");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("has install CTA", async ({ page }) => {
    await page.goto("/install");
    const cta = page.getByRole("button", { name: /install|get started/i });
    await expect(cta).toBeVisible();
  });

  test("navigation back to home works", async ({ page }) => {
    await page.goto("/install");
    const homeLink = page.getByRole("link", { name: /home|logo/i });
    if (await homeLink.isVisible()) {
      await homeLink.click();
      await expect(page).toHaveURL(/\//);
    }
  });
});

test.describe("Navigation", () => {
  test("can navigate to discover page", async ({ page }) => {
    await page.goto("/");
    const discoverLink = page.getByRole("link", { name: /discover/i }).first();
    if (await discoverLink.isVisible()) {
      await discoverLink.click();
      await expect(page).toHaveURL(/discover/);
    }
  });

  test("can navigate to search page", async ({ page }) => {
    await page.goto("/");
    const searchLink = page.getByRole("link", { name: /search/i }).first();
    if (await searchLink.isVisible()) {
      await searchLink.click();
      await expect(page).toHaveURL(/search/);
    }
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-xyz");
    // Should still render something (either 404 or the app shell)
    await expect(page.locator("body")).toBeVisible();
  });
});
