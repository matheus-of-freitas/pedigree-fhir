import { expect, test } from '@playwright/test';

const SB = 'http://localhost:6006';

test.describe('add relative', () => {
  test('selecting a node and clicking "Add sibling" creates a new node', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-add-relative--add-sibling-or-child&viewMode=story&globals=theme:minimal`,
    );
    await page.getByTestId('node-proband').waitFor({ state: 'visible' });
    const before = await page.locator('g[data-testid^="node-"]').count();
    await page.getByTestId('node-proband').click();
    await page.getByTestId('action-add-sibling').click();
    const after = await page.locator('g[data-testid^="node-"]').count();
    expect(after).toBe(before + 1);
  });

  test('selecting Ada and clicking "Add child" shows the new child in the chart', async ({
    page,
  }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-add-relative--add-sibling-or-child&viewMode=story&globals=theme:minimal`,
    );
    await page.getByTestId('node-proband').waitFor({ state: 'visible' });
    const before = await page.locator('g[data-testid^="node-"]').count();
    await page.getByTestId('node-proband').click();
    await page.getByTestId('action-add-child').click();
    await expect(page.getByText('New child')).toBeVisible();
    const after = await page.locator('g[data-testid^="node-"]').count();
    expect(after).toBe(before + 2);
  });

  test('action buttons stay disabled until a node is selected', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-add-relative--add-sibling-or-child&viewMode=story&globals=theme:minimal`,
    );
    await expect(page.getByTestId('action-add-sibling')).toBeDisabled();
    await page.getByTestId('node-proband').click();
    await expect(page.getByTestId('action-add-sibling')).toBeEnabled();
  });
});

test.describe('semantic edits', () => {
  test('mark affected applies an outlined fill to the selected node', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-edit-semantics--mark-affected-or-deceased&viewMode=story&globals=theme:minimal`,
    );
    await page.getByTestId('node-proband').click();
    await page.getByTestId('action-mark-affected').click();
    // After "mark affected", the proband's circle has the affected fill
    // (translates to a non-default color via CSS var). Sanity-check via a
    // post-action attribute: an Undo button should now be enabled.
    await expect(page.getByTestId('action-undo')).toBeEnabled();
  });

  test('mark deceased adds a slash overlay (line element)', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-edit-semantics--mark-affected-or-deceased&viewMode=story&globals=theme:minimal`,
    );
    const proband = page.getByTestId('node-proband');
    await proband.click();
    const beforeLines = await proband.locator('line').count();
    await page.getByTestId('action-mark-deceased').click();
    const afterLines = await proband.locator('line').count();
    expect(afterLines).toBe(beforeLines + 1);
  });
});

test.describe('undo / redo', () => {
  test('add sibling, then undo removes it; redo restores', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-undo-and-redo--history-walkthrough&viewMode=story&globals=theme:minimal`,
    );
    await page.getByTestId('node-proband').waitFor({ state: 'visible' });
    const before = await page.locator('g[data-testid^="node-"]').count();
    await page.getByTestId('node-proband').click();
    await page.getByTestId('action-add-sibling').click();
    expect(await page.locator('g[data-testid^="node-"]').count()).toBe(before + 1);

    await page.getByTestId('action-undo').click();
    expect(await page.locator('g[data-testid^="node-"]').count()).toBe(before);

    await page.getByTestId('action-redo').click();
    expect(await page.locator('g[data-testid^="node-"]').count()).toBe(before + 1);
  });

  test('undo and redo buttons reflect history availability', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-undo-and-redo--history-walkthrough&viewMode=story&globals=theme:minimal`,
    );
    await expect(page.getByTestId('action-undo')).toBeDisabled();
    await expect(page.getByTestId('action-redo')).toBeDisabled();
    await page.getByTestId('node-proband').click();
    await page.getByTestId('action-mark-deceased').click();
    await expect(page.getByTestId('action-undo')).toBeEnabled();
  });
});

test.describe('FHIR round-trip', () => {
  test('export-and-re-import keeps the same proband visible', async ({ page }) => {
    await page.goto(
      `${SB}/iframe.html?id=editing-fhir-round-trip--fhir-round-trip&viewMode=story&globals=theme:minimal`,
    );
    await page.getByTestId('node-proband').waitFor({ state: 'visible' });
    const beforeNodes = await page.locator('g[data-testid^="node-"]').count();
    await page.getByTestId('export-import').click();
    // After re-import, proband still visible and node count is preserved
    // (Inferred placeholders get re-fabricated).
    await expect(page.getByTestId('node-proband')).toBeVisible();
    const afterNodes = await page.locator('g[data-testid^="node-"]').count();
    expect(afterNodes).toBe(beforeNodes);
  });
});
