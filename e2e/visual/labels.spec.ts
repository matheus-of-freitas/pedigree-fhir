import { expect, test } from '@playwright/test';

test('relative labels wrap without overlapping nearby nodes', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?id=editing-add-relative--add-sibling-or-child-with-relative-labels&viewMode=story&globals=theme:minimal',
  );

  await expect(page).toHaveScreenshot('relative-labels-wrapped.png', { fullPage: true });
});
