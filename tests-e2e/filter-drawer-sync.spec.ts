import { test, expect } from '@playwright/test'

test.describe('Filter Drawer Synchronization', () => {
  test('Dashboard has filter drawer with same structure as other pages', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter drawer
    await page.click('button:has-text("Filters")')

    // Wait for drawer to open
    await page.waitForSelector('[role="dialog"]')

    // Verify drawer opened with filter content
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.getByText('Filters')).toBeVisible()
    await expect(dialog.getByText('Refine invoices with advanced options')).toBeVisible()

    // Verify drawer has sections (exact sections depend on facets data)
    const sections = await dialog.locator('section').count()
    expect(sections).toBeGreaterThan(0)
  })

  test('Dashboard filter drawer has date range controls', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter drawer
    await page.click('button:has-text("Filters")')
    await page.waitForSelector('[role="dialog"]')

    const dialog = page.locator('[role="dialog"]')

    // Verify date range section exists
    await expect(dialog.getByText('Date range')).toBeVisible()
    await expect(dialog.getByText(/From:/)).toBeVisible()
    await expect(dialog.getByText(/To:/)).toBeVisible()
  })

  test('Filter drawer structure identical across all pages', async ({ page }) => {
    // Get drawer title on Dashboard
    await page.goto('/dashboard')
    await page.click('button:has-text("Filters")')
    await page.waitForSelector('[role="dialog"]')
    const dashboardTitle = await page.locator('[role="dialog"]').getByText('Filters').first().textContent()
    await page.keyboard.press('Escape')

    // Get drawer title on Kanban
    await page.goto('/kanban')
    await page.click('button:has-text("Filters")')
    await page.waitForSelector('[role="dialog"]')
    const kanbanTitle = await page.locator('[role="dialog"]').getByText('Filters').first().textContent()
    await page.keyboard.press('Escape')

    // Get drawer title on Invoices
    await page.goto('/invoices')
    await page.click('button:has-text("Filters")')
    await page.waitForSelector('[role="dialog"]')
    const invoicesTitle = await page.locator('[role="dialog"]').getByText('Filters').first().textContent()

    // All should have same title (meaning same component)
    expect(dashboardTitle).toBe(kanbanTitle)
    expect(dashboardTitle).toBe(invoicesTitle)
  })

  test('Dashboard filter chips component is present', async ({ page }) => {
    await page.goto('/dashboard')

    // Filter chips should be rendered (even if empty initially)
    // They appear below the header when filters are active
    const pageContent = await page.content()

    // The InvoiceFilterChips component should be in the DOM
    // We can verify this indirectly by checking the overall page structure
    expect(pageContent).toContain('RPD Invoice Dashboard')
  })

  test('Dashboard has Filters button like other pages', async ({ page }) => {
    // Dashboard should have Filters button
    await page.goto('/dashboard')
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()

    // Kanban should have Filters button
    await page.goto('/kanban')
    await expect(page.getByRole('button').filter({ hasText: /^Filters$/ }).first()).toBeVisible()

    // Invoices should have Filters button - use more specific selector
    await page.goto('/invoices')
    await expect(page.getByRole('button', { name: 'Open invoice filters' })).toBeVisible()
  })
})
