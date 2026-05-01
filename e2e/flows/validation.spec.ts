import { expect, test } from '@playwright/test';

const SB = 'http://localhost:6006';

test.describe('validation diagnostics', () => {
  test('incomplete family history surfaces warnings and errors', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=validation-diagnostics--incomplete-family-history&viewMode=story&globals=theme:minimal`,
    );

    await expect(page.getByTestId('validation-panel')).toBeVisible();
    await expect(page.getByTestId('diagnostic-count')).not.toHaveText('0');
    await expect(page.getByTestId('input-diagnostic-count')).toHaveText('0');
    await expect(page.getByTestId('graph-diagnostic-count')).not.toHaveText('0');
    await expect(page.getByTestId('diagnostic-consistency-sex-mismatch')).toBeVisible();
    await expect(page.getByTestId('diagnostic-completeness-parent-inferred')).toBeVisible();
  });

  test('complete family history has no diagnostics', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=validation-diagnostics--complete-family-history&viewMode=story&globals=theme:minimal`,
    );

    await expect(page.getByTestId('diagnostic-count')).toHaveText('0');
    await expect(page.getByTestId('diagnostic-empty')).toBeVisible();
  });

  test('malformed source data surfaces raw input diagnostics', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=validation-diagnostics--malformed-source-data&viewMode=story&globals=theme:minimal`,
    );

    await expect(page.getByTestId('validation-panel')).toBeVisible();
    await expect(page.getByTestId('input-diagnostic-count')).not.toHaveText('0');
    await expect(
      page.getByTestId('input-diagnostic-input-fmh-patient-reference-mismatch'),
    ).toBeVisible();
    await expect(page.getByTestId('input-diagnostic-input-parent-reference-missing')).toBeVisible();
    await expect(page.getByTestId('input-diagnostic-input-sibling-reference-self')).toBeVisible();
  });
});
