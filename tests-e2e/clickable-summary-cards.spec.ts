import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Authentication helper
async function ensureAuth(page: Page) {
  await page.request.post('/api/auth/set', {
    data: { event: 'SIGNED_IN', session: { access_token: 'dev', refresh_token: 'dev' } },
  })
}

test.describe('Clickable Summary Cards E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page)
  })

  test.describe('User Workflow - Click to Filter', () => {
    test('SHOULD FAIL: user can click pending card to filter table', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Verify initial state - all invoices visible
      const allRows = page.locator('table tbody tr')
      const initialRowCount = await allRows.count()
      expect(initialRowCount).toBeGreaterThan(2) // Should have mixed statuses

      // Click pending summary card
      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      await expect(pendingCard).toBeVisible()
      await expect(pendingCard).toHaveAttribute('role', 'button')

      await pendingCard.click()

      // Verify card shows active state
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      await expect(pendingCard).toHaveClass(/ring-2/)
      await expect(pendingCard).toHaveClass(/ring-amber-500/)

      // Verify table is filtered
      await page.waitForTimeout(1000) // Allow for filter to apply
      const filteredRows = page.locator('table tbody tr')
      const filteredRowCount = await filteredRows.count()

      // Should show fewer rows (only pending)
      expect(filteredRowCount).toBeLessThan(initialRowCount)

      // All visible rows should be pending status
      const statusCells = page.locator('table tbody tr td:has-text("pending")')
      const statusCount = await statusCells.count()
      expect(statusCount).toBe(filteredRowCount)
    })

    test('SHOULD FAIL: user can click paid card to filter table', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Click paid summary card
      const paidCard = page.locator('[data-testid="status-card-paid"]')
      await expect(paidCard).toBeVisible()

      await paidCard.click()

      // Verify card active state
      await expect(paidCard).toHaveAttribute('aria-pressed', 'true')
      await expect(paidCard).toHaveClass(/ring-emerald-500/)

      // Verify only paid invoices visible
      await page.waitForTimeout(1000)
      const paidRows = page.locator('table tbody tr:has-text("paid")')
      const totalRows = page.locator('table tbody tr')

      const paidCount = await paidRows.count()
      const totalCount = await totalRows.count()

      expect(paidCount).toBe(totalCount) // All visible rows should be paid
    })

    test('SHOULD FAIL: user can click overdue card to filter table', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Click overdue summary card
      const overdueCard = page.locator('[data-testid="status-card-overdue"]')
      await expect(overdueCard).toBeVisible()

      await overdueCard.click()

      // Verify card active state
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'true')
      await expect(overdueCard).toHaveClass(/ring-rose-500/)

      // Verify only overdue invoices visible
      await page.waitForTimeout(1000)
      const overdueRows = page.locator('table tbody tr:has-text("overdue")')
      const totalRows = page.locator('table tbody tr')

      const overdueCount = await overdueRows.count()
      const totalCount = await totalRows.count()

      expect(overdueCount).toBe(totalCount) // All visible rows should be overdue
    })

    test('SHOULD FAIL: user can select multiple status filters', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Get initial counts
      const initialRows = await page.locator('table tbody tr').count()

      // Click pending and paid cards
      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      const paidCard = page.locator('[data-testid="status-card-paid"]')

      await pendingCard.click()
      await paidCard.click()

      // Both cards should be active
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      await expect(paidCard).toHaveAttribute('aria-pressed', 'true')

      // Table should show both pending and paid, but not overdue
      await page.waitForTimeout(1000)
      const pendingRows = await page.locator('table tbody tr:has-text("pending")').count()
      const paidRows = await page.locator('table tbody tr:has-text("paid")').count()
      const overdueRows = await page.locator('table tbody tr:has-text("overdue")').count()
      const totalVisibleRows = await page.locator('table tbody tr').count()

      expect(overdueRows).toBe(0) // No overdue should be visible
      expect(pendingRows + paidRows).toBe(totalVisibleRows) // Only pending + paid visible
      expect(totalVisibleRows).toBeLessThan(initialRows) // Should be filtered
    })

    test('SHOULD FAIL: user can deactivate filter by clicking active card', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const initialRowCount = await page.locator('table tbody tr').count()

      // Activate pending filter
      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      await pendingCard.click()

      // Verify filtered state
      await page.waitForTimeout(1000)
      const filteredRowCount = await page.locator('table tbody tr').count()
      expect(filteredRowCount).toBeLessThan(initialRowCount)

      // Click again to deactivate
      await pendingCard.click()

      // Verify card is deactivated
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
      await expect(pendingCard).not.toHaveClass(/ring-2/)

      // Verify all invoices are visible again
      await page.waitForTimeout(1000)
      const restoredRowCount = await page.locator('table tbody tr').count()
      expect(restoredRowCount).toBe(initialRowCount)
    })

    test('SHOULD FAIL: clear filters button deactivates all cards', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Activate multiple filters
      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      await pendingCard.click()
      await overdueCard.click()

      // Verify both are active
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'true')

      // Click clear filters
      const clearFiltersButton = page.locator('button:has-text("Clear filters")')
      await clearFiltersButton.click()

      // Verify both cards are deactivated
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'false')
    })
  })

  test.describe('Keyboard Navigation and Accessibility', () => {
    test('SHOULD FAIL: cards are keyboard accessible', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('[data-testid="status-card-pending"]')).toBeVisible()

      const pendingCard = page.locator('[data-testid="status-card-pending"]')

      // Should be focusable
      await expect(pendingCard).toHaveAttribute('tabindex', '0')

      // Focus the card using keyboard
      await page.keyboard.press('Tab')

      let focusedElement = page.locator(':focus')
      while (await focusedElement.count() > 0) {
        const testId = await focusedElement.getAttribute('data-testid')
        if (testId === 'status-card-pending') {
          break
        }
        await page.keyboard.press('Tab')
        focusedElement = page.locator(':focus')
      }

      await expect(pendingCard).toBeFocused()
    })

    test('SHOULD FAIL: Enter key activates card filter', async ({ page }) => {
      await page.goto('/')

      const paidCard = page.locator('[data-testid="status-card-paid"]')
      await expect(paidCard).toBeVisible()

      // Focus the card
      await paidCard.focus()
      await expect(paidCard).toBeFocused()

      // Press Enter to activate
      await page.keyboard.press('Enter')

      // Should activate filter
      await expect(paidCard).toHaveAttribute('aria-pressed', 'true')

      // Verify table is filtered
      await page.waitForTimeout(1000)
      const paidRows = await page.locator('table tbody tr:has-text("paid")').count()
      const totalRows = await page.locator('table tbody tr').count()
      expect(paidRows).toBe(totalRows)
    })

    test('SHOULD FAIL: Space key activates card filter', async ({ page }) => {
      await page.goto('/')

      const overdueCard = page.locator('[data-testid="status-card-overdue"]')
      await expect(overdueCard).toBeVisible()

      // Focus the card
      await overdueCard.focus()
      await expect(overdueCard).toBeFocused()

      // Press Space to activate
      await page.keyboard.press(' ')

      // Should activate filter
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'true')

      // Verify table is filtered
      await page.waitForTimeout(1000)
      const overdueRows = await page.locator('table tbody tr:has-text("overdue")').count()
      const totalRows = await page.locator('table tbody tr').count()
      expect(overdueRows).toBe(totalRows)
    })

    test('SHOULD FAIL: cards have proper ARIA attributes', async ({ page }) => {
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      const paidCard = page.locator('[data-testid="status-card-paid"]')
      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      // All status cards should have button role
      await expect(pendingCard).toHaveAttribute('role', 'button')
      await expect(paidCard).toHaveAttribute('role', 'button')
      await expect(overdueCard).toHaveAttribute('role', 'button')

      // Should have aria-pressed initially false
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
      await expect(paidCard).toHaveAttribute('aria-pressed', 'false')
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'false')

      // Should have descriptive aria-labels
      await expect(pendingCard).toHaveAttribute('aria-label', /filter.*pending.*not filtered/i)
      await expect(paidCard).toHaveAttribute('aria-label', /filter.*paid.*not filtered/i)
      await expect(overdueCard).toHaveAttribute('aria-label', /filter.*overdue.*not filtered/i)

      // Non-status cards should not be buttons
      const totalCard = page.locator('[data-testid="summary-card-total"]')
      const amountCard = page.locator('[data-testid="summary-card-amount"]')

      await expect(totalCard).not.toHaveAttribute('role', 'button')
      await expect(amountCard).not.toHaveAttribute('role', 'button')
    })

    test('SHOULD FAIL: ARIA labels update when filters are active', async ({ page }) => {
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      await expect(pendingCard).toBeVisible()

      // Initially should indicate not filtered
      await expect(pendingCard).toHaveAttribute('aria-label', /not filtered/i)

      // Activate filter
      await pendingCard.click()

      // Should update to indicate filtered
      await expect(pendingCard).toHaveAttribute('aria-label', /filtered/i)
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Deactivate filter
      await pendingCard.click()

      // Should update back to not filtered
      await expect(pendingCard).toHaveAttribute('aria-label', /not filtered/i)
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'false')
    })
  })

  test.describe('Screen Reader Announcements', () => {
    test('SHOULD FAIL: screen reader announces filter activation', async ({ page }) => {
      await page.goto('/')

      // Should have a live region for announcements
      const liveRegion = page.locator('[aria-live="polite"]', { has: page.locator('[data-testid="filter-announcements"]') })
      await expect(liveRegion).toBeInTheDocument()

      const paidCard = page.locator('[data-testid="status-card-paid"]')
      await paidCard.click()

      // Should announce filter activation
      await expect(liveRegion).toHaveText(/paid.*filter.*activated/i)
    })

    test('SHOULD FAIL: screen reader announces filter deactivation', async ({ page }) => {
      await page.goto('/')

      const liveRegion = page.locator('[aria-live="polite"]', { has: page.locator('[data-testid="filter-announcements"]') })
      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      // Activate then deactivate
      await overdueCard.click()
      await overdueCard.click()

      // Should announce filter removal
      await expect(liveRegion).toHaveText(/overdue.*filter.*removed/i)
    })

    test('SHOULD FAIL: screen reader announces multiple filter states', async ({ page }) => {
      await page.goto('/')

      const liveRegion = page.locator('[aria-live="polite"]', { has: page.locator('[data-testid="filter-announcements"]') })
      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      const paidCard = page.locator('[data-testid="status-card-paid"]')

      // Activate multiple filters
      await pendingCard.click()
      await paidCard.click()

      // Should announce combined filter state
      await expect(liveRegion).toHaveText(/showing.*pending.*paid.*invoices/i)
    })
  })

  test.describe('Visual States and Feedback', () => {
    test('SHOULD FAIL: cards show correct active visual states', async ({ page }) => {
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      const paidCard = page.locator('[data-testid="status-card-paid"]')
      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      // Initially no active states
      await expect(pendingCard).not.toHaveClass(/ring-amber-500/)
      await expect(paidCard).not.toHaveClass(/ring-emerald-500/)
      await expect(overdueCard).not.toHaveClass(/ring-rose-500/)

      // Click each card and verify active styles
      await pendingCard.click()
      await expect(pendingCard).toHaveClass(/ring-2/)
      await expect(pendingCard).toHaveClass(/ring-amber-500/)
      await expect(pendingCard).toHaveClass(/bg-amber-50/)

      await paidCard.click()
      await expect(paidCard).toHaveClass(/ring-2/)
      await expect(paidCard).toHaveClass(/ring-emerald-500/)
      await expect(paidCard).toHaveClass(/bg-emerald-50/)

      await overdueCard.click()
      await expect(overdueCard).toHaveClass(/ring-2/)
      await expect(overdueCard).toHaveClass(/ring-rose-500/)
      await expect(overdueCard).toHaveClass(/bg-rose-50/)
    })

    test('SHOULD FAIL: cards show hover states', async ({ page }) => {
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')

      // Hover should change background
      await pendingCard.hover()

      // Should have hover styles (this tests the CSS is applied)
      const styles = await pendingCard.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          cursor: computed.cursor,
          transition: computed.transition
        }
      })

      expect(styles.cursor).toBe('pointer')
      expect(styles.transition).toContain('color')
    })

    test('SHOULD FAIL: focus states are clearly visible', async ({ page }) => {
      await page.goto('/')

      const paidCard = page.locator('[data-testid="status-card-paid"]')

      // Focus the card
      await paidCard.focus()

      // Should have visible focus indicator
      const focusStyles = await paidCard.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow
        }
      })

      // Should have some form of focus indicator
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.boxShadow.includes('ring') ||
        focusStyles.boxShadow !== 'none'

      expect(hasFocusIndicator).toBe(true)
    })
  })

  test.describe('Mobile and Responsive Behavior', () => {
    test('SHOULD FAIL: cards work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')
      await expect(pendingCard).toBeVisible()

      // Should still be clickable on mobile
      await pendingCard.tap()

      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Verify table filtering works on mobile
      await page.waitForTimeout(1000)
      const pendingRows = await page.locator('table tbody tr:has-text("pending")').count()
      const totalRows = await page.locator('table tbody tr').count()

      expect(pendingRows).toBe(totalRows)
    })

    test('SHOULD FAIL: cards have adequate touch targets', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      const statusCards = page.locator('[data-testid^="status-card-"]')

      // Check touch target size for each card
      for (let i = 0; i < await statusCards.count(); i++) {
        const card = statusCards.nth(i)
        const boundingBox = await card.boundingBox()

        if (boundingBox) {
          // WCAG recommends minimum 44x44px for touch targets
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('SHOULD FAIL: cards integrate with mobile filter drawer', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Click card to activate filter
      const paidCard = page.locator('[data-testid="status-card-paid"]')
      await paidCard.tap()

      // Open mobile filter drawer
      const filtersButton = page.locator('button:has-text("Filters")')
      await filtersButton.click()

      // Filter drawer should show the active filter
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toBeVisible()

      // Should show paid filter as active in drawer
      const drawerPaidOption = drawer.locator('label:has-text("Paid")')
      const drawerCheckbox = drawerPaidOption.locator('input[type="checkbox"]')
      await expect(drawerCheckbox).toBeChecked()
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('SHOULD FAIL: cards pass automated accessibility audit', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('[data-testid^="status-card-"]').first()).toBeVisible()

      // Run axe accessibility audit on the cards
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('[data-testid^="status-card-"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('SHOULD FAIL: cards meet color contrast requirements', async ({ page }) => {
      await page.goto('/')

      // Run color contrast specific audit
      const colorContrastResults = await new AxeBuilder({ page })
        .include('[data-testid^="status-card-"]')
        .withRules(['color-contrast'])
        .analyze()

      expect(colorContrastResults.violations).toEqual([])
    })

    test('SHOULD FAIL: cards work with reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/')

      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      // Functionality should remain intact with reduced motion
      await overdueCard.click()
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'true')

      // Visual feedback should still work (without animations)
      await expect(overdueCard).toHaveClass(/ring-rose-500/)
    })

    test('SHOULD FAIL: cards work in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')

      // Should remain functional in high contrast
      await pendingCard.click()
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Should maintain visual distinction
      await expect(pendingCard).toHaveClass(/ring-2/)
    })
  })

  test.describe('Performance and User Experience', () => {
    test('SHOULD FAIL: card interactions feel responsive', async ({ page }) => {
      await page.goto('/')

      const paidCard = page.locator('[data-testid="status-card-paid"]')

      // Measure interaction response time
      const startTime = Date.now()
      await paidCard.click()

      // Visual feedback should appear quickly
      await expect(paidCard).toHaveAttribute('aria-pressed', 'true')
      const endTime = Date.now()

      // Should respond within 100ms for good UX
      expect(endTime - startTime).toBeLessThan(100)
    })

    test('SHOULD FAIL: rapid card clicks are handled gracefully', async ({ page }) => {
      await page.goto('/')

      const overdueCard = page.locator('[data-testid="status-card-overdue"]')

      // Rapid clicks should be handled without errors
      await overdueCard.click()
      await overdueCard.click()
      await overdueCard.click()
      await overdueCard.click()

      // Should end in consistent state
      await expect(overdueCard).toHaveAttribute('aria-pressed', 'false')

      // No JavaScript errors should occur
      const pageErrors: string[] = []
      page.on('pageerror', (error) => {
        pageErrors.push(error.message)
      })

      expect(pageErrors).toHaveLength(0)
    })

    test('SHOULD FAIL: card states persist during page interactions', async ({ page }) => {
      await page.goto('/')

      const pendingCard = page.locator('[data-testid="status-card-pending"]')

      // Activate filter
      await pendingCard.click()
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')

      // Perform other page interactions
      const refreshButton = page.locator('button:has-text("Refresh")')
      if (await refreshButton.isVisible()) {
        await refreshButton.click()
      }

      // Filter state should persist
      await expect(pendingCard).toHaveAttribute('aria-pressed', 'true')
    })
  })
})