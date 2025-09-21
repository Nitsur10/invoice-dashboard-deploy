import { test, expect } from '@playwright/test'

async function ensureAuth(page: any) {
  await page.request.post('/api/auth/set', {
    data: { event: 'SIGNED_IN', session: { access_token: 'dev', refresh_token: 'dev' } },
  })
}

test('kanban-e2e: drag first Overdue card to In Review', async ({ page }) => {
  await page.goto('/kanban-e2e')
  await expect(page.locator('[data-column-id="overdue"]').first()).toBeVisible()

  const overdueColumn = page.locator('[data-column-id="overdue"]').first()
  const inReviewColumn = page.locator('[data-column-id="in_review"]').first()

  const firstCard = overdueColumn.locator('[data-card-id], article, div').filter({ hasText: 'INV-' }).first()
  const firstCardText = await firstCard.innerText()

  const fromBox = await firstCard.boundingBox()
  const toBox = await inReviewColumn.boundingBox()
  if (!fromBox || !toBox) test.skip()

  await page.mouse.move(fromBox.x + fromBox.width/2, fromBox.y + fromBox.height/2)
  await page.mouse.down()
  await page.mouse.move(toBox.x + toBox.width/2, toBox.y + 40, { steps: 10 })
  await page.mouse.up()

  await expect(inReviewColumn).toContainText(firstCardText.trim().slice(0, 8))
})

test('kanban: drag first Overdue card to In Review (parity)', async ({ page }) => {
  await ensureAuth(page)
  await page.goto('/kanban')
  await expect(page.locator('[data-column-id="overdue"]').first()).toBeVisible()

  const overdueColumn = page.locator('[data-column-id="overdue"]').first()
  const inReviewColumn = page.locator('[data-column-id="in_review"]').first()

  // cards may not have data-card-id; fall back to first card-like element
  const firstCard = overdueColumn.locator('[data-card-id], article, div').filter({ hasText: /INV-|Invoice|Vendor|Subject/i }).first()
  const firstCardSnippet = (await firstCard.innerText()).trim().slice(0, 12)

  const fromBox = await firstCard.boundingBox()
  const toBox = await inReviewColumn.boundingBox()
  if (!fromBox || !toBox) test.skip()

  await page.mouse.move(fromBox.x + fromBox.width/2, fromBox.y + fromBox.height/2)
  await page.mouse.down()
  await page.mouse.move(toBox.x + toBox.width/2, toBox.y + 50, { steps: 10 })
  await page.mouse.up()

  await expect(inReviewColumn).toContainText(firstCardSnippet)
})


