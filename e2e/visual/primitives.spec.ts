import { expect, test } from '@playwright/test';

const stories = [
  { id: 'primitives-pedigree--default', name: 'pedigree' },
  { id: 'primitives-node--render-prop', name: 'node' },
  { id: 'primitives-edge--styled-partner-line', name: 'edge' },
  { id: 'primitives-sibship--parent-drops', name: 'sibship' },
];

for (const story of stories) {
  test(`primitive: ${story.name}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:minimal`);
    await page.locator('#storybook-root *').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot(`${story.name}.png`, { fullPage: true });
  });
}
