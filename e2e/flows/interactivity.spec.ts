import { expect, test } from '@playwright/test';

test.describe('selection', () => {
  test('clicking a node selects it; clicking again deselects', async ({ page }) => {
    await page.goto(
      'http://localhost:6006/iframe.html?id=interactivity-selection--click-to-select&viewMode=story&globals=theme:minimal',
    );
    const proband = page.getByTestId('node-proband');
    await proband.waitFor({ state: 'visible' });
    await expect(proband).toHaveAttribute('aria-pressed', 'false');

    await proband.click();
    await expect(proband).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('selection-readout')).toContainText('proband');

    await proband.click();
    await expect(proband).toHaveAttribute('aria-pressed', 'false');
  });

  test('selecting a different node moves the selection', async ({ page }) => {
    await page.goto(
      'http://localhost:6006/iframe.html?id=interactivity-selection--click-to-select&viewMode=story&globals=theme:minimal',
    );
    await page.getByTestId('node-proband').click();
    await page.getByTestId('node-mother').click();
    await expect(page.getByTestId('node-proband')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('node-mother')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('selection-readout')).toContainText('mother');
  });

  test('Enter and Space activate selection via keyboard', async ({ page }) => {
    await page.goto(
      'http://localhost:6006/iframe.html?id=interactivity-selection--click-to-select&viewMode=story&globals=theme:minimal',
    );
    const father = page.getByTestId('node-father');
    await father.focus();
    await page.keyboard.press('Enter');
    await expect(father).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press(' ');
    await expect(father).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('compact mode', () => {
  test('hiding maternal aunts/uncles reduces node count', async ({ page }) => {
    await page.goto(
      'http://localhost:6006/iframe.html?id=interactivity-compact-mode--toggle-aunts-uncles&viewMode=story&globals=theme:minimal',
    );
    await page.getByTestId('node-proband').waitFor({ state: 'visible' });
    const before = await page.locator('g[data-testid^="node-"]').count();
    await page.getByTestId('toggle-maternal').click();
    await expect(page.getByTestId('toggle-maternal')).toHaveAttribute('aria-pressed', 'true');
    const after = await page.locator('g[data-testid^="node-"]').count();
    expect(after).toBeLessThan(before);
    expect(page.getByTestId('node-maunt')).toHaveCount(0);
  });

  test('toggling both sides hides all aunts/uncles', async ({ page }) => {
    await page.goto(
      'http://localhost:6006/iframe.html?id=interactivity-compact-mode--toggle-aunts-uncles&viewMode=story&globals=theme:minimal',
    );
    await page.getByTestId('toggle-maternal').click();
    await page.getByTestId('toggle-paternal').click();
    await expect(page.getByTestId('node-maunt')).toHaveCount(0);
    await expect(page.getByTestId('node-puncle')).toHaveCount(0);
    // Direct parents still rendered.
    await expect(page.getByTestId('node-mother')).toHaveCount(1);
    await expect(page.getByTestId('node-father')).toHaveCount(1);
  });
});
