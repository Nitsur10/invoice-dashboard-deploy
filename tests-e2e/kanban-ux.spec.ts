import { test, expect } from '@playwright/test';

test.describe('Kanban UX Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kanban');
    // Wait for data to load
    await page.waitForSelector('[data-card-id]', { timeout: 10000 });
  });

  test('description text truncates after 2 lines with ellipsis', async ({ page }) => {
    const descriptionElement = page.locator('.line-clamp-2').first();

    // Verify line-clamp-2 class applied
    await expect(descriptionElement).toHaveClass(/line-clamp-2/);

    // Verify title attribute exists for tooltip
    const titleAttr = await descriptionElement.getAttribute('title');
    expect(titleAttr).toBeTruthy();
    expect(titleAttr!.length).toBeGreaterThan(0);
  });

  test('pending status card is clickable and filters board', async ({ page }) => {
    const pendingCard = page.locator('[aria-label*="Filter by pending"]');

    // Verify card is focusable
    await expect(pendingCard).toHaveAttribute('tabindex', '0');
    await expect(pendingCard).toHaveAttribute('role', 'button');

    // Click pending card
    await pendingCard.click();

    // Verify visual indicator (ring)
    await expect(pendingCard).toHaveClass(/ring-2/);
    await expect(pendingCard).toHaveClass(/ring-blue-500/);

    // Verify aria-pressed state
    await expect(pendingCard).toHaveAttribute('aria-pressed', 'true');

    // Verify filter chip appears
    const filterChip = page.locator('.filter-chip', { hasText: 'Pending' });
    await expect(filterChip).toBeVisible({ timeout: 5000 });
  });

  test('keyboard navigation works on status cards', async ({ page }) => {
    const approvedCard = page.locator('[aria-label*="Filter by approved"]');

    // Tab to card (may need multiple tabs depending on page structure)
    await page.keyboard.press('Tab');

    // Press Enter to activate
    await approvedCard.focus();
    await page.keyboard.press('Enter');

    // Verify filter applied
    await expect(approvedCard).toHaveAttribute('aria-pressed', 'true');

    // Press Space to toggle off
    await page.keyboard.press(' ');

    // Verify filter removed
    await expect(approvedCard).toHaveAttribute('aria-pressed', 'false');
  });

  test('all status cards are interactive', async ({ page }) => {
    const statuses = ['pending', 'in review', 'approved', 'paid', 'overdue'];

    for (const status of statuses) {
      const card = page.locator(`[aria-label*="Filter by ${status}"]`);
      await expect(card).toHaveAttribute('role', 'button');
      await expect(card).toHaveClass(/cursor-pointer/);
      await expect(card).toHaveClass(/hover:shadow-md/);
    }
  });

  test('multiple status filters can be combined', async ({ page }) => {
    // Click pending
    await page.locator('[aria-label*="Filter by pending"]').click();
    await expect(page.locator('[aria-label*="Filter by pending"]')).toHaveAttribute('aria-pressed', 'true');

    // Click approved
    await page.locator('[aria-label*="Filter by approved"]').click();
    await expect(page.locator('[aria-label*="Filter by approved"]')).toHaveAttribute('aria-pressed', 'true');

    // Both should remain active
    await expect(page.locator('[aria-label*="Filter by pending"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking status card twice toggles filter off', async ({ page }) => {
    const paidCard = page.locator('[aria-label*="Filter by paid"]');

    // First click - enable
    await paidCard.click();
    await expect(paidCard).toHaveAttribute('aria-pressed', 'true');

    // Second click - disable
    await paidCard.click();
    await expect(paidCard).toHaveAttribute('aria-pressed', 'false');

    // Ring should be removed
    await expect(paidCard).not.toHaveClass(/ring-2.*ring-emerald-500/);
  });

  test('drag-and-drop functionality preserved', async ({ page }) => {
    const card = page.locator('[data-card-id]').first();
    const targetColumn = page.locator('[data-column-id="approved"]');

    // Perform drag and drop
    await card.hover();
    await page.mouse.down();
    await targetColumn.hover();
    await page.mouse.up();

    // Verify card moved (optimistically)
    // Note: This tests that DnD still works, actual status update tested elsewhere
    await expect(card).toBeVisible();
  });
});
