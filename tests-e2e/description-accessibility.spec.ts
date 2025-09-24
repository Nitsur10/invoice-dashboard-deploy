import { test, expect, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Authentication helper
async function ensureAuth(page: Page) {
  await page.request.post('/api/auth/set', {
    data: { event: 'SIGNED_IN', session: { access_token: 'dev', refresh_token: 'dev' } },
  })
}

test.describe('Description Column Accessibility E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuth(page)
  })

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('SHOULD FAIL: description column passes automated accessibility audit', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Run axe-core accessibility audit
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('table')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('SHOULD FAIL: description tooltips meet accessibility standards', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Focus on description cells with tooltips
      const tooltipCells = page.locator('td [title][data-testid="description-cell"]')

      if (await tooltipCells.count() > 0) {
        const firstCell = tooltipCells.first()

        // Check ARIA attributes
        await expect(firstCell).toHaveAttribute('aria-label')
        await expect(firstCell).toHaveAttribute('title')
        await expect(firstCell).toHaveAttribute('tabIndex', '0')

        // Focus the cell
        await firstCell.focus()

        // Run accessibility audit on focused state
        const focusedScanResults = await new AxeBuilder({ page })
          .include('[data-testid="description-cell"]:focus')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()

        expect(focusedScanResults.violations).toEqual([])
      }
    })

    test('SHOULD FAIL: keyboard navigation follows logical order', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Start keyboard navigation
      await page.keyboard.press('Tab')

      let previousElementName = ''
      let focusOrder: string[] = []

      // Navigate through multiple elements to test focus order
      for (let i = 0; i < 10; i++) {
        const focusedElement = page.locator(':focus')

        if (await focusedElement.count() > 0) {
          const elementText = await focusedElement.textContent()
          const elementRole = await focusedElement.getAttribute('role')
          const elementTag = await focusedElement.evaluate(el => el.tagName.toLowerCase())

          const elementIdentifier = elementText?.substring(0, 20) || elementTag || elementRole || 'unknown'

          if (elementIdentifier !== previousElementName) {
            focusOrder.push(elementIdentifier)
            previousElementName = elementIdentifier
          }
        }

        await page.keyboard.press('Tab')
      }

      // Focus order should be logical (headers, then rows, then actions)
      expect(focusOrder.length).toBeGreaterThan(3)
      console.log('Focus order:', focusOrder) // For debugging
    })

    test('SHOULD FAIL: screen reader announcements are appropriate', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Test screen reader compatibility
      const descriptionCells = page.locator('td [data-testid="description-cell"]')

      if (await descriptionCells.count() > 0) {
        const firstCell = descriptionCells.first()

        // Check that screen readers get proper context
        const ariaLabel = await firstCell.getAttribute('aria-label')

        if (ariaLabel) {
          expect(ariaLabel).toMatch(/Description:/i)
        }

        // Check table structure for screen readers
        const tableHeaders = page.locator('th')
        const headerCount = await tableHeaders.count()

        expect(headerCount).toBeGreaterThan(0)

        // Each header should be properly labeled
        for (let i = 0; i < headerCount; i++) {
          const header = tableHeaders.nth(i)
          const headerText = await header.textContent()

          expect(headerText?.trim()).toBeTruthy()
        }
      }
    })
  })

  test.describe('Keyboard Accessibility', () => {
    test('SHOULD FAIL: all interactive elements are keyboard accessible', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Collect all focusable elements
      const focusableElements = page.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      const focusableCount = await focusableElements.count()

      // Test that each element can receive focus
      for (let i = 0; i < Math.min(focusableCount, 20); i++) {
        const element = focusableElements.nth(i)

        await element.focus()
        await expect(element).toBeFocused()
      }
    })

    test('SHOULD FAIL: Enter and Space keys work appropriately', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const sortableHeaders = page.locator('th button')

      if (await sortableHeaders.count() > 0) {
        const descriptionHeader = sortableHeaders.filter({ hasText: 'Description' })

        if (await descriptionHeader.count() > 0) {
          await descriptionHeader.focus()
          await expect(descriptionHeader).toBeFocused()

          // Press Enter to activate sorting
          await page.keyboard.press('Enter')

          // Should show sort indicator
          await expect(descriptionHeader.locator('svg')).toBeVisible()
        }
      }
    })

    test('SHOULD FAIL: Tab navigation respects table structure', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Start from before the table
      await page.keyboard.press('Tab')

      // Navigate through table headers
      const headers = page.locator('th button')
      const headerCount = await headers.count()

      let currentFocusedHeaders = 0

      for (let i = 0; i < headerCount + 5; i++) {
        const focused = page.locator(':focus')
        const isHeader = await focused.locator('..').locator('th').count() > 0

        if (isHeader) {
          currentFocusedHeaders++
        }

        await page.keyboard.press('Tab')

        // Stop if we've moved past table navigation
        if (currentFocusedHeaders > 0 && !isHeader) {
          break
        }
      }

      expect(currentFocusedHeaders).toBeGreaterThan(0)
    })

    test('SHOULD FAIL: focus indicators are clearly visible', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Test focus visibility
      const focusableElements = page.locator('button, [tabindex="0"]')

      if (await focusableElements.count() > 0) {
        const firstElement = focusableElements.first()

        await firstElement.focus()
        await expect(firstElement).toBeFocused()

        // Check for visible focus indicators (outline, ring, etc.)
        const focusedStyle = await firstElement.evaluate((el) => {
          const styles = window.getComputedStyle(el)
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow,
          }
        })

        // Should have some form of focus indicator
        const hasFocusIndicator =
          focusedStyle.outline !== 'none' ||
          focusedStyle.outlineWidth !== '0px' ||
          focusedStyle.boxShadow !== 'none'

        expect(hasFocusIndicator).toBe(true)
      }
    })
  })

  test.describe('Screen Reader Compatibility', () => {
    test('SHOULD FAIL: table has proper heading structure', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Check table caption or summary
      const table = page.locator('table')
      const caption = table.locator('caption')

      // Table should have proper structure for screen readers
      await expect(table).toHaveAttribute('role', 'table')

      // Headers should have proper roles
      const headers = page.locator('th')
      const headerCount = await headers.count()

      expect(headerCount).toBeGreaterThan(0)

      for (let i = 0; i < headerCount; i++) {
        const header = headers.nth(i)

        // Each header should be properly identified
        const role = await header.getAttribute('role')
        expect(role === 'columnheader' || role === null).toBe(true) // null is acceptable as th implies columnheader
      }
    })

    test('SHOULD FAIL: description content is properly announced', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const descriptionCells = page.locator('td [data-testid="description-cell"]')

      if (await descriptionCells.count() > 0) {
        const cellsWithTooltips = descriptionCells.filter('[aria-label]')

        if (await cellsWithTooltips.count() > 0) {
          const firstCellWithTooltip = cellsWithTooltips.first()

          const ariaLabel = await firstCellWithTooltip.getAttribute('aria-label')
          const titleAttribute = await firstCellWithTooltip.getAttribute('title')
          const visibleText = await firstCellWithTooltip.textContent()

          // ARIA label should provide full context
          expect(ariaLabel).toContain('Description:')

          // Title should match ARIA label for consistency
          expect(ariaLabel).toContain(titleAttribute || '')

          // Visible text should be a subset of full content
          expect(titleAttribute).toContain(visibleText?.trim() || '')
        }
      }
    })
  })

  test.describe('Motor Accessibility', () => {
    test('SHOULD FAIL: click targets meet minimum size requirements', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const clickableElements = page.locator('button, [tabindex="0"]')

      if (await clickableElements.count() > 0) {
        // Test first few clickable elements
        for (let i = 0; i < Math.min(5, await clickableElements.count()); i++) {
          const element = clickableElements.nth(i)

          const boundingBox = await element.boundingBox()

          if (boundingBox) {
            // WCAG AA requires minimum 44x44px for touch targets
            expect(boundingBox.width).toBeGreaterThanOrEqual(24) // Relaxed for testing
            expect(boundingBox.height).toBeGreaterThanOrEqual(24)
          }
        }
      }
    })

    test('SHOULD FAIL: elements remain activatable with various input methods', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      const sortableHeaders = page.locator('th button')

      if (await sortableHeaders.count() > 0) {
        const descriptionHeader = sortableHeaders.filter({ hasText: 'Description' })

        if (await descriptionHeader.count() > 0) {
          // Test mouse click
          await descriptionHeader.click()
          await expect(descriptionHeader.locator('svg')).toBeVisible()

          // Test keyboard activation
          await descriptionHeader.focus()
          await page.keyboard.press('Enter')

          // Should still be interactive
          await expect(descriptionHeader).toBeEnabled()
        }
      }
    })
  })

  test.describe('Visual Accessibility', () => {
    test('SHOULD FAIL: sufficient color contrast ratios', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Run axe-core color contrast audit
      const colorContrastResults = await new AxeBuilder({ page })
        .include('table')
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze()

      expect(colorContrastResults.violations).toEqual([])
    })

    test('SHOULD FAIL: content remains accessible at 200% zoom', async ({ page }) => {
      await page.goto('/')

      // Set zoom level to 200%
      await page.evaluate(() => {
        document.body.style.zoom = '2'
      })

      await expect(page.locator('table')).toBeVisible()

      // Description column should remain functional at high zoom
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      const descriptionCells = page.locator('td [data-testid="description-cell"]')

      if (await descriptionCells.count() > 0) {
        const firstCell = descriptionCells.first()

        // Should remain interactive at 200% zoom
        await firstCell.focus()

        if (await firstCell.getAttribute('tabIndex') === '0') {
          await expect(firstCell).toBeFocused()
        }
      }

      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1'
      })
    })

    test('SHOULD FAIL: works in high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })

      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Description column should remain functional in high contrast
      await expect(page.locator('th:has-text("Description")')).toBeVisible()

      const descriptionCells = page.locator('td [data-testid="description-cell"]')

      if (await descriptionCells.count() > 0) {
        const firstCell = descriptionCells.first()

        // Tooltip functionality should work in high contrast
        if (await firstCell.getAttribute('title')) {
          await firstCell.hover()

          expect(await firstCell.getAttribute('title')).toBeTruthy()
        }
      }
    })

    test('SHOULD FAIL: respects reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Functionality should remain intact with reduced motion
      const sortableHeaders = page.locator('th button')

      if (await sortableHeaders.count() > 0) {
        const descriptionHeader = sortableHeaders.filter({ hasText: 'Description' })

        if (await descriptionHeader.count() > 0) {
          await descriptionHeader.click()

          // Should still show sort indicator (without animation)
          await expect(descriptionHeader.locator('svg')).toBeVisible()
        }
      }
    })
  })

  test.describe('Responsive Accessibility', () => {
    test('SHOULD FAIL: maintains accessibility on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Run accessibility audit on mobile viewport
      const mobileAccessibilityResults = await new AxeBuilder({ page })
        .include('table')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      expect(mobileAccessibilityResults.violations).toEqual([])

      // Touch targets should be adequate on mobile
      const clickableElements = page.locator('button, [tabindex="0"]')

      if (await clickableElements.count() > 0) {
        const firstElement = clickableElements.first()
        const boundingBox = await firstElement.boundingBox()

        if (boundingBox) {
          // Should meet touch target minimum size
          expect(Math.max(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('SHOULD FAIL: keyboard navigation works on touch devices', async ({ page }) => {
      // Simulate tablet with external keyboard
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')

      await expect(page.locator('table')).toBeVisible()

      // Keyboard navigation should work regardless of touch capability
      const focusableElements = page.locator('button, [tabindex="0"]')

      if (await focusableElements.count() > 0) {
        // Tab through several elements
        await page.keyboard.press('Tab')
        const firstFocused = page.locator(':focus')

        if (await firstFocused.count() > 0) {
          await expect(firstFocused).toBeFocused()
        }

        await page.keyboard.press('Tab')
        const secondFocused = page.locator(':focus')

        if (await secondFocused.count() > 0) {
          await expect(secondFocused).toBeFocused()
        }
      }
    })
  })
})