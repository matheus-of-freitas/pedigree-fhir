import { expect, test } from '@playwright/test';

test('psc layout polish', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=psc-layout-polish--full-psc-polish&viewMode=story&globals=theme:minimal',
  );
  await page.locator('svg').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await expect(page).toHaveScreenshot('psc-layout-polish.png', { fullPage: true });
});
