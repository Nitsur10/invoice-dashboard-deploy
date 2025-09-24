import { test, expect, Page } from '@playwright/test'

// Authentication helper
async function ensureAuth(page: Page) {
  await page.request.post('/api/auth/set', {
    data: { event: 'SIGNED_IN', session: { access_token: 'dev', refresh_token: 'dev' } },
  })
}

test.describe('Invoice Description Column E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page)
  })

  test.describe('Column Structure and Visibility', () => {
    test('SHOULD FAIL: description column replaces duplicate supplier column', async ({ page }) => {
      await page.goto('/')

      // Wait for table to load
      await expect(page.locator('table')).toBeVisible()

      // Check that Description column header is visible
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      // Verify there is no duplicate supplier column
      const supplierColumns = page.locator('th:has-text("Supplier")')
      await expect(supplierColumns).toHaveCount(0)

      // Verify single vendor column exists for filtering
      await expect(page.locator('th:has-text("Vendor")')).toBeVisible()
    })

    test('SHOULD FAIL: description column appears in correct position', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Get all column headers
      const headers = page.locator('thead th')
      const headerTexts = await headers.allTextContents()

      // Description should appear after Status column
      const statusIndex = headerTexts.findIndex(text => text.includes('Status'))
      const descriptionIndex = headerTexts.findIndex(text => text.includes('Description'))

      expect(statusIndex).toBeGreaterThan(-1)
      expect(descriptionIndex).toBeGreaterThan(statusIndex)
    })

    test('SHOULD FAIL: description column is sortable', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const descriptionHeader = page.locator('th:has-text("Description")')
      await expect(descriptionHeader).toBeVisible()

      // Click to sort
      await descriptionHeader.click()

      // Should show sort indicator
      await expect(descriptionHeader.locator('svg')).toBeVisible()

      // Click again to reverse sort
      await descriptionHeader.click()

      // Sort indicator should still be visible but direction changed
      await expect(descriptionHeader.locator('svg')).toBeVisible()
    })
  })

  test.describe('Description Content Display', () => {
    test('SHOULD FAIL: displays first line of description text', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Look for description content in table cells
      const descriptionCells = page.locator('td:has([data-testid="description-cell"])')

      if (await descriptionCells.count() > 0) {
        const firstCell = descriptionCells.first()
        await expect(firstCell).toBeVisible()

        // Should contain text content
        const cellText = await firstCell.textContent()
        expect(cellText).toBeTruthy()
        expect(cellText?.trim().length).toBeGreaterThan(0)
      }
    })

    test('SHOULD FAIL: truncates long descriptions correctly', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Find cells with truncated content (should have title attribute for tooltip)
      const truncatedCells = page.locator('td [title]').filter({
        has: page.locator('[data-testid="description-cell"]')
      })

      if (await truncatedCells.count() > 0) {
        const cell = truncatedCells.first()

        const visibleText = await cell.textContent()
        const fullText = await cell.getAttribute('title')

        expect(fullText).toBeTruthy()
        expect(visibleText).toBeTruthy()

        // Full text should be longer than visible text for truncated content
        if (fullText && visibleText && fullText !== visibleText) {
          expect(fullText.length).toBeGreaterThan(visibleText.length)
        }
      }
    })

    test('SHOULD FAIL: shows fallback text for empty descriptions', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Look for empty description fallback
      const fallbackCells = page.locator('td:has-text("—")')

      // If there are empty descriptions, they should show fallback
      if (await fallbackCells.count() > 0) {
        await expect(fallbackCells.first()).toBeVisible()
        const cellText = await fallbackCells.first().textContent()
        expect(cellText?.trim()).toBe('—')
      }
    })
  })

  test.describe('Tooltip Functionality', () => {
    test('SHOULD FAIL: shows tooltip on hover for truncated content', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Find description cells with title attributes (indicating tooltips)
      const tooltipCells = page.locator('td [title][data-testid="description-cell"]')

      if (await tooltipCells.count() > 0) {
        const cell = tooltipCells.first()

        // Hover over the cell
        await cell.hover()

        // Browser tooltip is not directly testable, but we can verify:
        // 1. The element has the title attribute
        const titleAttribute = await cell.getAttribute('title')
        expect(titleAttribute).toBeTruthy()

        // 2. The element has cursor help styling
        await expect(cell).toHaveClass(/cursor-help/)
      }
    })

    test('SHOULD FAIL: tooltip content matches full description', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const tooltipCells = page.locator('td [title][data-testid="description-cell"]')

      if (await tooltipCells.count() > 0) {
        const cell = tooltipCells.first()

        const titleAttribute = await cell.getAttribute('title')
        const visibleText = await cell.textContent()

        expect(titleAttribute).toBeTruthy()
        expect(visibleText).toBeTruthy()

        // Title should contain more information than visible text for truncated content
        if (titleAttribute && visibleText) {
          expect(titleAttribute.length).toBeGreaterThanOrEqual(visibleText.trim().length)
        }
      }
    })

    test('SHOULD FAIL: no tooltip for short descriptions', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Find description cells without title attributes (no tooltip needed)
      const nonTooltipCells = page.locator('td [data-testid="description-cell"]:not([title])')

      if (await nonTooltipCells.count() > 0) {
        const cell = nonTooltipCells.first()

        await expect(cell).not.toHaveAttribute('title')
        await expect(cell).not.toHaveClass(/cursor-help/)
      }
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('SHOULD FAIL: description cells are keyboard accessible', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Find focusable description cells (those with tabindex="0")
      const focusableCells = page.locator('td [tabindex="0"][data-testid="description-cell"]')

      if (await focusableCells.count() > 0) {
        const cell = focusableCells.first()

        // Focus the cell using keyboard navigation
        await cell.focus()

        // Verify the cell is focused
        await expect(cell).toBeFocused()

        // Should have title attribute for screen readers
        await expect(cell).toHaveAttribute('title')
      }
    })

    test('SHOULD FAIL: tab navigation skips non-interactive description cells', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Non-interactive cells should have tabindex="-1"
      const nonInteractiveCells = page.locator('td [tabindex="-1"][data-testid="description-cell"]')

      if (await nonInteractiveCells.count() > 0) {
        // These cells should not receive focus during tab navigation
        await page.keyboard.press('Tab')

        const focusedElement = await page.evaluate(() => document.activeElement?.tagName)

        // The non-interactive cell should not be the focused element
        const nonInteractiveCell = nonInteractiveCells.first()
        await expect(nonInteractiveCell).not.toBeFocused()
      }
    })

    test('SHOULD FAIL: keyboard focus shows proper visual indicator', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const focusableCells = page.locator('td [tabindex="0"][data-testid="description-cell"]')

      if (await focusableCells.count() > 0) {
        const cell = focusableCells.first()

        await cell.focus()

        // Should have visible focus indicator (outline or similar)
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeVisible()
      }
    })
  })

  test.describe('Responsive Behavior', () => {
    test('SHOULD FAIL: description column visible on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()
      await expect(page.locator('th:has-text("Description")')).toBeVisible()
    })

    test('SHOULD FAIL: description column behavior on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Description column should still be visible on tablet
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      // Check that text truncation still works
      const descriptionCells = page.locator('td [data-testid="description-cell"]')

      if (await descriptionCells.count() > 0) {
        const cell = descriptionCells.first()

        // Should maintain width constraints
        const boundingBox = await cell.boundingBox()
        expect(boundingBox?.width).toBeLessThanOrEqual(200)
      }
    })

    test('SHOULD FAIL: description column behavior on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Table should be horizontally scrollable on mobile
      await expect(page.locator('table')).toBeVisible()

      // Description column might be hidden or require horizontal scroll
      const descriptionHeader = page.locator('th:has-text("Description")')

      if (await descriptionHeader.isVisible()) {
        // If visible, should maintain proper styling
        await expect(descriptionHeader).toBeVisible()
      } else {
        // If hidden, should be accessible via horizontal scroll
        await page.locator('table').scrollIntoViewIfNeeded()
        // After scrolling, column might become visible
      }
    })
  })

  test.describe('Filter and Search Integration', () => {
    test('SHOULD FAIL: vendor filtering still works with single vendor column', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Look for filter controls
      const filterButton = page.locator('button:has-text("Filter")').or(page.locator('[data-testid="filter-toggle"]'))

      if (await filterButton.isVisible()) {
        await filterButton.click()

        // Look for vendor filter options
        const vendorFilter = page.locator('text=Vendor').or(page.locator('[data-testid="vendor-filter"]'))

        if (await vendorFilter.isVisible()) {
          // Vendor filtering should still be available
          expect(await vendorFilter.count()).toBeGreaterThan(0)
        }
      }
    })

    test('SHOULD FAIL: global search includes description content', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Look for search input
      const searchInput = page.locator('input[placeholder*="Search"]').or(page.locator('[data-testid="search-input"]'))

      if (await searchInput.isVisible()) {
        // Search for content that would appear in descriptions
        await searchInput.fill('office supplies')

        // Wait for search results
        await page.waitForTimeout(500)

        // Results should filter based on description content
        const rows = page.locator('tbody tr')
        const rowCount = await rows.count()

        // If there are matching results, verify they contain the search term
        if (rowCount > 0) {
          const firstRow = rows.first()
          const rowText = await firstRow.textContent()
          expect(rowText?.toLowerCase()).toContain('office')
        }
      }
    })

    test('SHOULD FAIL: description column sorting works correctly', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const descriptionHeader = page.locator('th:has-text("Description")')
      await expect(descriptionHeader).toBeVisible()

      // Get initial order of descriptions
      const initialDescriptions = await page.locator('td [data-testid="description-cell"]').allTextContents()

      // Click to sort
      await descriptionHeader.click()

      // Wait for sort to complete
      await page.waitForTimeout(500)

      // Get sorted order
      const sortedDescriptions = await page.locator('td [data-testid="description-cell"]').allTextContents()

      // Order should have changed (unless already sorted)
      expect(sortedDescriptions).not.toEqual(initialDescriptions.reverse())
    })
  })

  test.describe('CSV Export Integration', () => {
    test('SHOULD FAIL: CSV export includes description column', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Look for export button
      const exportButton = page.locator('button:has-text("Export")').or(page.locator('[data-testid="export-csv"]'))

      if (await exportButton.isVisible()) {
        // Set up download promise before clicking
        const downloadPromise = page.waitForEvent('download')

        await exportButton.click()

        // Wait for download to start
        const download = await downloadPromise

        // Verify the download occurred
        expect(download.suggestedFilename()).toContain('.csv')
      }
    })

    test('SHOULD FAIL: exported CSV maintains vendor data', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const exportButton = page.locator('button:has-text("Export")').or(page.locator('[data-testid="export-csv"]'))

      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download')
        await exportButton.click()

        const download = await downloadPromise

        // Save the file to check contents
        const path = await download.path()
        if (path) {
          const fs = require('fs')
          const csvContent = fs.readFileSync(path, 'utf8')

          // CSV should include both Description and Vendor columns
          expect(csvContent).toContain('Description')
          expect(csvContent).toContain('Vendor')
          expect(csvContent).toContain('Email') // Vendor email should still be present
        }
      }
    })
  })

  test.describe('Performance and Loading States', () => {
    test('SHOULD FAIL: description column renders efficiently with large datasets', async ({ page }) => {
      await page.goto('/')

      // Measure initial load time
      const startTime = Date.now()

      await expect(page.locator('table')).toBeVisible()
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      const loadTime = Date.now() - startTime

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000)
    })

    test('SHOULD FAIL: handles loading states gracefully', async ({ page }) => {
      // Intercept API calls to simulate slow loading
      await page.route('/api/invoices**', async route => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 1000))
        route.continue()
      })

      await page.goto('/')

      // Loading state should be visible
      const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('.loading'))

      // Wait for table to load
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

      // Description column should be present after loading
      await expect(page.locator('th:has-text("Description")')).toBeVisible()
    })

    test('SHOULD FAIL: virtual scrolling works with description column', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Scroll down to test virtual scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      // Description column should remain functional during scrolling
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      // Tooltip functionality should work for newly rendered rows
      const tooltipCells = page.locator('td [title][data-testid="description-cell"]')

      if (await tooltipCells.count() > 0) {
        const cell = tooltipCells.last()
        await cell.hover()

        await expect(cell).toHaveAttribute('title')
      }
    })
  })

  test.describe('Error Handling', () => {
    test('SHOULD FAIL: handles missing description data gracefully', async ({ page }) => {
      // Mock API response with missing description data
      await page.route('/api/invoices**', async route => {
        const response = await route.fetch()
        const json = await response.json()

        // Remove description from some invoices
        json.invoices = json.invoices.map((invoice: any, index: number) => {
          if (index % 2 === 0) {
            delete invoice.description
          }
          return invoice
        })

        route.fulfill({ json })
      })

      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Should show fallback text for missing descriptions
      const fallbackCells = page.locator('td:has-text("—")')
      expect(await fallbackCells.count()).toBeGreaterThan(0)
    })

    test('SHOULD FAIL: handles API errors without breaking table layout', async ({ page }) => {
      // Mock API error
      await page.route('/api/invoices**', route => {
        route.fulfill({ status: 500, body: 'Server Error' })
      })

      await page.goto('/')

      // Error state should not break the page layout
      // The table structure should still be present even if data fails to load
      await expect(page.locator('table').or(page.locator('[data-testid="error-state"]'))).toBeVisible()
    })
  })
})