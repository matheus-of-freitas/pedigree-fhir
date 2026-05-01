import { expect, test } from '@playwright/test';

test('demo loads, renders both theme variants, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'pedigree-fhir demo' })).toBeVisible();

  // Two SVG pedigrees — one per theme variant.
  const svgs = page.locator('main svg');
  await expect(svgs).toHaveCount(2);

  // Each SVG renders the proband + family tree (≥9 individuals = 9 nodes).
  for (const svg of await svgs.all()) {
    const nodeCount = await svg.locator('g[transform^="translate"]').count();
    expect(nodeCount).toBeGreaterThanOrEqual(9);
  }

  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0);
});
