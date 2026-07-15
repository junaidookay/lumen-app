import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { name: "landing", path: "/" },
  { name: "home", path: "/home" },
  { name: "discover", path: "/discover" },
  { name: "search", path: "/search" },
  { name: "install", path: "/install" },
];

for (const { name, path } of PAGES) {
  test.describe(`Accessibility: ${name}`, () => {
    test(`axe audit passes`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test(`keyboard navigation works`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      // Tab through interactive elements
      const focusableElements = await page.locator(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      const count = await focusableElements.count();
      if (count > 0) {
        // Focus first element
        await page.keyboard.press("Tab");
        const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
        expect(firstFocused).toBeTruthy();
      }
    });

    test(`has no focus-visible issues`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });

      // Check that focused elements have visible outlines
      await page.keyboard.press("Tab");
      const hasFocusStyles = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return true;
        const styles = window.getComputedStyle(el);
        return (
          styles.outlineStyle !== "none" ||
          styles.boxShadow !== "none" ||
          el.hasAttribute("data-focus-visible")
        );
      });
      expect(hasFocusStyles).toBe(true);
    });
  });
}
