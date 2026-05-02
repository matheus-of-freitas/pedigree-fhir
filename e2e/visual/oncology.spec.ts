import { expect, test } from '@playwright/test';

test('oncology overlay keeps the proband marker clear of the first label line', async ({
  page,
}) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=use-cases-family-cancer-history--oncology-overlay-profile&viewMode=story&globals=theme:minimal',
  );

  await expect(page).toHaveScreenshot('oncology-overlay-proband-clearance.png', { fullPage: true });
});
