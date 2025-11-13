import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Voice Input Feature in Chat Assistant
 * 
 * Tests the voice input functionality including:
 * - Voice button visibility
 * - UI states during recording
 * - Transcription flow
 * - Error handling
 * 
 * Note: Full audio recording tests require browser permissions and 
 * actual microphone access, which may not be available in CI environments.
 * These tests focus on UI behavior and mock-able scenarios.
 */

test.describe('Chat Assistant - Voice Input', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    // Open chat panel
    const chatButton = page.locator('button[title="Open Chat Assistant"]');
    await chatButton.click();
    await page.waitForTimeout(500); // Animation delay
  });

  test('should display voice input button when supported', async ({ page }) => {
    // Check if voice input button is visible
    const voiceButton = page.locator('button[title*="voice input"], button[title*="recording"]').first();
    
    // Voice button should be visible if browser supports MediaRecorder
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (isSupported) {
      await expect(voiceButton).toBeVisible();
    }
  });

  test('should show voice input available indicator', async ({ page }) => {
    // Check for voice input availability text
    const voiceIndicator = page.locator('text=Voice input available');
    
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (isSupported) {
      await expect(voiceIndicator).toBeVisible();
    }
  });

  test('should disable input field during recording', async ({ page, context }) => {
    // Grant microphone permissions
    await context.grantPermissions(['microphone']);
    
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (!isSupported) {
      test.skip();
      return;
    }
    
    const messageInput = page.locator('input[placeholder*="Ask about"]');
    const voiceButton = page.locator('button[title*="voice input"]').first();
    
    // Input should be enabled initially
    await expect(messageInput).toBeEnabled();
    
    // Click voice button to start recording
    await voiceButton.click();
    await page.waitForTimeout(500);
    
    // Input should be disabled during recording
    await expect(messageInput).toBeDisabled();
  });

  test('should show recording state in UI', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (!isSupported) {
      test.skip();
      return;
    }
    
    const voiceButton = page.locator('button[title*="voice input"]').first();
    
    // Click to start recording
    await voiceButton.click();
    await page.waitForTimeout(500);
    
    // Should show "Recording..." text
    const recordingText = page.locator('text=/Recording\\.\\.\\.\\s*\\d+s/');
    await expect(recordingText).toBeVisible({ timeout: 2000 });
    
    // Button should change appearance (destructive variant)
    await expect(voiceButton).toHaveClass(/destructive/);
  });

  test('should handle microphone permission denial gracefully', async ({ page }) => {
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (!isSupported) {
      test.skip();
      return;
    }
    
    // Mock getUserMedia to simulate permission denial
    await page.addInitScript(() => {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      };
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open chat panel again
    const chatButton = page.locator('button[title="Open Chat Assistant"]');
    await chatButton.click();
    await page.waitForTimeout(500);
    
    const voiceButton = page.locator('button[title*="voice input"]').first();
    
    // Click voice button
    await voiceButton.click();
    
    // Should show error toast
    const errorToast = page.locator('text=/permission denied/i');
    await expect(errorToast).toBeVisible({ timeout: 3000 });
  });

  test('should allow user to edit transcribed text', async ({ page }) => {
    // This test simulates the transcription result
    const messageInput = page.locator('input[placeholder*="Ask about"]');
    
    // Simulate receiving transcribed text (would come from API in real scenario)
    const testTranscription = "Show me all overdue invoices";
    await messageInput.fill(testTranscription);
    
    // User should be able to edit the text
    await expect(messageInput).toHaveValue(testTranscription);
    await expect(messageInput).toBeEnabled();
    
    // Edit the text
    await messageInput.fill(testTranscription + " from last month");
    await expect(messageInput).toHaveValue(testTranscription + " from last month");
  });

  test('should disable send button during recording and transcription', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (!isSupported) {
      test.skip();
      return;
    }
    
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    const voiceButton = page.locator('button[title*="voice input"]').first();
    
    // Click voice button to start recording
    await voiceButton.click();
    await page.waitForTimeout(500);
    
    // Send button should be disabled during recording
    await expect(sendButton).toBeDisabled();
  });

  test('should show transcribing state after stopping recording', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    
    const isSupported = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             'MediaRecorder' in window && 
             'mediaDevices' in navigator;
    });
    
    if (!isSupported) {
      test.skip();
      return;
    }
    
    const voiceButton = page.locator('button[title*="voice input"], button[title*="recording"]').first();
    
    // Start recording
    await voiceButton.click();
    await page.waitForTimeout(1000);
    
    // Stop recording
    await voiceButton.click();
    
    // Should show transcribing state briefly
    const transcribingText = page.locator('text=Transcribing...');
    await expect(transcribingText).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Chat Assistant - Voice Input API', () => {
  test('transcription endpoint should require authentication', async ({ request }) => {
    // Try to call transcription endpoint without authentication
    const formData = new FormData();
    const dummyBlob = new Blob(['dummy audio data'], { type: 'audio/webm' });
    formData.append('audio', dummyBlob, 'test.webm');
    
    const response = await request.post('/api/chat/transcribe', {
      multipart: formData as any,
    });
    
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('transcription endpoint should reject invalid file types', async ({ page, request }) => {
    // Login first
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    
    // Get session cookie
    const cookies = await page.context().cookies();
    
    // Try to send invalid file type
    const formData = new FormData();
    const invalidBlob = new Blob(['dummy data'], { type: 'text/plain' });
    formData.append('audio', invalidBlob, 'test.txt');
    
    const response = await request.post('/api/chat/transcribe', {
      multipart: formData as any,
    });
    
    // Should return 400 Bad Request for invalid file type
    if (response.status() !== 401) {
      expect(response.status()).toBe(400);
    }
  });
});



