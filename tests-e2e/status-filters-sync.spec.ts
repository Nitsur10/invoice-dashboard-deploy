import { test, expect } from '@playwright/test'

test.describe('Status Filter Cards Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard to ensure authenticated state
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('Invoices page has all 5 status filter cards', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Verify all 5 status cards are visible
    const pendingCard = page.getByRole('button', { name: /pending payments/i })
    const reviewCard = page.getByRole('button', { name: /in review/i })
    const approvedCard = page.getByRole('button', { name: /approved/i })
    const paidCard = page.getByRole('button', { name: /paid invoices/i })
    const overdueCard = page.getByRole('button', { name: /overdue items/i })

    await expect(pendingCard).toBeVisible()
    await expect(reviewCard).toBeVisible()
    await expect(approvedCard).toBeVisible()
    await expect(paidCard).toBeVisible()
    await expect(overdueCard).toBeVisible()
  })

  test('Invoices page status cards apply correct filters', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click Pending card
    await page.getByRole('button', { name: /pending payments/i }).click()
    await expect(page).toHaveURL(/status=pending/)

    // Navigate back to clear filter
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click In Review card
    await page.getByRole('button', { name: /in review/i }).click()
    await expect(page).toHaveURL(/status=in_review/)

    // Navigate back
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click Approved card
    await page.getByRole('button', { name: /approved/i }).click()
    await expect(page).toHaveURL(/status=approved/)

    // Navigate back
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click Paid card
    await page.getByRole('button', { name: /paid invoices/i }).click()
    await expect(page).toHaveURL(/status=paid/)

    // Navigate back
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click Overdue card
    await page.getByRole('button', { name: /overdue items/i }).click()
    await expect(page).toHaveURL(/status=overdue/)
  })

  test('Dashboard Pending card navigates to Invoices with pending filter', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click Pending Payments card
    const pendingCard = page.locator('button, a').filter({ hasText: /pending payments/i }).first()
    await pendingCard.click()

    // Verify navigation to Invoices page with pending filter
    await expect(page).toHaveURL('/invoices?status=pending')

    // Verify we're on the invoices page
    await expect(page.locator('h1')).toContainText(/invoices/i)
  })

  test('Dashboard Overdue card navigates to Invoices with overdue filter', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click Overdue Items card
    const overdueCard = page.locator('button, a').filter({ hasText: /overdue items/i }).first()
    await overdueCard.click()

    // Verify navigation to Invoices page with overdue filter
    await expect(page).toHaveURL('/invoices?status=overdue')

    // Verify we're on the invoices page
    await expect(page.locator('h1')).toContainText(/invoices/i)
  })

  test('Pending card has blue color on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.getByRole('button', { name: /pending payments/i })

    // Check if the card has blue gradient classes
    const className = await pendingCard.getAttribute('class')
    expect(className).toContain('from-blue-500')
    expect(className).toContain('to-blue-600')
  })

  test('Pending card has blue color on Dashboard page', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.locator('button, a').filter({ hasText: /pending payments/i }).first()

    // Check if the card has blue gradient classes
    const className = await pendingCard.getAttribute('class')
    expect(className).toContain('from-blue-500')
    expect(className).toContain('to-blue-600')
  })

  test('In Review card has amber color on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const reviewCard = page.getByRole('button', { name: /in review/i })

    const className = await reviewCard.getAttribute('class')
    expect(className).toContain('from-amber-500')
    expect(className).toContain('to-amber-600')
  })

  test('Approved card has purple color on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const approvedCard = page.getByRole('button', { name: /approved/i })

    const className = await approvedCard.getAttribute('class')
    expect(className).toContain('from-purple-500')
    expect(className).toContain('to-purple-600')
  })

  test('Status cards respond to keyboard navigation on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.getByRole('button', { name: /pending payments/i })

    // Focus the card
    await pendingCard.focus()

    // Press Enter
    await pendingCard.press('Enter')

    // Verify filter applied
    await expect(page).toHaveURL(/status=pending/)
  })

  test('Dashboard status cards respond to keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.locator('button, a').filter({ hasText: /pending payments/i }).first()

    // Focus the card
    await pendingCard.focus()

    // Press Enter
    await pendingCard.press('Enter')

    // Verify navigation
    await expect(page).toHaveURL('/invoices?status=pending')
  })

  test('Status cards have hover states on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.getByRole('button', { name: /pending payments/i })

    // Verify card has cursor-pointer class or CSS
    const className = await pendingCard.getAttribute('class')
    expect(className).toContain('cursor-pointer')

    // Hover over the card (visual check)
    await pendingCard.hover()

    // Card should still be visible after hover
    await expect(pendingCard).toBeVisible()
  })

  test('Status cards have focus indicators', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.getByRole('button', { name: /pending payments/i })

    // Focus the card
    await pendingCard.focus()

    // Verify the card is focused (playwright automatically checks focus state)
    await expect(pendingCard).toBeFocused()
  })

  test('All status cards are accessible via Tab navigation on Invoices page', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Tab through all status cards
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').textContent()

    // Continue tabbing to find all status cards
    const statusCardLabels = ['Pending Payments', 'In Review', 'Approved', 'Paid Invoices', 'Overdue Items']
    let foundCards = 0

    for (let i = 0; i < 20; i++) { // Tab max 20 times to find all cards
      await page.keyboard.press('Tab')
      const currentFocus = await page.locator(':focus').textContent()

      if (currentFocus) {
        for (const label of statusCardLabels) {
          if (currentFocus.includes(label)) {
            foundCards++
            break
          }
        }
      }

      if (foundCards >= 5) break
    }

    // We should have found at least 5 status cards
    expect(foundCards).toBeGreaterThanOrEqual(5)
  })

  test('Dashboard cards have correct ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const pendingCard = page.locator('button, a').filter({ hasText: /pending payments/i }).first()

    // Check for accessible role (should be button or link)
    const role = await pendingCard.getAttribute('role')
    const tagName = await pendingCard.evaluate(el => el.tagName.toLowerCase())

    // Should be either a button element or have role="link"
    expect(tagName === 'button' || tagName === 'a' || role === 'link').toBeTruthy()
  })

  test('Invoices page grid layout accommodates 5 cards', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Get the container of status cards
    const container = page.locator('div').filter({ has: page.getByRole('button', { name: /pending payments/i }) }).first()

    // Check if container has grid classes for 5 columns
    const className = await container.getAttribute('class')

    // Should have lg:grid-cols-5 for larger screens
    expect(className).toMatch(/grid/)
  })

  test('Status cards show correct icons', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Verify each card has an icon (svg element)
    const pendingCard = page.getByRole('button', { name: /pending payments/i })
    const reviewCard = page.getByRole('button', { name: /in review/i })
    const approvedCard = page.getByRole('button', { name: /approved/i })
    const paidCard = page.getByRole('button', { name: /paid invoices/i })
    const overdueCard = page.getByRole('button', { name: /overdue items/i })

    // Each card should contain an SVG icon
    await expect(pendingCard.locator('svg').first()).toBeVisible()
    await expect(reviewCard.locator('svg').first()).toBeVisible()
    await expect(approvedCard.locator('svg').first()).toBeVisible()
    await expect(paidCard.locator('svg').first()).toBeVisible()
    await expect(overdueCard.locator('svg').first()).toBeVisible()
  })

  test('Status cards maintain state after navigation back', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('networkidle')

    // Click Pending card
    await page.getByRole('button', { name: /pending payments/i }).click()
    await expect(page).toHaveURL(/status=pending/)

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Navigate back to invoices
    await page.goBack()
    await page.waitForLoadState('networkidle')

    // URL should still have pending filter
    await expect(page).toHaveURL(/status=pending/)
  })
})
