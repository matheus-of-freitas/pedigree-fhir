import { expect, test } from '@playwright/test';

test('demo loads, renders theme variants and cancer use case, no console errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'pedigree-fhir demo' })).toBeVisible();

  await expect(
    page.getByRole('heading', { name: 'Use case: family cancer history' }),
  ).toBeVisible();
  await expect(page.getByText('Breast cancer').first()).toBeVisible();
  await expect(page.getByText('Cancer legend')).toBeVisible();
  await expect(page.getByText('Age 47').first()).toBeVisible();
  await expect(page.getByText('Ovarian 45').first()).toBeVisible();

  // Three SVG pedigrees — two generic theme variants plus the cancer-specific use case.
  const svgs = page.locator('main svg');
  await expect(svgs).toHaveCount(3);

  // Each SVG renders the proband + family tree (≥9 individuals = 9 nodes).
  for (const svg of await svgs.all()) {
    const nodeCount = await svg.locator('g[transform^="translate"]').count();
    expect(nodeCount).toBeGreaterThanOrEqual(9);
  }

  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0);
});
