import { expect, test } from '@playwright/test';

test('docsite architecture page renders Mermaid diagrams', async ({ page }) => {
  await page.goto('/docs/architecture');

  await expect(page.getByRole('heading', { name: 'Architecture', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Layer map' })).toBeVisible();
  await expect(page.locator('.docusaurus-mermaid-container')).toHaveCount(3);
  await expect(page.locator('.docusaurus-mermaid-container svg')).toHaveCount(3);
  await expect(page.locator('pre code.language-mermaid')).toHaveCount(0);
});
