import { test as setup, expect } from '@playwright/test';

const authFile = 'tests-e2e/.auth/user.json';

/**
 * Authentication Setup for Playwright Tests
 * 
 * This setup runs once before all tests to authenticate with Supabase
 * and save the authentication state for reuse across test files.
 * 
 * Usage:
 * 1. Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local
 * 2. Update playwright.config.ts to include this setup
 * 3. Run tests - authentication will happen automatically
 */

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Get credentials from environment
  const email = process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'test-password';
  
  if (!process.env.TEST_USER_EMAIL) {
    console.warn('⚠️  TEST_USER_EMAIL not set, using default');
  }
  
  // Fill in login form
  // Adjust selectors based on your actual login form
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"], button:has-text("Sign in")');
  
  // Wait for successful login (redirect to dashboard)
  await page.waitForURL('/overview', { timeout: 10000 });
  
  // Verify we're logged in
  await expect(page).toHaveURL(/\/(overview|dashboard)/);
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication setup complete');
});

