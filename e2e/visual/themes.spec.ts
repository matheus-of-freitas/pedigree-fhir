import { expect, test } from '@playwright/test';

const themes = [
  { id: 'themes-minimal-css--default', name: 'minimal' },
  { id: 'themes-tailwind-shadcn--default', name: 'tailwind' },
  { id: 'themes-mantine--default', name: 'mantine' },
  { id: 'themes-radix-themes--default', name: 'radix' },
];

for (const theme of themes) {
  test(`theme: ${theme.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${theme.id}&viewMode=story`);
    // Wait for the SVG to render (the layout has at least one path).
    await page.locator('svg').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200); // tiny settle to absorb font loading
    await expect(page).toHaveScreenshot(`${theme.name}.png`, { fullPage: true });
  });
}
