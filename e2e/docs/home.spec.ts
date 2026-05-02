import { expect, test } from '@playwright/test';

test('docsite home links guides, api reference, and Storybook playground', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Parse pedigree-aware FHIR/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Read the docs' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Storybook' })).toHaveAttribute(
    'href',
    'http://localhost:6006',
  );

  await page.getByRole('link', { name: 'Read the docs' }).click();
  await expect(page).toHaveURL(/\/docs\/intro$/);
  await expect(page.getByRole('heading', { name: 'Introduction' })).toBeVisible();

  await page.goto('/docs/api');
  await expect(page.getByRole('heading', { name: 'pedigree-fhir' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'core/src', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'react/src', exact: true })).toBeVisible();
});
