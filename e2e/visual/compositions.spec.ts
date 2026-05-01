import { expect, test } from '@playwright/test';

const stories = [
  { id: 'compositions-read-only--full-three-generation', name: 'read-only' },
  { id: 'compositions-partial-graph--maternal-side-only', name: 'partial-graph' },
  { id: 'compositions-proband-only--just-the-proband', name: 'proband-only' },
];

for (const story of stories) {
  test(`composition: ${story.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:minimal`);
    await page.locator('svg').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(`${story.name}.png`, { fullPage: true });
  });
}
