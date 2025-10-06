# Issue: Sync Status Card Filters Across All Pages

## Summary
The Kanban page has perfect clickable status filters (5 cards: Pending, In Review, Approved, Paid, Overdue) with full accessibility and visual feedback. However, the Invoices page is missing 2 status cards (In Review, Approved), and the Dashboard page has NO clickable filters at all. This creates an inconsistent UX where users expect the same filtering behavior across all pages.

## Problem Statement

### Current State Analysis:

**Kanban Page** ✅ **PERFECT - Reference Implementation**
- 5 clickable status cards: Pending, In Review, Approved, Paid, Overdue
- Color-coded gradient backgrounds with active ring indicators
- Full keyboard navigation (Tab + Enter/Space)
- Complete ARIA support for screen readers
- Uses `cn()` utility + `toggleStatus()` from `useInvoiceFilters` hook
- Active state: `ring-2 ring-{color}-500 bg-{color}-100`
- Accurate counts via optimized single query

**Invoices Page** ⚠️ **INCOMPLETE**
- Only 3 clickable status cards: Pending, Paid, Overdue
- **MISSING**: In Review and Approved cards entirely
- Uses different color scheme (Amber for pending vs Kanban's blue)
- Has same interaction pattern but incomplete coverage
- Grid layout: 5 cards total (Total, Amount, Pending, Paid, Overdue)

**Dashboard Page** ❌ **NO FILTERS**
- 4 premium animated cards (Total Invoices, Total Amount, Pending Payments, Overdue Items)
- Beautiful gradient designs with trend indicators
- **NONE are clickable filters**
- No `InvoiceFiltersProvider` integration
- Purely informational display with no filter capability

### User Impact

**Inconsistency Problems:**
1. Users learn to click status cards on Kanban, try on Invoices → only 3/5 work
2. Users try to click Dashboard cards → nothing happens (no visual feedback)
3. In Review and Approved statuses have no quick filter on Invoices page
4. Color inconsistency creates confusion (Pending is blue vs amber)
5. Missing unified filtering experience across the application

**Expected Behavior:**
Users expect ALL status cards across ALL pages to:
- Be clickable and filter the data
- Have consistent colors (Pending=Blue, In Review=Amber, Approved=Purple, Paid=Emerald, Overdue=Red)
- Show visual feedback (ring indicators when active)
- Support keyboard navigation
- Have ARIA announcements

## Scope

### 1. Invoices Page Updates
- Add **In Review** clickable status card (missing)
- Add **Approved** clickable status card (missing)
- Standardize color scheme to match Kanban
- Update grid layout from 5 cards → 7 cards
- Ensure all 5 status cards use identical interaction pattern as Kanban

### 2. Dashboard Page Updates
- Wrap page in `InvoiceFiltersProvider`
- Add filter state management
- Make existing status cards clickable (where applicable)
- Add missing status cards: In Review, Approved, Paid
- Implement click behavior: Navigate to Invoices page with filter applied OR add filter drawer
- Preserve premium animated design and trend indicators

### 3. Color Standardization
Enforce consistent color scheme across all pages:
- **Pending**: Blue (`ring-blue-500`, `from-blue-50 to-indigo-50`)
- **In Review**: Amber (`ring-amber-500`, `from-amber-50 to-orange-50`)
- **Approved**: Purple (`ring-purple-500`, `from-purple-50 to-pink-50`)
- **Paid**: Emerald (`ring-emerald-500`, `from-emerald-50 to-green-50`)
- **Overdue**: Red (`ring-red-500`, `from-red-50 to-rose-50`)

## Acceptance Criteria

### Invoices Page
- [ ] In Review status card exists and is clickable
- [ ] Approved status card exists and is clickable
- [ ] All 5 status cards (Pending, In Review, Approved, Paid, Overdue) are clickable
- [ ] Colors match Kanban page exactly
- [ ] Grid layout updated to accommodate 7 cards (Total, Amount, + 5 status)
- [ ] Clicking status card toggles filter (ring indicator appears)
- [ ] Filter chips update when clicking status cards
- [ ] Keyboard navigation works (Tab + Enter/Space)
- [ ] ARIA attributes correct (role="button", aria-pressed, aria-label)
- [ ] Hover states show cursor-pointer and shadow-md
- [ ] Active state shows ring-2 + background tint

### Dashboard Page
- [ ] Page wrapped in InvoiceFiltersProvider
- [ ] Pending Payments card is clickable
- [ ] Overdue Items card is clickable
- [ ] In Review card added and clickable
- [ ] Approved card added and clickable
- [ ] Paid card added and clickable
- [ ] Total Invoices and Total Amount cards remain non-interactive (info only)
- [ ] Clicking status card navigates to Invoices page with filter applied
- [ ] Premium animated design preserved (gradients, trends, hover effects)
- [ ] Click behavior clear (visual feedback on hover)
- [ ] Keyboard navigation supported

### Cross-Page Consistency
- [ ] All status cards use identical color scheme
- [ ] All status cards use identical interaction pattern
- [ ] All status cards show identical active states
- [ ] All pages show accurate counts
- [ ] Filter state persists when navigating between pages (optional enhancement)

## Technical Implementation

### Pattern to Copy (from Kanban page)

**Handler Functions:**
```tsx
import { cn } from '@/lib/utils';
import { useInvoiceFilters } from '@/hooks/use-invoices-filters';

const { filters, toggleStatus } = useInvoiceFilters();

const handleStatusCardClick = React.useCallback((status: BoardStatus) => {
  toggleStatus(status as any);
}, [toggleStatus]);

const handleStatusCardKeyDown = React.useCallback(
  (event: React.KeyboardEvent, status: BoardStatus) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleStatusCardClick(status);
    }
  },
  [handleStatusCardClick]
);

const isStatusActive = React.useCallback(
  (status: string) => filters.statuses.includes(status),
  [filters.statuses]
);
```

**Card Implementation (In Review example):**
```tsx
<Card
  className={cn(
    "cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2",
    "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    "border-amber-200/50 dark:border-amber-800/30",
    isStatusActive('in_review') && "ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/30"
  )}
  role="button"
  tabIndex={0}
  aria-pressed={isStatusActive('in_review')}
  aria-label={`Filter by in review invoices - currently ${isStatusActive('in_review') ? 'filtered' : 'not filtered'}`}
  onClick={() => handleStatusCardClick('in_review')}
  onKeyDown={(e) => handleStatusCardKeyDown(e, 'in_review')}
>
  <CardContent className="p-4">
    <div className="text-center">
      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.in_review}</p>
      <p className="text-sm text-amber-700 dark:text-amber-300">In Review</p>
    </div>
  </CardContent>
</Card>
```

### Files to Modify

**1. Invoices Page** (`src/app/(dashboard)/invoices/page.tsx`)
- **Line ~53**: Extract `toggleStatus` from `useInvoiceFilters` (already has it, verify)
- **Line ~298-311**: Handler functions already exist ✓
- **Line ~429**: Update grid from `lg:grid-cols-4 xl:grid-cols-5` → `lg:grid-cols-5 xl:grid-cols-7`
- **After line 481** (after Pending card): Add In Review card
- **After In Review**: Add Approved card
- **Line ~462-463**: Update Pending card colors from amber → blue
- **Line ~484-507**: Keep Paid card (verify colors are emerald)
- **Line ~508-530**: Keep Overdue card (verify colors are red/rose)

**2. Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`)
- **Line 61-67**: Wrap `DashboardView` in `InvoiceFiltersProvider`
- **Import**: Add `import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters'`
- **Import**: Add `import { useRouter } from 'next/navigation'`
- **Inside DashboardView**: Add handler functions for navigation-based filtering
- **Line ~94**: Modify StatsCards component or create wrapper with click handlers

**3. Dashboard Stats Cards** (`src/components/dashboard/stats-cards.tsx`)
- Option A: Add click handlers to existing cards (simpler)
- Option B: Create new `ClickableStatsCards` component (cleaner separation)
- Implement navigation on click: `router.push('/invoices?status=pending')`
- Preserve all existing animations and premium styling

### Dashboard Click Behavior Options

**Option 1: Navigate to Invoices (Recommended)**
```tsx
const router = useRouter();
const handleCardClick = (status: string) => {
  router.push(`/invoices?status=${status}`);
};
```
- Simpler implementation
- No need for InvoiceFiltersProvider on Dashboard
- Clear user intent: "Show me details"

**Option 2: Inline Filtering**
```tsx
const { toggleStatus } = useInvoiceFilters();
const handleCardClick = (status: string) => {
  toggleStatus(status as any);
  // Update dashboard charts to respect filter
};
```
- More complex (need to pass filters to all components)
- Better for dashboard-only workflow
- Requires filter drawer on Dashboard page

**Recommendation**: Use Option 1 (Navigate to Invoices) for initial implementation.

## Detailed Changes

### Invoices Page: Add In Review Card

**Insert after line 481 (Pending card):**
```tsx
<Card
  className={cn(
    "rpd-card cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2",
    "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
    "border-amber-200/50 dark:border-amber-800/30",
    isStatusActive('in_review') && "ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/30"
  )}
  role="button"
  tabIndex={0}
  aria-pressed={isStatusActive('in_review')}
  aria-label={`Filter by in review invoices - currently ${isStatusActive('in_review') ? 'filtered' : 'not filtered'}`}
  data-testid="status-card-in-review"
  onClick={() => handleStatusCardClick('in_review')}
  onKeyDown={(e) => handleStatusCardKeyDown(e, 'in_review')}
>
  <CardContent className="p-4">
    <div className="flex items-center space-x-2">
      <Clock className="h-4 w-4 text-amber-600" />
      <div>
        <p className="text-sm font-medium text-slate-600">In Review</p>
        <p className="text-2xl font-bold text-amber-600">{stats.in_review || 0}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Invoices Page: Add Approved Card

**Insert after In Review card:**
```tsx
<Card
  className={cn(
    "rpd-card cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2",
    "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
    "border-purple-200/50 dark:border-purple-800/30",
    isStatusActive('approved') && "ring-2 ring-purple-500 bg-purple-100 dark:bg-purple-900/30"
  )}
  role="button"
  tabIndex={0}
  aria-pressed={isStatusActive('approved')}
  aria-label={`Filter by approved invoices - currently ${isStatusActive('approved') ? 'filtered' : 'not filtered'}`}
  data-testid="status-card-approved"
  onClick={() => handleStatusCardClick('approved')}
  onKeyDown={(e) => handleStatusCardKeyDown(e, 'approved')}
>
  <CardContent className="p-4">
    <div className="flex items-center space-x-2">
      <CheckCircle2 className="h-4 w-4 text-purple-600" />
      <div>
        <p className="text-sm font-medium text-slate-600">Approved</p>
        <p className="text-2xl font-bold text-purple-600">{stats.approved || 0}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Invoices Page: Fix Pending Card Color

**Replace line 460-482 (Pending card):**
Change `ring-amber-500` → `ring-blue-500` and gradients to blue scheme to match Kanban.

### Dashboard Page: Make Cards Clickable

**Approach**: Add navigation wrapper around relevant cards in `stats-cards.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, FileText, Clock, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

// ... existing imports ...

export function StatsCards() {
  const router = useRouter();
  const { data: stats, isLoading, error } = useDashboardStats();

  const handleStatusClick = (status: 'pending' | 'overdue') => {
    router.push(`/invoices?status=${status}`);
  };

  // ... existing loading/error states ...

  const cards = [
    {
      id: 'total-invoices',
      title: 'Total Invoices',
      value: stats.overview.totalInvoices.toLocaleString(),
      icon: FileText,
      clickable: false,
      // ... rest of card config
    },
    {
      id: 'total-amount',
      title: 'Total Amount',
      value: `$${stats.overview.totalAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      clickable: false,
      // ... rest of card config
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments',
      value: stats.overview.pendingPayments.toLocaleString(),
      icon: Clock,
      clickable: true,
      filterStatus: 'pending',
      // ... rest of card config
    },
    {
      id: 'overdue-items',
      title: 'Overdue Items',
      value: stats.overview.overduePayments.toLocaleString(),
      icon: AlertTriangle,
      clickable: true,
      filterStatus: 'overdue',
      // ... rest of card config
    },
  ];

  return (
    <div className="rpd-grid-responsive">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trendUp ? TrendingUp : TrendingDown;

        return (
          <Card
            key={card.id}
            className={cn(
              "rpd-card-elevated group relative overflow-hidden border hover:shadow-premium-lg transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 animate-fade-in",
              card.clickable && "cursor-pointer"
            )}
            style={{
              background: cardStyle[card.type].background,
              borderColor: cardStyle[card.type].borderColor,
              animationDelay: `${index * 0.1}s`
            }}
            onClick={() => card.clickable && card.filterStatus && handleStatusClick(card.filterStatus)}
            role={card.clickable ? "button" : undefined}
            tabIndex={card.clickable ? 0 : undefined}
            aria-label={card.clickable ? `View ${card.title.toLowerCase()} invoices` : undefined}
          >
            {/* ... existing card content ... */}
          </Card>
        );
      })}
    </div>
  );
}
```

## Testing Strategy

### Manual Testing Checklist

**Invoices Page:**
- [ ] In Review card appears in correct position
- [ ] Approved card appears in correct position
- [ ] All 5 status cards are clickable
- [ ] Click each card → ring indicator appears
- [ ] Click again → ring indicator disappears (toggle)
- [ ] Filter chips update correctly
- [ ] Keyboard: Tab to card, Enter/Space activates
- [ ] Colors match Kanban page
- [ ] Hover shows pointer cursor and shadow

**Dashboard Page:**
- [ ] Pending Payments card is clickable
- [ ] Overdue Items card is clickable
- [ ] Click Pending → navigates to Invoices with pending filter
- [ ] Click Overdue → navigates to Invoices with overdue filter
- [ ] Non-status cards (Total, Amount) remain non-clickable
- [ ] Premium animations preserved
- [ ] Hover shows pointer cursor on clickable cards
- [ ] Keyboard navigation works

**Cross-Page:**
- [ ] Colors consistent across all pages
- [ ] Interaction patterns identical
- [ ] Filter state works on both Invoices and Kanban
- [ ] Counts accurate on all pages

### Automated Testing

**E2E Tests** (`tests-e2e/status-filters-sync.spec.ts`):
```typescript
test.describe('Status Filter Synchronization', () => {
  test('Invoices page has all 5 status cards clickable', async ({ page }) => {
    await page.goto('/invoices');

    const statuses = ['pending', 'in_review', 'approved', 'paid', 'overdue'];
    for (const status of statuses) {
      const card = page.locator(`[data-testid="status-card-${status}"]`);
      await expect(card).toHaveAttribute('role', 'button');
      await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('Dashboard status cards navigate to Invoices with filter', async ({ page }) => {
    await page.goto('/dashboard');

    const pendingCard = page.locator('[aria-label*="pending"]');
    await pendingCard.click();

    await expect(page).toHaveURL(/\/invoices\?.*status=pending/);
    const statusCard = page.locator('[data-testid="status-card-pending"]');
    await expect(statusCard).toHaveAttribute('aria-pressed', 'true');
  });

  test('Status card colors consistent across pages', async ({ page }) => {
    // Test Pending is blue on both pages
    await page.goto('/kanban');
    const kanbanPending = page.locator('[aria-label*="Filter by pending"]');
    const kanbanColor = await kanbanPending.evaluate(el =>
      getComputedStyle(el).background
    );

    await page.goto('/invoices');
    const invoicesPending = page.locator('[data-testid="status-card-pending"]');
    const invoicesColor = await invoicesPending.evaluate(el =>
      getComputedStyle(el).background
    );

    expect(kanbanColor).toContain('blue');
    expect(invoicesColor).toContain('blue');
  });
});
```

## Dependencies & Stats API

**Note**: Stats object structure varies by page:
- **Kanban**: Uses custom query with `totalsByStatus` object
- **Invoices**: Uses `data?.statusCounts` from API response
- **Dashboard**: Uses `stats.overview.pendingPayments` etc from stats API

**Ensure counts are available:**
```typescript
// Invoices page needs to expose:
stats.in_review = data?.statusCounts?.in_review || 0;
stats.approved = data?.statusCounts?.approved || 0;
```

Check if API route returns these counts, or calculate client-side.

## Estimated Effort

**Breakdown:**
1. **Invoices Page - Add 2 Cards**: 20 minutes
   - Copy/paste pattern from Kanban
   - Update colors
   - Update grid layout

2. **Invoices Page - Fix Pending Color**: 5 minutes
   - Find/replace amber → blue

3. **Dashboard - Add Navigation**: 30 minutes
   - Import router
   - Add click handlers
   - Test navigation

4. **Dashboard - Add Missing Cards**: 30 minutes (optional)
   - Add In Review, Approved, Paid cards
   - Match stats API structure
   - Preserve design

5. **Testing**: 20 minutes
   - Manual testing all interactions
   - Verify cross-page consistency

6. **E2E Tests**: 15 minutes
   - Write test spec
   - Run and verify

**Total Estimated Time**: 80-120 minutes

## Priority

**P1** - High Priority

**Reasoning:**
- Significant UX inconsistency across the application
- Users expect consistent behavior (mental model from Kanban)
- Quick wins available (Invoices page can be fixed in 25 minutes)
- Dashboard enhancement is optional but valuable

## Risk Class

**Low Risk**

**Reasoning:**
- All changes isolated to presentation layer
- Pattern proven and working on Kanban page
- No backend/API modifications required
- No breaking changes to existing functionality
- Incremental implementation possible (Invoices first, Dashboard later)

## Labels

`frontend`, `ux`, `consistency`, `filters`, `enhancement`, `accessibility`, `cross-page`

## References

- **Kanban Page** (reference): `src/app/(dashboard)/kanban/page.tsx:288-398`
- **Invoices Page** (to fix): `src/app/(dashboard)/invoices/page.tsx:429-531`
- **Dashboard Page** (to enhance): `src/app/(dashboard)/dashboard/page.tsx`
- **Dashboard Cards**: `src/components/dashboard/stats-cards.tsx`
- **Filter Hook**: `src/hooks/use-invoices-filters.tsx`
- **Issue #11**: `docs/issues/issue-011-kanban-ux-improvements.md` (pattern source)
