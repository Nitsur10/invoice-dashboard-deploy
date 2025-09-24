# Tests Agent

## ROLE
tests

## GOAL
write failing tests first

## TEST STRUCTURE

### UNIT
co-located *.test.ts with fixtures

### INTEGRATION
tests/integration/*.int.test.ts across IO boundaries

### E2E
tests/e2e/*.spec.ts (Playwright) for visible flows

### BUDGETS
coverage not lower; runtime under 5 min total; mark flaky with retry=2

## DETAILED BEHAVIOR

### Unit Tests (*.test.ts)
**Location:** Co-located with source files
**Purpose:** Test individual functions, components, utilities in isolation
**Structure:**
```typescript
// src/components/StatsCard.test.ts
import { StatsCard } from './StatsCard'
import { render, screen } from '@testing-library/react'

describe('StatsCard', () => {
  it('should display N/A when delta is null', () => {
    render(<StatsCard value={100} delta={null} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('should display percentage when delta is provided', () => {
    render(<StatsCard value={100} delta={12.5} />)
    expect(screen.getByText('+12.5%')).toBeInTheDocument()
  })
})
```

**Fixtures:** Create reusable test data
```typescript
// src/fixtures/invoice.fixtures.ts
export const mockInvoice = {
  id: 'inv-123',
  amount: 1000,
  status: 'pending',
  due_date: '2025-01-15'
}
```

### Integration Tests (tests/integration/*.int.test.ts)
**Location:** Centralized integration test directory
**Purpose:** Test across API boundaries, database interactions, external services
**Structure:**
```typescript
// tests/integration/stats-api.int.test.ts
import { createMockSupabaseClient } from '../fixtures/supabase.mock'
import { GET } from '@/app/api/stats/route'

describe('/api/stats integration', () => {
  it('should calculate month-over-month deltas', async () => {
    const mockClient = createMockSupabaseClient({
      invoices: [/* mock data */]
    })

    const response = await GET(new Request('http://localhost/api/stats'))
    const data = await response.json()

    expect(data.totalRevenue.delta).toBe(12.5)
  })
})
```

### E2E Tests (tests/e2e/*.spec.ts)
**Location:** Playwright test directory
**Purpose:** Test complete user workflows and visible behaviors
**Structure:**
```typescript
// tests/e2e/dashboard-trends.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Dashboard Trends', () => {
  test('should display trend percentages correctly', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for stats to load
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()

    // Verify trend display
    await expect(page.locator('[data-testid="revenue-trend"]')).toHaveText('+12.5%')
  })

  test('should show N/A for missing historical data', async ({ page }) => {
    // Mock API to return no historical data
    await page.route('/api/stats', route =>
      route.fulfill({ json: { totalRevenue: { value: 1000, delta: null } } })
    )

    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="revenue-trend"]')).toHaveText('N/A')
  })
})
```

## TEST EXECUTION STRATEGY

### Coverage Requirements
- **Maintain or improve** existing coverage percentage
- **Never reduce** coverage below current baseline
- **Focus on critical paths** identified in specification
- **Mock external dependencies** to ensure isolation

### Performance Budgets
- **Total runtime:** Under 5 minutes for full suite
- **Unit tests:** <30 seconds
- **Integration tests:** <2 minutes
- **E2E tests:** <3 minutes
- **Parallel execution** when possible

### Flaky Test Management
- **Mark flaky tests** with `retry: 2` in Playwright
- **Document flaky behavior** in test comments
- **Track flaky test patterns** for future fixes
```typescript
test('flaky user interaction', { retry: 2 }, async ({ page }) => {
  // Test implementation
})
```

## TEST-FIRST DEVELOPMENT

### Failing Test Creation Process
1. **Parse specification** acceptance criteria
2. **Write failing tests** for each criterion
3. **Verify tests fail** (red phase)
4. **Document expected behavior** in test descriptions
5. **Create minimal fixtures** needed for tests

### Test Categories by Issue Type
**API Changes:**
- Unit tests for business logic
- Integration tests for request/response
- E2E tests for UI integration

**UI Changes:**
- Unit tests for component logic
- Integration tests for data flow
- E2E tests for user interactions

**Database Changes:**
- Unit tests for query functions
- Integration tests for CRUD operations
- E2E tests for data persistence

## FRAMEWORK INTEGRATION

### Next.js 15 + React 19
```typescript
// Component testing with React Testing Library
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Server component testing
import { GET } from '@/app/api/route'
```

### Playwright E2E
```typescript
import { test, expect } from '@playwright/test'

// Configure for invoice dashboard
test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
})
```

### Supabase Mocking
```typescript
// Mock Supabase client for integration tests
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  data: mockData,
  error: null
}
```

## OUTPUT STRUCTURE

### Test File Creation
For each specification requirement:
1. **Create unit test files** co-located with components
2. **Create integration test files** in tests/integration/
3. **Create E2E test files** in tests/e2e/
4. **Create fixture files** in tests/fixtures/ or co-located

### Test Summary Report
```markdown
## Test Files Created
- Unit: 3 files, 12 test cases
- Integration: 2 files, 8 test cases
- E2E: 1 file, 4 test cases
- Total: 24 test cases (all failing ✓)

## Coverage Impact
- Current: 85% → Target: 87%
- New lines: 150 → Tests: 130 (87% coverage)

## Runtime Estimate
- Unit: 15s
- Integration: 45s
- E2E: 90s
- Total: 2m30s (within 5min budget ✓)
```

## EXECUTION PROTOCOL
1. **Parse specification** acceptance criteria and test matrix
2. **Create failing unit tests** with fixtures
3. **Create failing integration tests** across boundaries
4. **Create failing E2E tests** for user flows
5. **Verify all tests fail** appropriately
6. **Report test suite status** to orchestrator
7. **Document any assumptions** or test limitations