# Issue: UI Cleanup & Invoice Status Update Bug Fix

## Summary
Two-part issue addressing UI cleanup (disabling unused features) and a critical bug where invoice status updates via dropdown don't persist to Supabase backend.

## Problem Statement

### Part 1: Temporary UI Cleanup
**Current State:**
- Sidebar shows all navigation links (Dashboard, Invoices, Kanban, Analytics, Settings)
- Sidebar displays Monthly Growth card alongside other metrics
- Features not production-ready need to be temporarily disabled

**Impact:**
- Users can access incomplete features leading to confusion
- Dashboard shows placeholder/incomplete Monthly Growth data
- Navigation suggests full feature availability when features are partial

### Part 2: Invoice Status Update Bug (CRITICAL)
**Current State:**
- Invoice table has "Update Status" dropdown in each row
- Dropdown shows all status options (Pending, In Review, Approved, Paid, Overdue)
- Selecting a status appears to change UI but does NOT persist to Supabase
- Page refresh reverts status to original value
- No error messages shown to user

**Impact:**
- **CRITICAL DATA INTEGRITY ISSUE**: Users believe they've updated invoice status but changes are lost
- Finance team may make incorrect decisions based on stale status data
- Undermines trust in application's ability to persist data
- No feedback mechanism alerts users to failed updates
- Multiple status options create confusion when only "Paid" workflow is required

**Root Cause Analysis:**
The status update dropdown likely:
1. Updates local state/UI optimistically but doesn't call backend API
2. Calls API but API route doesn't write to Supabase
3. Calls API with incorrect parameters/schema
4. Has RLS (Row Level Security) blocking write operations
5. Lacks error handling so silent failures occur

**Expected Behavior:**
- Selecting "Paid" status should immediately update Supabase `invoices` table and also 'auditlog' table
- UI should show loading state during update
- Success: Show toast notification + persist status
- Failure: Show error toast + revert UI to original status
- Only "Paid" option should be available (disable others)

## Scope

### 1. Sidebar Navigation - Disable Features

**File:** `src/components/layout/sidebar.tsx` (or layout component)

**Changes:**
```tsx
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    disabled: false,  // Active
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    disabled: false,  // Active
  },
  {
    name: 'Kanban',
    href: '/kanban',
    icon: Kanban,
    disabled: true,  // NEW - Temporarily disabled
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    disabled: true,  // NEW - Temporarily disabled
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    disabled: true,  // NEW - Temporarily disabled
  },
]

// Update render logic
{navigationItems.map((item) => (
  <Button
    key={item.name}
    variant={isActive ? 'secondary' : 'ghost'}
    disabled={item.disabled}  // Add disabled attribute
    className={cn(
      'justify-start',
      item.disabled && 'opacity-50 cursor-not-allowed'  // Visual feedback
    )}
  >
    <item.icon className="mr-2 h-4 w-4" />
    {item.name}
    {item.disabled && (
      <Badge variant="outline" className="ml-auto text-xs">
        Soon
      </Badge>
    )}
  </Button>
))}
```

**Visual Treatment:**
- Disabled links shown with 50% opacity
- Cursor changes to `not-allowed`
- "Soon" badge added to indicate temporary status
- Links remain visible (not hidden) to show planned features
- Hover tooltip: "Coming soon"

### 2. Dashboard - Hide Monthly Growth Card

**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Changes:**
```tsx
// Find StatsCards component render (around line ~100-150)
// Option A: Comment out Monthly Growth card
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <StatsCard
    title="Total Revenue"
    value={formatCurrency(stats.totalRevenue)}
    trend={stats.revenueTrend}
  />
  <StatsCard
    title="Total Invoices"
    value={stats.totalInvoices.toString()}
    trend={stats.invoicesTrend}
  />
  <StatsCard
    title="Average Invoice"
    value={formatCurrency(stats.averageInvoice)}
    trend={stats.avgInvoiceTrend}
  />
  {/* Monthly Growth card - temporarily disabled
  <StatsCard
    title="Monthly Growth"
    value={formatPercentage(stats.monthlyGrowth)}
    trend={stats.growthTrend}
  />
  */}
</div>

// Option B: Add feature flag
const SHOW_MONTHLY_GROWTH = false;  // or process.env.NEXT_PUBLIC_SHOW_MONTHLY_GROWTH

{SHOW_MONTHLY_GROWTH && (
  <StatsCard
    title="Monthly Growth"
    value={formatPercentage(stats.monthlyGrowth)}
    trend={stats.growthTrend}
  />
)}
```

**Recommendation:** Use Option B (feature flag) for easier re-enablement

**Grid Adjustment:**
- Update grid from 4 columns to 3 columns: `lg:grid-cols-3`
- Ensures remaining cards spread evenly across space

### 3. Invoice Status Update - Fix Backend Integration

**Investigation Steps:**
1. Locate status update handler in invoice table component
2. Trace API call to backend route
3. Verify Supabase query in API route
4. Check RLS policies on `invoices` table
5. Add comprehensive error handling

**Files to Check:**
- `src/components/invoices/invoice-table.tsx` (or data-table component)
- `src/components/invoices/status-dropdown.tsx` (if exists)
- `src/app/api/invoices/[id]/route.ts` (PATCH/PUT endpoint)
- `src/lib/api/invoices.ts` (update function)

**Expected Flow:**
```
User selects "Paid" from dropdown
↓
onStatusChange handler called with (invoiceId, newStatus)
↓
Call updateInvoiceStatus(invoiceId, { status: 'paid' })
↓
POST/PATCH /api/invoices/[id] with body: { status: 'paid' }
↓
API route validates request + auth
↓
Supabase update: UPDATE invoices SET status = 'paid' WHERE id = ? AND user_id = ?
↓
Return updated invoice
↓
React Query invalidates cache + refetches
↓
UI updates + shows success toast
```

**Required Implementation:**

**A. Update Invoice API Route** (Create if missing)
```typescript
// src/app/api/invoices/[id]/route.ts

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServerComponentClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['pending', 'in_review', 'approved', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update invoice in Supabase
    const { data, error } = await supabase
      .from(process.env.SUPABASE_INVOICES_TABLE || 'invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', user.id)  // RLS enforcement
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoice: data });
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**B. Update Invoice Table Component**
```typescript
// src/components/invoices/invoice-table.tsx (or data-table.tsx)

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function InvoiceTable() {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update status');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch invoice queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      toast.success(`Invoice status updated to ${variables.status}`);
    },
    onError: (error: Error, variables) => {
      console.error('Status update failed:', error);
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleStatusChange = (invoiceId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: invoiceId, status: newStatus });
  };

  return (
    <DataTable
      columns={columns}
      data={invoices}
      onStatusChange={handleStatusChange}
      isUpdatingStatus={updateStatusMutation.isPending}
    />
  );
}
```

**C. Restrict Status Dropdown to "Paid" Only**
```typescript
// In the status dropdown column definition

{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => {
    const currentStatus = row.getValue('status') as string;

    return (
      <Select
        value={currentStatus}
        onValueChange={(value) => handleStatusChange(row.original.id, value)}
        disabled={isUpdatingStatus}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {/* Only show Paid option - disable others */}
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="pending" disabled>
            Pending (Coming Soon)
          </SelectItem>
          <SelectItem value="in_review" disabled>
            In Review (Coming Soon)
          </SelectItem>
          <SelectItem value="approved" disabled>
            Approved (Coming Soon)
          </SelectItem>
          <SelectItem value="overdue" disabled>
            Overdue (Coming Soon)
          </SelectItem>
        </SelectContent>
      </Select>
    );
  },
}
```

**Alternative (Simpler):** Only show "Paid" option
```typescript
<SelectContent>
  <SelectItem value="paid">Mark as Paid</SelectItem>
</SelectContent>
```

### 4. Supabase RLS Policy Check

**Verify/Create Policy:**
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'invoices';

-- Create/update policy to allow status updates
CREATE POLICY "Users can update their own invoices"
ON invoices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Or if using more granular policies
CREATE POLICY "Users can update status of their invoices"
ON invoices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  (status IS NOT NULL)
);
```

**Test RLS:**
```sql
-- Simulate update as authenticated user
SET request.jwt.claim.sub = '<user-id>';
UPDATE invoices
SET status = 'paid'
WHERE id = '<invoice-id>' AND user_id = '<user-id>';
```

## Acceptance Criteria

### UI Cleanup
- [ ] Kanban link disabled in sidebar with "Soon" badge and 50% opacity
- [ ] Analytics link disabled in sidebar with "Soon" badge and 50% opacity
- [ ] Settings link disabled in sidebar with "Soon" badge and 50% opacity
- [ ] Dashboard and Invoices links remain active and functional
- [ ] Disabled links show `cursor-not-allowed` on hover
- [ ] Tooltip "Coming soon" appears on disabled links
- [ ] Monthly Growth card removed from dashboard
- [ ] Dashboard stats grid adjusted to 3 columns (not 4)
- [ ] Remaining 3 cards spread evenly across available space
- [ ] No layout shifts or visual regressions

### Invoice Status Update
- [ ] Status dropdown in invoice table only shows "Paid" option
- [ ] Other status options disabled with "(Coming Soon)" label OR completely hidden
- [ ] Selecting "Paid" triggers API call to `/api/invoices/[id]`
- [ ] Loading state shown during update (spinner or disabled dropdown)
- [ ] Success: Invoice status updates in Supabase `invoices` table
- [ ] Success: Success toast notification shown: "Invoice status updated to paid"
- [ ] Success: Invoice table refreshes with new status
- [ ] Success: Dashboard stats update to reflect new paid count
- [ ] Failure: Error toast shown with descriptive message
- [ ] Failure: Dropdown reverts to original status
- [ ] Page refresh maintains updated status (persistence confirmed)
- [ ] No console errors during update process
- [ ] RLS policies allow updates for invoice owner only
- [ ] Unauthorized users cannot update other users' invoices

### Testing Requirements
- [ ] Manual test: Update invoice status from pending → paid
- [ ] Manual test: Refresh page and verify status remains "paid"
- [ ] Manual test: Check Supabase table directly to confirm update
- [ ] Manual test: Verify dashboard stats reflect new paid count
- [ ] Manual test: Test with multiple invoices (5+ updates)
- [ ] Manual test: Test with different user accounts (auth isolation)
- [ ] Error test: Simulate API failure (network disconnect) and verify error handling
- [ ] Error test: Test with invalid invoice ID
- [ ] Error test: Test with unauthorized user
- [ ] Performance test: Status update completes in < 2 seconds

## Technical Implementation

### Investigation Checklist

**Step 1: Locate Current Implementation**
- [ ] Find invoice table component (likely `src/components/invoices/data-table.tsx`)
- [ ] Locate status dropdown/select component
- [ ] Check if status change handler exists
- [ ] Verify if API call is present

**Step 2: Identify API Endpoint**
- [ ] Check if `/api/invoices/[id]` route exists
- [ ] Verify HTTP method (PATCH/PUT/POST)
- [ ] Review request/response schema
- [ ] Check error handling

**Step 3: Trace Supabase Query**
- [ ] Find Supabase update query in API route
- [ ] Verify table name matches env var
- [ ] Check if `user_id` filter is applied (RLS)
- [ ] Confirm `updated_at` timestamp is set

**Step 4: Test RLS Policies**
- [ ] Query `pg_policies` for `invoices` table
- [ ] Verify UPDATE policy exists
- [ ] Test policy with sample query
- [ ] Create policy if missing

**Step 5: Add Error Handling**
- [ ] Wrap API call in try-catch
- [ ] Add loading states to UI
- [ ] Implement optimistic updates (optional)
- [ ] Add toast notifications for success/failure
- [ ] Log errors for debugging

### Files to Modify

**1. Sidebar Component** (`src/components/layout/sidebar.tsx`)
- Add `disabled` property to navigation items
- Update render logic with conditional styling
- Add "Soon" badges to disabled items
- Add hover tooltips

**2. Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`)
- Comment out or feature-flag Monthly Growth card
- Update grid columns from 4 to 3

**3. Invoice Table** (`src/components/invoices/data-table.tsx` or similar)
- Add `useMutation` hook for status updates
- Implement `handleStatusChange` handler
- Add loading/error states
- Add toast notifications

**4. Invoice API Route** (`src/app/api/invoices/[id]/route.ts`)
- Create PATCH endpoint if missing
- Add request validation
- Implement Supabase update query
- Add comprehensive error handling
- Return updated invoice data

**5. Status Dropdown Column** (within table columns definition)
- Restrict options to "Paid" only
- Add disabled states to other options
- Connect to mutation handler
- Show loading state during update

**6. Supabase** (via SQL Editor or Migration)
- Verify/create RLS policy for invoice updates
- Test policy with sample queries
- Document policy in migration file

### Testing Strategy

**Manual Testing:**

**UI Cleanup:**
1. Navigate to application
2. Verify Kanban, Analytics, Settings links disabled
3. Hover over disabled links → see "Coming soon" tooltip
4. Try clicking disabled links → no navigation occurs
5. Navigate to Dashboard → verify only 3 stat cards visible
6. Check responsive behavior (mobile/tablet/desktop)

**Status Update:**
1. Navigate to Invoices page
2. Identify invoice with "pending" status
3. Click status dropdown → verify only "Paid" option available
4. Select "Paid" → observe loading state
5. Wait for completion → verify success toast appears
6. Check invoice row → status updated to "paid"
7. Refresh page → status remains "paid"
8. Open Supabase dashboard → verify database record updated
9. Navigate to Dashboard → verify stats reflect new paid count

**Error Scenarios:**
1. Disconnect network → attempt status update → verify error toast
2. Use invalid invoice ID → verify error handling
3. Attempt to update another user's invoice → verify 401 error

**E2E Test** (`tests-e2e/invoice-status-update.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Invoice Status Update', () => {
  test('should update invoice status to paid and persist', async ({ page }) => {
    // Navigate to invoices page
    await page.goto('/invoices');

    // Find first pending invoice
    const firstRow = page.locator('table tbody tr').first();
    const statusDropdown = firstRow.locator('[data-testid="status-dropdown"]');

    // Open dropdown
    await statusDropdown.click();

    // Select "Paid"
    await page.click('text=Paid');

    // Wait for success toast
    await expect(page.getByText(/status updated to paid/i)).toBeVisible();

    // Verify row updated
    await expect(statusDropdown).toHaveText('paid');

    // Refresh page
    await page.reload();

    // Verify status persisted
    const updatedDropdown = page.locator('table tbody tr').first()
      .locator('[data-testid="status-dropdown"]');
    await expect(updatedDropdown).toHaveText('paid');
  });

  test('should show error toast on failed update', async ({ page, context }) => {
    // Simulate network failure
    await context.route('**/api/invoices/*', route => route.abort());

    await page.goto('/invoices');

    const statusDropdown = page.locator('table tbody tr').first()
      .locator('[data-testid="status-dropdown"]');
    await statusDropdown.click();
    await page.click('text=Paid');

    // Verify error toast
    await expect(page.getByText(/failed to update/i)).toBeVisible();
  });

  test('should only show Paid option in dropdown', async ({ page }) => {
    await page.goto('/invoices');

    const statusDropdown = page.locator('table tbody tr').first()
      .locator('[data-testid="status-dropdown"]');
    await statusDropdown.click();

    // Verify only Paid is enabled
    await expect(page.locator('text=Mark as Paid')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeDisabled();
    await expect(page.locator('text=In Review')).toBeDisabled();
  });
});
```

## Dependencies

**Existing:**
- ✅ Supabase client and auth
- ✅ Invoice table component
- ✅ React Query for data fetching
- ✅ Toast notifications (sonner or similar)
- ✅ Sidebar navigation component

**May Need:**
- `useMutation` hook integration
- `/api/invoices/[id]` PATCH endpoint
- RLS policy for invoice updates
- Feature flag system (optional)

## Estimated Effort

**Breakdown:**

**Part 1: UI Cleanup (30 minutes)**
- Sidebar navigation disable: 15 minutes
  - Add disabled property
  - Update styling
  - Add badges/tooltips
  - Test navigation
- Dashboard card removal: 15 minutes
  - Comment out Monthly Growth card
  - Adjust grid layout
  - Test responsive behavior

**Part 2: Status Update Fix (2-3 hours)**
- Investigation & API route creation: 45 minutes
  - Locate current implementation
  - Create/update PATCH endpoint
  - Add request validation
- Supabase integration: 30 minutes
  - Implement update query
  - Check/create RLS policy
  - Test database writes
- Frontend mutation hook: 30 minutes
  - Add useMutation hook
  - Implement status change handler
  - Add loading/error states
- UI restrictions: 20 minutes
  - Restrict dropdown to "Paid" only
  - Add disabled states
  - Update column definition
- Error handling & toasts: 15 minutes
  - Add success/error notifications
  - Implement error boundaries
  - Test failure scenarios
- Testing: 30 minutes
  - Manual testing (multiple invoices)
  - Verify persistence
  - Test error scenarios
  - Write E2E test

**Total Estimated Time**: 3.5-4 hours

## Priority

**P0** - Critical

**Reasoning:**
- Status update bug is a **CRITICAL DATA INTEGRITY ISSUE**
- Users losing data undermines trust in entire application
- Finance teams making decisions on incorrect status data = HIGH BUSINESS RISK
- UI cleanup is straightforward and prevents user confusion
- Blocks production readiness
- Must be fixed before any production deployment

## Risk Class

**High Risk (Status Update) + Low Risk (UI Cleanup)**

**Status Update Risks:**
- RLS policies may block legitimate updates → test policies thoroughly
- Race conditions if multiple users update same invoice → add optimistic locking
- API timeout on slow connections → add timeout handling + retry logic
- Cache invalidation issues → ensure React Query invalidates all related queries
- Audit trail missing → consider adding `updated_by` and `updated_at` fields

**Mitigation:**
- Test RLS policies with multiple user scenarios
- Add comprehensive error logging
- Implement optimistic updates with rollback on failure
- Add loading states to prevent double-clicks
- Log all status changes for audit trail
- Add E2E tests for update flow
- Monitor Supabase logs for update failures

**UI Cleanup Risks:**
- Minimal - just disabling UI elements
- Test that disabled links don't break routing
- Verify grid layout doesn't break on mobile

## Labels

`critical`, `bug`, `frontend`, `backend`, `data-integrity`, `ui-cleanup`, `supabase`, `invoices`

## Related Issues

- **Issue #9**: Invoice summary cards accuracy (related to status aggregation)
- **Issue #2**: Invoice status derivation logic (may affect this implementation)
- **Future**: Re-enable Kanban/Analytics/Settings features

## Success Criteria

**Functional:**
- ✅ Sidebar navigation has 3 disabled items with proper styling
- ✅ Dashboard shows 3 stat cards (no Monthly Growth)
- ✅ Invoice status dropdown restricted to "Paid" option
- ✅ Status update persists to Supabase database
- ✅ Success/error toasts shown for all update outcomes
- ✅ Page refresh maintains updated status
- ✅ Dashboard stats update after status change

**Technical:**
- ✅ PATCH `/api/invoices/[id]` endpoint implemented
- ✅ Supabase RLS policy allows invoice owner updates
- ✅ React Query mutation with proper cache invalidation
- ✅ Comprehensive error handling and logging
- ✅ E2E test coverage for status update flow
- ✅ No console errors or warnings
- ✅ Type safety maintained (TypeScript)

**UX:**
- ✅ Clear loading indicators during status update
- ✅ Immediate visual feedback on success/failure
- ✅ Disabled UI elements clearly communicated
- ✅ No confusion about available features
- ✅ Update completes in < 2 seconds

## Out of Scope (Future Work)

**Multi-Status Workflow:**
- Supporting full status lifecycle (pending → in_review → approved → paid)
- Status transition rules and validation
- Role-based status change permissions

**Advanced Features:**
- Bulk status updates
- Status change history/audit log
- Email notifications on status change
- Approval workflows
- Status change comments/notes

**UI Re-enablement:**
- Kanban board feature completion
- Analytics page development
- Settings page implementation
- Monthly Growth metrics pipeline

## Notes

**Why Only "Paid" Status?**
- Simplifies initial implementation
- Matches current business workflow (mark as paid when payment received)
- Reduces complexity and testing surface area
- Other statuses can be enabled incrementally as workflows mature

**Feature Flag Consideration:**
- Consider adding feature flags for disabled UI elements
- Allows easy re-enablement without code changes
- Can use environment variables or feature flag service
- Example: `NEXT_PUBLIC_ENABLE_KANBAN=false`

**Audit Trail:**
- Consider adding `updated_by` and `updated_at` fields to invoice records
- Helps with debugging and compliance
- Can be added in same update query

**Optimistic Updates:**
- Consider implementing optimistic UI updates for faster perceived performance
- Update UI immediately, revert on API failure
- Requires careful rollback logic

## References

**Files to Investigate:**
- `src/components/layout/sidebar.tsx` - Sidebar navigation
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard layout
- `src/components/invoices/data-table.tsx` - Invoice table
- `src/app/api/invoices/[id]/route.ts` - Invoice API (may need creation)
- `src/lib/api/invoices.ts` - Invoice API utilities

**Similar Implementations:**
- Check if other tables have working update mutations
- Review React Query patterns in existing codebase
- Look for toast notification examples

**Documentation:**
- Supabase RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- React Query Mutations: https://tanstack.com/query/latest/docs/react/guides/mutations
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
