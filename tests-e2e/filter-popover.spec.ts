import { test, expect, Page } from '@playwright/test'

// Authentication helper
async function ensureAuth(page: Page) {
  await page.request.post('/api/auth/set', {
    data: { event: 'SIGNED_IN', session: { access_token: 'dev', refresh_token: 'dev' } },
  })
}

test.describe('Invoice Filter Popover E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page)
  })

  test.describe('Popover visibility and layout', () => {
    test('SHOULD FAIL: filter popover trigger button is visible next to Export CSV', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Filter button should be positioned near Export CSV in toolbar
      const toolbar = page.locator('[data-testid="invoice-toolbar"]').or(page.locator('.flex:has(button:has-text("Export"))'))
      const filterButton = toolbar.locator('button:has-text("Filter")').or(toolbar.locator('[data-testid="filter-popover-trigger"]'))
      const exportButton = toolbar.locator('button:has-text("Export")').or(toolbar.locator('[data-testid="export-csv"]'))

      await expect(filterButton).toBeVisible()
      await expect(exportButton).toBeVisible()

      // Buttons should be in the same container
      expect(await filterButton.count()).toBe(1)
      expect(await exportButton.count()).toBe(1)
    })

    test('SHOULD FAIL: filter popover is hidden on mobile, shows drawer trigger instead', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Popover trigger should be hidden on mobile
      const popoverTrigger = page.locator('[data-testid="filter-popover-trigger"]').or(page.locator('button:has-text("Filter"):not([data-testid="mobile-filter-trigger"])'))
      await expect(popoverTrigger).toBeHidden()

      // Mobile drawer trigger should be visible
      const mobileFilterTrigger = page.locator('[data-testid="mobile-filter-trigger"]').or(page.locator('button:has-text("Filter")').first())
      await expect(mobileFilterTrigger).toBeVisible()
    })

    test('SHOULD FAIL: filter popover shows count badge when filters are active', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()

      // Initially no badge
      const badge = filterButton.locator('.badge').or(filterButton.locator('[data-testid="filter-count-badge"]'))
      await expect(badge).toBeHidden()

      // Open popover
      await filterButton.click()

      await expect(page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))).toBeVisible()

      // Apply a filter
      const pendingFilter = page.locator('button:has-text("pending")').or(page.locator('[data-testid="status-pending"]'))
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()

        // Close popover (click outside or press Escape)
        await page.keyboard.press('Escape')

        // Badge should now be visible with count
        await expect(badge).toBeVisible()
        await expect(badge).toHaveText('1')
      }
    })

    test('SHOULD FAIL: filter popover positions correctly relative to trigger button', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Get positions
      const buttonBox = await filterButton.boundingBox()
      const popoverBox = await popover.boundingBox()

      expect(buttonBox).toBeTruthy()
      expect(popoverBox).toBeTruthy()

      if (buttonBox && popoverBox) {
        // Popover should be positioned below and aligned to the right of the button
        expect(popoverBox.y).toBeGreaterThan(buttonBox.y + buttonBox.height)
        expect(popoverBox.x + popoverBox.width).toBeGreaterThanOrEqual(buttonBox.x + buttonBox.width - 50) // Allow some tolerance
      }
    })

    test('SHOULD FAIL: popover has correct width and styling', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      const popoverBox = await popover.boundingBox()
      expect(popoverBox?.width).toBeCloseTo(384, 20) // w-96 = 384px, allow 20px tolerance

      // Should have proper styling classes
      await expect(popover).toHaveClass(/rounded/)
      await expect(popover).toHaveClass(/shadow/)
      await expect(popover).toHaveClass(/border/)
    })
  })

  test.describe('Popover interaction behavior', () => {
    test('SHOULD FAIL: opens popover when filter button is clicked', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))

      // Initially closed
      await expect(popover).not.toBeVisible()

      // Click to open
      await filterButton.click()

      // Should open
      await expect(popover).toBeVisible()
    })

    test('SHOULD FAIL: closes popover when clicking outside', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Click outside popover
      await page.locator('body').click({ position: { x: 100, y: 100 } })

      // Should close
      await expect(popover).not.toBeVisible()
    })

    test('SHOULD FAIL: closes popover when Escape key is pressed', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')

      // Should close
      await expect(popover).not.toBeVisible()
    })

    test('SHOULD FAIL: closes popover when filter trigger is clicked again', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()

      // Open popover
      await filterButton.click()
      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Click trigger again to close
      await filterButton.click()

      // Should close
      await expect(popover).not.toBeVisible()
    })

    test('SHOULD FAIL: maintains popover open when clicking inside popover content', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Click inside popover content
      await popover.click()

      // Should remain open
      await expect(popover).toBeVisible()
    })
  })

  test.describe('Filter functionality within popover', () => {
    test('SHOULD FAIL: displays all filter sections in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Check all filter sections are present
      await expect(popover.locator('text=Date range').or(popover.locator('[data-testid="date-range-section"]'))).toBeVisible()
      await expect(popover.locator('text=Status').or(popover.locator('[data-testid="status-section"]'))).toBeVisible()
      await expect(popover.locator('text=Categories').or(popover.locator('[data-testid="categories-section"]'))).toBeVisible()
      await expect(popover.locator('text=Vendors').or(popover.locator('[data-testid="vendors-section"]'))).toBeVisible()
      await expect(popover.locator('text=Amount range').or(popover.locator('[data-testid="amount-range-section"]'))).toBeVisible()
    })

    test('SHOULD FAIL: status filters work correctly in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Find and click status filters
      const pendingFilter = popover.locator('button:has-text("pending")')
      const paidFilter = popover.locator('button:has-text("paid")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        // Button should show selected state
        await expect(pendingFilter).toHaveAttribute('aria-pressed', 'true')
      }

      if (await paidFilter.isVisible()) {
        await paidFilter.click()
        await expect(paidFilter).toHaveAttribute('aria-pressed', 'true')
      }

      // Close popover
      await page.keyboard.press('Escape')

      // Filter count badge should show
      const badge = filterButton.locator('.badge').or(filterButton.locator('[data-testid="filter-count-badge"]'))
      await expect(badge).toBeVisible()

      // Badge count should reflect selected filters
      const badgeText = await badge.textContent()
      expect(parseInt(badgeText || '0')).toBeGreaterThan(0)
    })

    test('SHOULD FAIL: category filters work correctly in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Look for category filters
      const categorySection = popover.locator('text=Categories').locator('..').or(popover.locator('[data-testid="categories-section"]'))
      const categoryButtons = categorySection.locator('button').or(popover.locator('[data-testid^="category-"]'))

      if (await categoryButtons.first().isVisible()) {
        const firstCategory = categoryButtons.first()
        await firstCategory.click()

        // Should show selected state
        await expect(firstCategory).toHaveAttribute('aria-pressed', 'true')

        // Close popover
        await page.keyboard.press('Escape')

        // Badge should show
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
      }
    })

    test('SHOULD FAIL: vendor filters work correctly in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Look for vendor filters
      const vendorSection = popover.locator('text=Vendors').locator('..').or(popover.locator('[data-testid="vendors-section"]'))
      const vendorButtons = vendorSection.locator('button').or(popover.locator('[data-testid^="vendor-"]'))

      if (await vendorButtons.first().isVisible()) {
        const firstVendor = vendorButtons.first()
        await firstVendor.click()

        await expect(firstVendor).toHaveAttribute('aria-pressed', 'true')

        await page.keyboard.press('Escape')

        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
      }
    })

    test('SHOULD FAIL: date range filters work correctly in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Look for date range quick preset buttons
      const thisMonthButton = popover.locator('button:has-text("This month")').or(popover.locator('[data-testid="preset-this-month"]'))

      if (await thisMonthButton.isVisible()) {
        await thisMonthButton.click()

        // Close popover
        await page.keyboard.press('Escape')

        // Badge should show date filter
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
      }
    })

    test('SHOULD FAIL: amount range filters work correctly in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Find amount range inputs
      const minInput = popover.locator('input[placeholder*="min"]').or(popover.locator('[data-testid="amount-min"]'))
      const maxInput = popover.locator('input[placeholder*="max"]').or(popover.locator('[data-testid="amount-max"]'))

      if (await minInput.isVisible() && await maxInput.isVisible()) {
        await minInput.fill('100')
        await maxInput.fill('5000')

        // Close popover
        await page.keyboard.press('Escape')

        // Badge should show amount filter
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
      }
    })

    test('SHOULD FAIL: reset button clears all filters in popover', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      // Apply some filters first
      const pendingFilter = popover.locator('button:has-text("pending")')
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
      }

      // Find and click reset button
      const resetButton = popover.locator('button:has-text("Reset")').or(popover.locator('[data-testid="reset-filters"]'))

      if (await resetButton.isVisible()) {
        await resetButton.click()

        // All filters should be cleared
        if (await pendingFilter.isVisible()) {
          await expect(pendingFilter).toHaveAttribute('aria-pressed', 'false')
        }

        // Close popover
        await page.keyboard.press('Escape')

        // Badge should not be visible
        const badge = filterButton.locator('.badge')
        await expect(badge).not.toBeVisible()
      }
    })
  })

  test.describe('Filter count badge behavior', () => {
    test('SHOULD FAIL: badge displays correct count for multiple filter types', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]').or(page.locator('[data-testid="filter-popover-content"]'))
      await expect(popover).toBeVisible()

      let appliedFiltersCount = 0

      // Apply status filter
      const pendingFilter = popover.locator('button:has-text("pending")')
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        appliedFiltersCount++
      }

      // Apply category filter
      const categoryButtons = popover.locator('[data-testid="categories-section"] button').or(popover.locator('text=Categories').locator('..').locator('button'))
      if (await categoryButtons.first().isVisible()) {
        await categoryButtons.first().click()
        appliedFiltersCount++
      }

      // Apply date range
      const thisMonthButton = popover.locator('button:has-text("This month")')
      if (await thisMonthButton.isVisible()) {
        await thisMonthButton.click()
        appliedFiltersCount++
      }

      // Close popover
      await page.keyboard.press('Escape')

      if (appliedFiltersCount > 0) {
        // Badge should show correct count
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
        await expect(badge).toHaveText(appliedFiltersCount.toString())
      }
    })

    test('SHOULD FAIL: badge updates when filters are modified', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()

      // Apply one filter
      await filterButton.click()
      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Badge should show 1
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()
        await expect(badge).toHaveText('1')

        // Apply another filter
        await filterButton.click()
        const paidFilter = popover.locator('button:has-text("paid")')

        if (await paidFilter.isVisible()) {
          await paidFilter.click()
          await page.keyboard.press('Escape')

          // Badge should show 2
          await expect(badge).toHaveText('2')

          // Remove one filter
          await filterButton.click()
          await pendingFilter.click() // Toggle off
          await page.keyboard.press('Escape')

          // Badge should show 1
          await expect(badge).toHaveText('1')
        }
      }
    })

    test('SHOULD FAIL: badge disappears when all filters are cleared', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')

      // Apply a filter
      const pendingFilter = popover.locator('button:has-text("pending")')
      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Badge should be visible
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()

        // Reopen and clear filters
        await filterButton.click()
        const resetButton = popover.locator('button:has-text("Reset")')

        if (await resetButton.isVisible()) {
          await resetButton.click()
          await page.keyboard.press('Escape')

          // Badge should disappear
          await expect(badge).not.toBeVisible()
        }
      }
    })
  })

  test.describe('Responsive behavior and mobile drawer', () => {
    test('SHOULD FAIL: switches to drawer on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Desktop popover trigger should be hidden
      const popoverTrigger = page.locator('[data-testid="filter-popover-trigger"]')
      await expect(popoverTrigger).toBeHidden()

      // Mobile drawer trigger should be visible
      const drawerTrigger = page.locator('[data-testid="mobile-filter-trigger"]').or(page.locator('button:has-text("Filter")').first())
      await expect(drawerTrigger).toBeVisible()

      // Click should open drawer, not popover
      await drawerTrigger.click()

      // Should open as drawer (full-screen or slide-in from side)
      const drawer = page.locator('[data-testid="filter-drawer"]').or(page.locator('[role="dialog"][data-variant="drawer"]'))
      await expect(drawer).toBeVisible()

      // Drawer should have different styling than popover
      const drawerBox = await drawer.boundingBox()
      expect(drawerBox?.width).toBeGreaterThan(300) // Should be wider than popover
    })

    test('SHOULD FAIL: popover width adjusts on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      const popoverBox = await popover.boundingBox()

      // Should be smaller width on tablet (w-80 = 320px instead of w-96 = 384px)
      expect(popoverBox?.width).toBeCloseTo(320, 30) // Allow tolerance
    })

    test('SHOULD FAIL: maintains functionality across viewport changes', async ({ page }) => {
      // Start with desktop
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      // Apply filter in popover
      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Badge should be visible
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()

        // Switch to mobile
        await page.setViewportSize({ width: 375, height: 667 })

        // Mobile trigger should show same badge
        const mobileFilterButton = page.locator('[data-testid="mobile-filter-trigger"]').or(page.locator('button:has-text("Filter")').first())
        const mobileBadge = mobileFilterButton.locator('.badge')
        await expect(mobileBadge).toBeVisible()

        // Filter should still be applied
        await mobileFilterButton.click()
        const drawer = page.locator('[data-testid="filter-drawer"]').or(page.locator('[role="dialog"]'))
        const mobilePendingFilter = drawer.locator('button:has-text("pending")')

        if (await mobilePendingFilter.isVisible()) {
          await expect(mobilePendingFilter).toHaveAttribute('aria-pressed', 'true')
        }
      }
    })
  })

  test.describe('Keyboard navigation and accessibility', () => {
    test('SHOULD FAIL: filter button is keyboard accessible', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Tab to filter button
      await page.keyboard.press('Tab')

      // Find the filter button and ensure it can receive focus
      const filterButton = page.locator('button:has-text("Filter")').last()

      // Focus should eventually reach the filter button
      let attempts = 0
      while (attempts < 10) {
        const focusedElement = page.locator(':focus')
        if (await focusedElement.count() > 0) {
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase())
          const textContent = await focusedElement.textContent()

          if (tagName === 'button' && textContent?.toLowerCase().includes('filter')) {
            break
          }
        }
        await page.keyboard.press('Tab')
        attempts++
      }

      // Press Enter or Space to activate
      await page.keyboard.press('Enter')

      // Popover should open
      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()
    })

    test('SHOULD FAIL: popover traps focus correctly', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      // Focus should be inside popover
      const focusedElement = page.locator(':focus')
      const popoverContainsFocus = await popover.locator(':focus').count() > 0

      expect(popoverContainsFocus).toBe(true)

      // Tab should cycle within popover
      const initialFocus = await page.evaluate(() => document.activeElement?.textContent)

      // Tab multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
      }

      // Focus should still be within popover
      const finalFocusInPopover = await popover.locator(':focus').count() > 0
      expect(finalFocusInPopover).toBe(true)
    })

    test('SHOULD FAIL: Escape key closes popover and returns focus', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')

      // Popover should close
      await expect(popover).not.toBeVisible()

      // Focus should return to trigger button
      const focusedElement = page.locator(':focus')
      const focusedText = await focusedElement.textContent()
      expect(focusedText?.toLowerCase()).toContain('filter')
    })

    test('SHOULD FAIL: filter buttons within popover are keyboard accessible', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      // Tab to filter buttons and activate with keyboard
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.focus()
        await expect(pendingFilter).toBeFocused()

        // Activate with Space or Enter
        await page.keyboard.press('Space')

        // Should show selected state
        await expect(pendingFilter).toHaveAttribute('aria-pressed', 'true')
      }
    })

    test('SHOULD FAIL: popover has proper ARIA attributes', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()

      // Button should have proper ARIA attributes
      await expect(filterButton).toHaveAttribute('aria-expanded', 'false')
      await expect(filterButton).toHaveAttribute('aria-label', /filter/i)

      await filterButton.click()

      // Button should update aria-expanded
      await expect(filterButton).toHaveAttribute('aria-expanded', 'true')

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      // Popover should have proper role and label
      await expect(popover).toHaveAttribute('role', 'dialog')
      await expect(popover).toHaveAttribute('aria-label', /filter/i)
    })

    test('SHOULD FAIL: screen reader announcements work correctly', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      await expect(popover).toBeVisible()

      // Should have screen reader description
      const description = popover.locator('#filter-description').or(popover.locator('[data-testid="filter-description"]'))
      if (await description.count() > 0) {
        await expect(description).toBeInTheDocument()
        await expect(description).toHaveClass(/sr-only/)

        const descText = await description.textContent()
        expect(descText?.toLowerCase()).toMatch(/filter.*invoice/i)
      }
    })
  })

  test.describe('Integration with existing functionality', () => {
    test('SHOULD FAIL: filters applied via popover affect table data', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Get initial row count
      const initialRows = page.locator('tbody tr')
      const initialCount = await initialRows.count()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Wait for table to update
        await page.waitForTimeout(1000)

        // Row count should change (assuming there are pending and non-pending invoices)
        const filteredRows = page.locator('tbody tr')
        const filteredCount = await filteredRows.count()

        // Count should be different (either more or fewer, depending on data)
        expect(filteredCount).not.toBe(initialCount)
      }
    })

    test('SHOULD FAIL: filter chips update when popover filters are applied', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Filter chip should appear
        const filterChip = page.locator('[data-testid="filter-chip"]').or(page.locator('.chip:has-text("pending")'))
        await expect(filterChip).toBeVisible()
      }
    })

    test('SHOULD FAIL: export functionality includes popover-applied filters', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Apply filter via popover
      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Trigger export
        const exportButton = page.locator('button:has-text("Export")').or(page.locator('[data-testid="export-csv"]'))

        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download')
          await exportButton.click()

          // Verify download starts (filters should be included in export)
          const download = await downloadPromise
          expect(download.suggestedFilename()).toMatch(/\.csv$/i)
        }
      }
    })

    test('SHOULD FAIL: URL parameters update with popover filter changes', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // URL should reflect filter state
        await page.waitForTimeout(500) // Allow time for URL update

        const currentUrl = page.url()
        expect(currentUrl).toMatch(/status.*pending/i)
      }
    })

    test('SHOULD FAIL: popover state persists across page refreshes', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('table')).toBeVisible()

      // Apply filter
      const filterButton = page.locator('button:has-text("Filter")').last()
      await filterButton.click()

      const popover = page.locator('[role="dialog"]')
      const pendingFilter = popover.locator('button:has-text("pending")')

      if (await pendingFilter.isVisible()) {
        await pendingFilter.click()
        await page.keyboard.press('Escape')

        // Verify badge is visible
        const badge = filterButton.locator('.badge')
        await expect(badge).toBeVisible()

        // Refresh page
        await page.reload()
        await expect(page.locator('table')).toBeVisible()

        // Filter should persist
        const filterButtonAfterRefresh = page.locator('button:has-text("Filter")').last()
        const badgeAfterRefresh = filterButtonAfterRefresh.locator('.badge')
        await expect(badgeAfterRefresh).toBeVisible()

        // Open popover to verify filter state
        await filterButtonAfterRefresh.click()
        const popoverAfterRefresh = page.locator('[role="dialog"]')
        const pendingFilterAfterRefresh = popoverAfterRefresh.locator('button:has-text("pending")')

        if (await pendingFilterAfterRefresh.isVisible()) {
          await expect(pendingFilterAfterRefresh).toHaveAttribute('aria-pressed', 'true')
        }
      }
    })
  })
})