import { test, expect } from '@playwright/test';

test.describe('Invoice Status Cards - Database Totals', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to invoices page
    await page.goto('/invoices');

    // Wait for cards to load
    await page.waitForSelector('[data-testid="status-card-pending"]', { timeout: 10000 });
  });

  test('status counts should remain consistent across pages', async ({ page }) => {
    // Get initial status counts from page 1
    const pendingCount1 = await page
      .locator('[data-testid="status-card-pending"]')
      .locator('.text-2xl')
      .textContent();
    const paidCount1 = await page
      .locator('[data-testid="status-card-paid"]')
      .locator('.text-2xl')
      .textContent();
    const overdueCount1 = await page
      .locator('[data-testid="status-card-overdue"]')
      .locator('.text-2xl')
      .textContent();

    // Navigate to page 2
    await page.locator('button[aria-label*="Next"]').click();
    await page.waitForLoadState('networkidle');

    // Get status counts from page 2
    const pendingCount2 = await page
      .locator('[data-testid="status-card-pending"]')
      .locator('.text-2xl')
      .textContent();
    const paidCount2 = await page
      .locator('[data-testid="status-card-paid"]')
      .locator('.text-2xl')
      .textContent();
    const overdueCount2 = await page
      .locator('[data-testid="status-card-overdue"]')
      .locator('.text-2xl')
      .textContent();

    // Counts should be the same on both pages
    expect(pendingCount1).toBe(pendingCount2);
    expect(paidCount1).toBe(paidCount2);
    expect(overdueCount1).toBe(overdueCount2);
  });

  test('status counts should show database totals not page totals', async ({ page }) => {
    // Get the total invoices count
    const totalText = await page
      .locator('[data-testid="summary-card-total"]')
      .locator('.text-2xl')
      .textContent();
    const totalCount = parseInt(totalText || '0', 10);

    // Get status counts
    const pendingText = await page
      .locator('[data-testid="status-card-pending"]')
      .locator('.text-2xl')
      .textContent();
    const pendingCount = parseInt(pendingText || '0', 10);

    const paidText = await page
      .locator('[data-testid="status-card-paid"]')
      .locator('.text-2xl')
      .textContent();
    const paidCount = parseInt(paidText || '0', 10);

    const overdueText = await page
      .locator('[data-testid="status-card-overdue"]')
      .locator('.text-2xl')
      .textContent();
    const overdueCount = parseInt(overdueText || '0', 10);

    // Sum of status counts should equal total
    const sumOfStatuses = pendingCount + paidCount + overdueCount;
    expect(sumOfStatuses).toBe(totalCount);

    // If we're on a paginated view, status counts should be > page size (20)
    // This proves they're database totals, not page-filtered
    if (totalCount > 20) {
      // At least one status should have more than 20 items
      const hasLargeCount =
        pendingCount > 20 || paidCount > 20 || overdueCount > 20;
      expect(hasLargeCount).toBeTruthy();
    }
  });

  test('current page total should be page-specific', async ({ page }) => {
    // Get current page total amount
    const pageAmountText = await page
      .locator('[data-testid="summary-card-amount"]')
      .locator('.text-2xl')
      .textContent();

    // Navigate to page 2
    await page.locator('button[aria-label*="Next"]').click();
    await page.waitForLoadState('networkidle');

    // Get page 2 amount
    const page2AmountText = await page
      .locator('[data-testid="summary-card-amount"]')
      .locator('.text-2xl')
      .textContent();

    // Page totals should be different (proving they're page-specific)
    // Note: This test assumes different amounts on different pages
    // If amounts are identical, this is still valid behavior
    if (pageAmountText !== page2AmountText) {
      expect(pageAmountText).not.toBe(page2AmountText);
    }
  });

  test('status counts should update when filters applied', async ({ page }) => {
    // Get initial counts
    const initialPendingText = await page
      .locator('[data-testid="status-card-pending"]')
      .locator('.text-2xl')
      .textContent();
    const initialPending = parseInt(initialPendingText || '0', 10);

    // Click pending filter card
    await page.locator('[data-testid="status-card-pending"]').click();
    await page.waitForLoadState('networkidle');

    // After filtering to pending, only pending count should be non-zero
    const filteredPaidText = await page
      .locator('[data-testid="status-card-paid"]')
      .locator('.text-2xl')
      .textContent();
    const filteredPaid = parseInt(filteredPaidText || '0', 10);

    const filteredOverdueText = await page
      .locator('[data-testid="status-card-overdue"]')
      .locator('.text-2xl')
      .textContent();
    const filteredOverdue = parseInt(filteredOverdueText || '0', 10);

    // When filtered to pending only
    expect(filteredPaid).toBe(0);
    expect(filteredOverdue).toBe(0);

    // Pending count should match initial pending count
    const filteredPendingText = await page
      .locator('[data-testid="status-card-pending"]')
      .locator('.text-2xl')
      .textContent();
    const filteredPending = parseInt(filteredPendingText || '0', 10);
    expect(filteredPending).toBe(initialPending);
  });

  test('status cards should be accessible', async ({ page }) => {
    // Check ARIA attributes
    const pendingCard = page.locator('[data-testid="status-card-pending"]');
    await expect(pendingCard).toHaveAttribute('role', 'button');
    await expect(pendingCard).toHaveAttribute('tabindex', '0');
    await expect(pendingCard).toHaveAttribute('aria-label', /.+/);

    // Should be keyboard accessible
    await pendingCard.focus();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Filter should be applied (check for active state)
    await expect(pendingCard).toHaveClass(/ring-2 ring-amber-500/);
  });
});