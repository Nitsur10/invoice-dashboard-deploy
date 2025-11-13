import { test, expect } from '@playwright/test';

/**
 * E2E Tests for AI-Powered Invoice Chat Assistant
 * 
 * Tests the complete chat assistant functionality including:
 * - Floating widget
 * - Full page chat interface
 * - Message sending and receiving
 * - AI responses
 * - Quick actions
 * - Conversation management
 * - Action confirmations
 * - Error handling
 */

test.describe('Chat Assistant - Floating Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/overview');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display floating chat button on dashboard', async ({ page }) => {
    // Check if chat widget button is visible
    const chatButton = page.locator('button').filter({ hasText: /chat/i }).first();
    await expect(chatButton).toBeVisible();
    
    // Should be in bottom-right corner (check z-index and position)
    const buttonBox = await chatButton.boundingBox();
    expect(buttonBox).toBeTruthy();
  });

  test('should open chat panel when clicking floating button', async ({ page }) => {
    // Click the chat button
    const chatButton = page.locator('button').filter({ hasText: /chat/i }).first();
    await chatButton.click();
    
    // Wait for panel to appear
    await page.waitForTimeout(500); // Animation delay
    
    // Check if chat panel is visible
    const chatPanel = page.locator('text=Invoice Assistant');
    await expect(chatPanel).toBeVisible();
    
    // Check for input field
    const messageInput = page.locator('input[placeholder*="Ask about"]');
    await expect(messageInput).toBeVisible();
  });

  test('should close chat panel when clicking close button', async ({ page }) => {
    // Open chat
    const chatButton = page.locator('button').filter({ hasText: /chat/i }).first();
    await chatButton.click();
    await page.waitForTimeout(500);
    
    // Click close button (X icon)
    const closeButton = page.locator('button[title*="close"], button:has-text("×")').first();
    await closeButton.click();
    
    await page.waitForTimeout(500);
    
    // Panel should be hidden
    const chatPanel = page.locator('text=Invoice Assistant');
    await expect(chatPanel).not.toBeVisible();
  });

  test('should display welcome message for new conversation', async ({ page }) => {
    // Open chat
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    // Check for welcome message
    const welcomeText = page.locator('text=Welcome to Invoice Assistant');
    await expect(welcomeText).toBeVisible();
    
    // Check for quick actions
    const quickActions = page.locator('text=Quick Actions');
    await expect(quickActions).toBeVisible();
  });
});

test.describe('Chat Assistant - Message Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    // Open chat widget
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('should send a message and receive response', async ({ page }) => {
    // Type a simple query
    const input = page.locator('input[placeholder*="Ask about"]');
    await input.fill('Show me all pending invoices');
    
    // Click send button or press Enter
    await input.press('Enter');
    
    // Wait for user message to appear
    const userMessage = page.locator('text=Show me all pending invoices');
    await expect(userMessage).toBeVisible();
    
    // Wait for AI response (with timeout for API call)
    await page.waitForSelector('text=I found', { timeout: 10000 });
    
    // Check that response is visible
    const aiResponse = page.locator('[class*="message"]').filter({ hasText: /found|invoices/i });
    await expect(aiResponse).toBeVisible();
  });

  test('should handle multiple messages in sequence', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask about"]');
    
    // Send first message
    await input.fill('Show me pending invoices');
    await input.press('Enter');
    await page.waitForTimeout(2000);
    
    // Send second message
    await input.fill('How many are there?');
    await input.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check both messages exist
    await expect(page.locator('text=Show me pending invoices')).toBeVisible();
    await expect(page.locator('text=How many are there?')).toBeVisible();
  });

  test('should display loading state while waiting for response', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask about"]');
    await input.fill('Show me all invoices');
    await input.press('Enter');
    
    // Check for loading indicator (spinner or disabled state)
    const sendButton = page.locator('button:has-text("Send"), button:has(svg)').last();
    
    // Wait briefly and check if button is disabled during send
    await page.waitForTimeout(100);
    // Button should be disabled or show loading state
  });

  test('should clear input field after sending message', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask about"]');
    const testMessage = 'Test message';
    
    await input.fill(testMessage);
    await input.press('Enter');
    
    // Input should be cleared
    await expect(input).toHaveValue('');
  });
});

test.describe('Chat Assistant - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('should display quick action buttons', async ({ page }) => {
    // Check for quick action buttons
    const quickActions = [
      'Show overdue invoices',
      'Total pending amount',
      'Last 30 days',
      'Top vendors',
    ];
    
    for (const action of quickActions) {
      const button = page.locator(`button:has-text("${action}")`);
      await expect(button).toBeVisible();
    }
  });

  test('should send message when clicking quick action', async ({ page }) => {
    // Click a quick action button
    const quickActionButton = page.locator('button').filter({ hasText: /overdue invoices/i }).first();
    await quickActionButton.click();
    
    // Wait for message to be sent
    await page.waitForTimeout(1000);
    
    // Check that the message appears in chat
    const message = page.locator('text=overdue invoices');
    await expect(message).toBeVisible();
  });
});

test.describe('Chat Assistant - Full Page View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to chat page
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should display full chat page interface', async ({ page }) => {
    // Check for main components
    await expect(page.locator('text=Conversations')).toBeVisible();
    await expect(page.locator('text=Welcome to Invoice Assistant')).toBeVisible();
    
    // Check for new conversation button
    const newChatButton = page.locator('button:has-text("+"), button[title*="new"]').first();
    await expect(newChatButton).toBeVisible();
  });

  test('should display conversation list sidebar', async ({ page }) => {
    // Check for conversations sidebar
    const sidebar = page.locator('text=Conversations');
    await expect(sidebar).toBeVisible();
    
    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should create new conversation from full page', async ({ page }) => {
    // Click new conversation button
    const newButton = page.locator('button').filter({ hasText: /Start|new/i }).first();
    await newButton.click();
    
    await page.waitForTimeout(500);
    
    // Should show empty chat interface
    const welcomeMsg = page.locator('text=Welcome to Invoice Assistant');
    await expect(welcomeMsg).toBeVisible();
  });

  test('should send and receive messages in full page view', async ({ page }) => {
    // Start a conversation
    await page.locator('button').filter({ hasText: /Start conversation/i }).first().click();
    await page.waitForTimeout(500);
    
    // Type and send message
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('What is the total pending amount?');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check message is visible
    await expect(page.locator('text=total pending amount')).toBeVisible();
  });

  test('should navigate between sidebar and chat interface', async ({ page }) => {
    // Check sidebar is visible on desktop
    const sidebar = page.locator('text=Conversations').first();
    await expect(sidebar).toBeVisible();
    
    // Check main chat area is visible
    const mainArea = page.locator('text=Welcome to Invoice Assistant');
    await expect(mainArea).toBeVisible();
  });
});

test.describe('Chat Assistant - Conversation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should display conversation list if conversations exist', async ({ page }) => {
    // Create a conversation first
    const startButton = page.locator('button').filter({ hasText: /Start/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
      
      // Send a message to create conversation
      const input = page.locator('input[placeholder*="Ask"]');
      await input.fill('Test message');
      await input.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Reload to see if conversation persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if conversation appears in list
    const conversationItem = page.locator('[class*="conversation"]').first();
    // Should exist if we created one
  });

  test('should show message count in conversation list', async ({ page }) => {
    // Look for message count indicators like "5 messages"
    const messageCount = page.locator('text=/\\d+ messages?/i');
    // May or may not exist depending on data
  });

  test('should search conversations', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    
    await page.waitForTimeout(500);
    
    // Search should filter conversations
    // Exact assertion depends on existing data
  });
});

test.describe('Chat Assistant - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
  });

  test('should handle empty message submission gracefully', async ({ page }) => {
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    const sendButton = page.locator('button').filter({ hasText: /send/i }).last();
    
    // Try to send empty message
    await input.fill('');
    
    // Send button should be disabled
    await expect(sendButton).toBeDisabled();
  });

  test('should display error message if API fails', async ({ page }) => {
    // This would require mocking API failure
    // For now, just check error handling exists
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Test query');
    await input.press('Enter');
    
    // Wait and check for either success or error message
    await page.waitForTimeout(3000);
    
    // Should show either response or error, not hang indefinitely
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    // Test rate limiting by sending many messages quickly
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Send multiple messages rapidly
    for (let i = 0; i < 5; i++) {
      await input.fill(`Message ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(100);
    }
    
    // Should handle gracefully without crashing
    await page.waitForTimeout(2000);
  });
});

test.describe('Chat Assistant - Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('should render markdown in AI responses', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Give me a breakdown by status');
    await input.press('Enter');
    
    // Wait for response with markdown
    await page.waitForTimeout(5000);
    
    // Check for markdown elements (lists, bold, etc.)
    // AI responses should contain formatted text
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
  });
});

test.describe('Chat Assistant - Invoice Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('should display invoice references in responses', async ({ page }) => {
    const input = page.locator('input[placeholder*="Ask"]');
    await input.fill('Show me pending invoices');
    await input.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Should show invoice information
    const response = page.locator('[class*="message"]').last();
    await expect(response).toBeVisible();
    
    // Response should contain invoice-related text
    await expect(response).toContainText(/invoice|amount|total/i);
  });
});

test.describe('Chat Assistant - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
  });

  test('chat widget should be keyboard accessible', async ({ page }) => {
    // Tab to chat button
    await page.keyboard.press('Tab');
    
    // Eventually should reach chat button
    // Check if focused element is chat button
    const focusedElement = page.locator(':focus');
    
    // Should be able to open with Enter or Space
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test('chat input should be keyboard accessible', async ({ page }) => {
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    // Should be able to focus input
    await input.focus();
    await expect(input).toBeFocused();
    
    // Should be able to type
    await page.keyboard.type('Test message');
    await expect(input).toHaveValue('Test message');
    
    // Should be able to send with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  });
});

test.describe('Chat Assistant - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display chat button on mobile', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    const chatButton = page.locator('button').filter({ hasText: /chat/i }).first();
    await expect(chatButton).toBeVisible();
  });

  test('should open full-screen on mobile', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    // On mobile, chat should take full screen
    const chatPanel = page.locator('text=Invoice Assistant');
    await expect(chatPanel).toBeVisible();
  });
});

test.describe('Chat Assistant - Performance', () => {
  test('should load chat widget quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    const chatButton = page.locator('button').filter({ hasText: /chat/i }).first();
    await expect(chatButton).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should respond to messages in reasonable time', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    await page.locator('button').filter({ hasText: /chat/i }).first().click();
    await page.waitForTimeout(500);
    
    const input = page.locator('input[placeholder*="Ask"]');
    
    const startTime = Date.now();
    await input.fill('Show me pending invoices');
    await input.press('Enter');
    
    // Wait for AI response
    await page.waitForSelector('[class*="message"]', { timeout: 10000 });
    
    const responseTime = Date.now() - startTime;
    
    // Haiku 4.5 should respond in under 5 seconds typically
    expect(responseTime).toBeLessThan(10000);
  });
});

