# Test Setup Guide - Authentication

## Quick Start (5 minutes)

### Step 1: Create Test User in Supabase

Go to your Supabase Dashboard → Authentication → Users → "Add User"

Or run this SQL in Supabase SQL Editor:

```sql
-- Create test user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) 
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '', '', '', ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'test@example.com'
);
```

### Step 2: Add Environment Variables

Add to `.env.local`:

```bash
# Test credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password-123
```

### Step 3: Update Playwright Config

Update `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html']],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  
  projects: [
    // Setup project - runs authentication once
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Actual tests - use authenticated state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests-e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### Step 4: Create Auth Directory

```bash
mkdir -p tests-e2e/.auth
echo "tests-e2e/.auth/" >> .gitignore
```

### Step 5: Run Tests!

```bash
# Run all tests with authentication
npm test -- chat-assistant

# Or use the script
./scripts/test-chat-assistant.sh
```

## Troubleshooting

### "Authentication failed" or timeout

1. **Check credentials:**
   ```bash
   echo $TEST_USER_EMAIL
   echo $TEST_USER_PASSWORD
   ```

2. **Verify test user exists in Supabase:**
   ```sql
   SELECT email, email_confirmed_at 
   FROM auth.users 
   WHERE email = 'test@example.com';
   ```

3. **Check login form selectors:**
   - Open `/login` in browser
   - Inspect form elements
   - Update selectors in `auth.setup.ts` if needed

### "Cannot find storageState file"

This means authentication setup didn't run:

```bash
# Make sure .auth directory exists
mkdir -p tests-e2e/.auth

# Run setup explicitly
npx playwright test --project=setup
```

### Tests still timing out

Check if your login flow is different:

```bash
# Run in headed mode to see what's happening
npx playwright test --project=setup --headed

# Or use UI mode
npm run test:ui
```

## Alternative: Manual Authentication

If automated auth isn't working, you can save your browser session:

1. Start Playwright in codegen mode:
   ```bash
   npx playwright codegen http://localhost:3000
   ```

2. Manually log in through the browser

3. Save the state:
   ```bash
   # In the Playwright Inspector, click "Record" then "Save Storage State"
   ```

4. Copy the JSON to `tests-e2e/.auth/user.json`

## Environment-Specific Setup

### Development
```bash
TEST_USER_EMAIL=dev@example.com
TEST_USER_PASSWORD=dev-pass
```

### CI/CD
```yaml
# .github/workflows/test.yml
env:
  TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
  TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

### Production Test
```bash
# Use separate test environment
BASE_URL=https://staging.yourapp.com
TEST_USER_EMAIL=staging-test@example.com
```

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` with credentials
- Never commit `tests-e2e/.auth/user.json`
- Use separate test database for CI/CD
- Rotate test credentials regularly
- Use weak passwords for test accounts (not production patterns)

✅ **Good practices:**
- Add `.auth/` to `.gitignore`
- Use environment-specific test users
- Separate test data from production
- Document test credentials in password manager

## Verification

After setup, verify it works:

```bash
# Should show setup test passing
npx playwright test --project=setup

# Should create auth file
ls -la tests-e2e/.auth/user.json

# Should show actual tests running
npx playwright test chat-assistant --max-failures=1
```

Expected output:
```
Running 2 tests using 1 worker
  ✓  [setup] › auth.setup.ts:15:7 › authenticate (3s)
  ✓  [chromium] › chat-assistant.spec.ts:25:7 › should display floating chat button (2s)
```

## Need Help?

1. Check `TEST_RESULTS_SUMMARY.md` for overview
2. Review `CHAT_ASSISTANT_TEST_PLAN.md` for test details
3. See Playwright docs: https://playwright.dev/docs/auth
4. Check Supabase docs: https://supabase.com/docs/guides/auth

---

Once authentication is set up, all 42 tests should run successfully! 🎉

