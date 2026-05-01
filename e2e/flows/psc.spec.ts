import { expect, test } from '@playwright/test';

const SB = 'http://localhost:6006';

test.describe('PSC layout polish', () => {
  test('renders consanguinity, twin junctions, pregnancy outcomes, and adoption markers', async ({
    page,
  }) => {
    await page.goto(
      `${SB}/iframe.html?id=psc-layout-polish--full-psc-polish&viewMode=story&globals=theme:minimal`,
    );

    await expect(page.locator('[data-consanguineous="true"]')).toBeVisible();
    await expect(page.locator('[data-twin-junctions="1"]')).toBeVisible();
    await expect(page.getByTestId('node-miscarriage')).toHaveAttribute('data-vital', 'miscarriage');
    await expect(page.getByTestId('node-stillbirth')).toHaveAttribute('data-vital', 'stillbirth');
    await expect(page.getByTestId('node-termination')).toHaveAttribute(
      'data-vital',
      'terminatedPregnancy',
    );
    await expect(page.getByTestId('node-maunt')).toHaveAttribute('data-adopted', 'adoptedIn');
    await expect(page.getByTestId('node-puncle')).toHaveAttribute('data-adopted', 'adoptedOut');
  });
});
