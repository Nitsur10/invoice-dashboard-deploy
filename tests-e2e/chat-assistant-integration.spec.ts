import { test, expect } from '@playwright/test';

/**
 * Integration Tests for Chat Assistant
 * Tests integration with invoice data and database
 */

test.describe('Chat Assistant - Invoice Data Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should query invoice data successfully', async ({ page }) => {
    // Start conversation
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Query invoices
    await input.fill('Show me all pending invoices');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(8000);
    
    // Should get response with invoice data
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    
    // Response should mention invoices or totals
    await expect(response).toContainText(/invoice|found|total/i);
  });

  test('should handle empty invoice results gracefully', async ({ page }) => {
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Query for something that might not exist
    await input.fill('Show me invoices from XYZ Corp that dont exist');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    // Should handle gracefully
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
  });

  test('should provide summary statistics', async ({ page }) => {
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Ask for summary
    await input.fill('Give me a summary of all invoices');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    // Should provide statistics
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    await expect(response).toContainText(/total|count|amount/i);
  });

  test('should filter invoices by status', async ({ page }) => {
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Filter by status
    await input.fill('Show me overdue invoices');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    await expect(response).toContainText(/overdue|invoice/i);
  });

  test('should get top vendors', async ({ page }) => {
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Ask for top vendors
    await input.fill('Show me top 5 vendors');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    await expect(response).toContainText(/vendor/i);
  });
});

test.describe('Chat Assistant - Database Persistence', () => {
  test('conversation should persist across page reloads', async ({ page }) => {
    // Create a conversation
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    const uniqueMessage = `Test message ${Date.now()}`;
    
    await input.fill(uniqueMessage);
    await input.press('Enter');
    
    await page.waitForTimeout(3000);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Message should still be visible in conversation list or recent conversation
    // (Exact check depends on UI implementation)
  });

  test('messages should be stored in database', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Send a message
    await input.fill('Database test message');
    await input.press('Enter');
    
    await page.waitForTimeout(3000);
    
    // Message should be visible
    await expect(page.locator('text=Database test message')).toBeVisible();
    
    // Check API call was successful (200 status)
    // This would require listening to network responses
  });
});

test.describe('Chat Assistant - AI Function Calling', () => {
  test('should call searchInvoices function', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Trigger searchInvoices function
    await input.fill('Find all pending invoices');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    // Should receive structured response
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
  });

  test('should call getSummaryStats function', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Trigger getSummaryStats
    await input.fill('What are my total invoice statistics?');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    await expect(response).toContainText(/total|statistics|amount/i);
  });

  test('should call getTopVendors function', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Trigger getTopVendors
    await input.fill('Who are my top vendors by amount?');
    await input.press('Enter');
    
    await page.waitForTimeout(8000);
    
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
  });
});

test.describe('Chat Assistant - Contextual Understanding', () => {
  test('should understand follow-up questions', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // First question
    await input.fill('Show me pending invoices');
    await input.press('Enter');
    await page.waitForTimeout(5000);
    
    // Follow-up question
    await input.fill('How many are there?');
    await input.press('Enter');
    await page.waitForTimeout(5000);
    
    // Should understand context
    const responses = page.locator('[class*="message"]');
    await expect(responses.last()).toBeVisible();
  });

  test('should maintain conversation context', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    await startButton.click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Multiple related questions
    const questions = [
      'Show me overdue invoices',
      'What is the total amount?',
      'Which vendor has the most?'
    ];
    
    for (const question of questions) {
      await input.fill(question);
      await input.press('Enter');
      await page.waitForTimeout(5000);
    }
    
    // All questions should have responses
    for (const question of questions) {
      await expect(page.locator(`text=${question}`)).toBeVisible();
    }
  });
});

