# Chat Assistant Test Suite

## Quick Start

### Run All Tests
```bash
./scripts/test-chat-assistant.sh
```

### Run Specific Tests
```bash
# UI tests only
npm test -- chat-assistant.spec.ts

# Integration tests only  
npm test -- chat-assistant-integration.spec.ts

# Single test
npm test -- chat-assistant.spec.ts -g "should display floating chat button"
```

### Interactive Mode
```bash
npm run test:ui -- chat-assistant
```

## Test Files

- `chat-assistant.spec.ts` - 30 UI/UX tests
- `chat-assistant-integration.spec.ts` - 12 integration tests

## What's Tested

✅ **42 Total Tests Covering:**
- Floating widget behavior
- Message sending/receiving
- AI responses
- Quick actions
- Full-page interface
- Conversation persistence
- Error handling
- Accessibility
- Mobile responsive
- Performance
- Database integration
- Function calling
- Contextual understanding

## Requirements

1. **Dev server running** on http://localhost:3000
2. **Environment variables** set (ANTHROPIC_API_KEY, etc.)
3. **Database migrated** (run migrations/chat-assistant-schema.sql)
4. **Playwright installed** (auto-installs if needed)

## Test Results

View HTML report:
```bash
npx playwright show-report
```

## Debugging

### Failed Test
```bash
npm run test:debug -- chat-assistant.spec.ts -g "test name"
```

### Screenshots
Failed tests automatically capture screenshots in `test-results/`

### Server Logs
```bash
tail -f /tmp/next-dev.log | grep -i chat
```

