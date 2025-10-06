# Issue: Sync Filter Drawer UI Across All Pages

## Summary
The Kanban and Invoices pages have identical, comprehensive filter UIs with 5 filter types (Status, Category, Vendor, Date Range, Amount), but the Dashboard page only has a date-range-only filter. This creates an inconsistent UX where users expect the same filtering capabilities across all pages.

## Problem Statement

### Current State Analysis:

**Kanban Page** ✅ **FULL FILTER UI**
- Filter button opens `InvoiceFilterDrawer` (mobile drawer)
- Filter options:
  - ✅ Status (Pending, In Review, Approved, Paid, Overdue)
  - ✅ Categories (multi-select with facets)
  - ✅ Vendors (multi-select with facets)
  - ✅ Date Range (quick presets + custom range)
  - ✅ Amount Range (min/max)
- Component: `InvoiceFilterDrawer` → `InvoiceFilterForm`
- Uses: `InvoiceFiltersProvider` + `useInvoiceFilters` hook
- Clear All + Apply/Close actions
- File: `src/app/(dashboard)/kanban/page.tsx:23-25` (wrapped in provider)

**Invoices Page** ✅ **FULL FILTER UI**
- Filter button opens `InvoiceFilterPopover` (desktop) or `InvoiceFilterDrawer` (mobile)
- Filter options:
  - ✅ Status (Pending, In Review, Approved, Paid, Overdue)
  - ✅ Categories (multi-select with facets)
  - ✅ Vendors (multi-select with facets)
  - ✅ Date Range (quick presets + custom range)
  - ✅ Amount Range (min/max)
- Component: Same `InvoiceFilterForm` as Kanban
- Uses: Same `InvoiceFiltersProvider` + `useInvoiceFilters` hook
- Identical UX to Kanban page
- File: `src/app/(dashboard)/invoices/page.tsx:46-48` (wrapped in provider)

**Dashboard Page** ⚠️ **LIMITED FILTER UI**
- Filter button opens custom Popover (NOT using shared components)
- Filter options:
  - ❌ No Status filters
  - ❌ No Category filters
  - ❌ No Vendor filters
  - ✅ Date Range ONLY (quick presets + custom range)
  - ❌ No Amount Range
- Component: Custom inline Popover (NOT `InvoiceFilterForm`)
- Does NOT use: `InvoiceFiltersProvider`
- Different UX from other pages
- File: `src/app/(dashboard)/dashboard/page.tsx:179-254` (custom popover)

### User Impact

**Inconsistency Problems:**
1. Users learn to filter by Status/Category/Vendor on Kanban/Invoices → can't do it on Dashboard
2. Filter button looks identical but offers different capabilities
3. Mental model broken: "Why can I filter by vendor here but not there?"
4. Dashboard charts don't update when Status/Category/Vendor filters change
5. Missing unified filtering experience across the application
6. Cannot compare filtered subsets across different views

**Expected Behavior:**
Users expect the filter button on ALL pages to:
- Show the same filter options (Status, Category, Vendor, Date, Amount)
- Use the same UI components and interaction patterns
- Apply filters consistently across all visualizations
- Share the same filter state via `InvoiceFiltersProvider`
- Show active filter chips below header

## Scope

### 1. Dashboard Page Updates

**Replace Custom Filter Popover:**
- Remove current custom date-only popover (lines 179-254)
- Add `InvoiceFilterDrawer` component (same as Kanban/Invoices)
- Wrap Dashboard page in `InvoiceFiltersProvider`
- Connect filter state to all dashboard components
- Add `InvoiceFilterChips` component to show active filters

**Provider Nesting Structure:**
```tsx
export default function Dashboard() {
  return (
    <InvoiceFiltersProvider>      // NEW - wraps entire Dashboard
      <DashboardStatsProvider>     // EXISTING - keep as-is
        <DashboardView />
      </DashboardStatsProvider>
    </InvoiceFiltersProvider>
  );
}
```

**Update Dashboard View Component:**
```tsx
function DashboardView() {
  const { filters, reset } = useInvoiceFilters();  // NEW - access filter state
  const { data: stats, params, setParams } = useDashboardStats();
  const [isFilterDrawerOpen, setFilterDrawerOpen] = React.useState(false);

  // Replace custom popover button with drawer trigger
  <Button variant="outline" onClick={() => setFilterDrawerOpen(true)}>
    <Filter className="h-4 w-4" />
    <span>Filters</span>
  </Button>

  // Add filter drawer (same as Kanban/Invoices)
  <InvoiceFilterDrawer
    open={isFilterDrawerOpen}
    onOpenChange={setFilterDrawerOpen}
    facets={facetsQuery.data?.facets}
    isLoading={facetsQuery.isLoading}
  />

  // Add filter chips
  <InvoiceFilterChips />
}
```

### 2. Dashboard Stats API Integration

**Extend StatsParams Interface:**
```typescript
// src/lib/api/stats.ts
export interface StatsParams {
  // Existing
  dateFrom?: string
  dateTo?: string
  triggerError?: boolean

  // NEW - add all filter types
  status?: string[]           // Filter by invoice statuses
  category?: string[]         // Filter by categories
  vendor?: string[]           // Filter by vendors
  amountMin?: number          // Filter by min amount
  amountMax?: number          // Filter by max amount
}
```

**Update Dashboard Stats API Route:**
```typescript
// src/app/api/stats/route.ts - lines ~40-60
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Existing date params
  const fromIso = searchParams.get('dateFrom');
  const toIso = searchParams.get('dateTo');

  // NEW - parse filter params
  const statusFilters = searchParams.getAll('status');
  const categoryFilters = searchParams.getAll('category');
  const vendorFilters = searchParams.getAll('vendor');
  const amountMin = parseFloat(searchParams.get('amountMin') || '');
  const amountMax = parseFloat(searchParams.get('amountMax') || '');

  // Apply filters to data aggregation (lines ~180-270)
  const filtered = currentPeriodData.filter((inv) => {
    // Status filter
    if (statusFilters.length && !statusFilters.includes(inv.status)) {
      return false;
    }

    // Category filter
    if (categoryFilters.length && !categoryFilters.includes(inv.category)) {
      return false;
    }

    // Vendor filter
    const vendorName = inv.supplier_name || '';
    if (vendorFilters.length && !vendorFilters.includes(vendorName)) {
      return false;
    }

    // Amount filter
    const amount = inv.total || 0;
    if (!isNaN(amountMin) && amount < amountMin) return false;
    if (!isNaN(amountMax) && amount > amountMax) return false;

    return true;
  });

  // Use filtered data for all aggregations
  // (status counts, category breakdown, vendor breakdown, etc.)
}
```

### 3. Dashboard Stats Provider Update

**Connect Filters to Stats Queries:**
```typescript
// src/components/dashboard/dashboard-stats-provider.tsx
import { useInvoiceFilters } from '@/hooks/use-invoices-filters';

export function DashboardStatsProvider({ children }: { children: React.ReactNode }) {
  const { filters } = useInvoiceFilters();  // NEW - access filter state
  const [params, setParamsState] = useState<DashboardStatsParams>({
    dateFrom: `${MIN_DATE}T00:00:00.000Z`,
  });

  // Merge params with filters for query key
  const queryParams = useMemo(() => ({
    ...params,
    status: filters.statuses,
    category: filters.categories,
    vendor: filters.vendors,
    amountMin: filters.amountRange?.min,
    amountMax: filters.amountRange?.max,
  }), [params, filters]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', queryParams],  // Include filters in key
    queryFn: () => fetchDashboardStats(queryParams),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
```

**Note:** This requires Dashboard to be wrapped in `InvoiceFiltersProvider` first!

### 4. Chart Component Enhancements

**Add Filter Indicators:**
```typescript
// Update all 3 chart components:
// - src/components/charts/supplier-breakdown.tsx (StatusBreakdown)
// - src/components/charts/top-vendors.tsx (TopVendors)
// - src/components/charts/category-breakdown.tsx (CategoryBreakdown - if exists)

interface ChartProps {
  data: any;
  isFiltered?: boolean;  // NEW - indicates if data is filtered
}

export function StatusBreakdown({ data, isFiltered }: ChartProps) {
  return (
    <Card className="rpd-card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Status Breakdown</CardTitle>
          {isFiltered && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
        {isFiltered && (
          <p className="text-xs text-slate-500 mt-1">
            Showing filtered subset of data
          </p>
        )}
      </CardHeader>
      <CardContent>{/* existing chart */}</CardContent>
    </Card>
  );
}
```

**Pass isFiltered Prop from Dashboard:**
```tsx
// In DashboardView component
const hasActiveFilters = useMemo(() => {
  return (
    filters.statuses.length > 0 ||
    filters.categories.length > 0 ||
    filters.vendors.length > 0 ||
    filters.amountRange !== null
  );
}, [filters]);

<StatusBreakdown
  data={stats.breakdowns.processingStatus}
  isFiltered={hasActiveFilters}
/>
```

### 5. Facets Integration (Optional)

**Option A: Reuse Existing Facets API**
```tsx
// Add facets query to Dashboard
const facetsQuery = useQuery({
  queryKey: ['invoice-facets'],
  queryFn: () => fetchInvoiceFacets(),
  staleTime: 10 * 60 * 1000,
});

// Pass to filter drawer
<InvoiceFilterDrawer
  facets={facetsQuery.data?.facets}
  isLoading={facetsQuery.isLoading}
/>
```

**Option B: Let Drawer Fetch Its Own Facets**
- `InvoiceFilterDrawer` already handles its own facets if not provided
- Dashboard can pass `undefined` and drawer will fetch
- Simpler but less control over caching

**Recommendation:** Option A (explicit facets query) for consistency with Invoices page

### 6. Filter State Synchronization (Optional Enhancement)

**Cross-Page Filter Persistence:**
- Currently each page has its own filter state
- Could enhance to persist filter state in URL params or localStorage
- Navigation from Kanban → Dashboard → Invoices maintains filter state
- Out of scope for initial implementation, but good future enhancement

## Acceptance Criteria

### Dashboard Filter UI
- [ ] Dashboard has Filter button in header (existing ✓, just needs rewiring)
- [ ] Filter button opens `InvoiceFilterDrawer` (NOT custom popover)
- [ ] Filter drawer shows all 5 filter sections: Status, Category, Vendor, Date Range, Amount
- [ ] Filter options match Kanban/Invoices exactly (same component = guaranteed match)
- [ ] Quick date range presets work (This Month, Last Month, Last 2 Months, Since May 1st)
- [ ] Custom date range picker works with calendar UI
- [ ] Amount range min/max inputs work with number validation
- [ ] Status filter shows all 5 statuses (Pending, In Review, Approved, Paid, Overdue)
- [ ] Category filter shows all categories from facets
- [ ] Vendor filter shows all vendors from facets
- [ ] Clear All button resets all filters including date range
- [ ] Close button closes drawer without applying (if no auto-apply)
- [ ] Filter chips appear below header showing active filters
- [ ] Clicking chip removes that filter

### Dashboard Filter Integration
- [ ] Dashboard wrapped in `InvoiceFiltersProvider`
- [ ] Filter state accessible via `useInvoiceFilters` hook
- [ ] StatsCards component shows total counts (NOT filtered - always shows full totals)
- [ ] StatusBreakdown chart filters by selected categories, vendors, amount
- [ ] TopVendors chart filters by selected statuses, categories, date, amount
- [ ] CategoryBreakdown chart filters by selected statuses, vendors, date, amount (if exists)
- [ ] All charts show "Filtered" badge when any filters active
- [ ] Filtered counts accurate compared to unfiltered baseline
- [ ] Charts re-render when filters change
- [ ] Loading states shown during filter application

### Dashboard Stats API
- [ ] API route accepts filter query params: `status[]`, `category[]`, `vendor[]`, `amountMin`, `amountMax`
- [ ] API returns filtered breakdowns (StatusBreakdown, TopVendors, CategoryBreakdown)
- [ ] API calculates trends within filter scope (not affected by filters)
- [ ] Type definitions updated (`StatsParams` includes filter fields)
- [ ] Backward compatible: existing date-only filtering still works
- [ ] No performance degradation with complex filters

### Cross-Page Consistency
- [ ] All pages use identical `InvoiceFilterForm` component
- [ ] All pages use identical filter state management (`InvoiceFiltersProvider`)
- [ ] All pages show identical filter UI/UX (drawer on mobile, popover on desktop for Invoices)
- [ ] Filter chips component identical across all pages
- [ ] Clear All button behavior consistent across all pages
- [ ] Active filter indicators consistent across all pages

## Technical Implementation

### Files to Modify

**1. Dashboard Page** (`src/app/(dashboard)/dashboard/page.tsx`)

**Lines 1-16:** Add imports
```tsx
import { InvoiceFiltersProvider, useInvoiceFilters } from '@/hooks/use-invoices-filters';
import { InvoiceFilterDrawer } from '@/components/invoices/filter-drawer';
import { InvoiceFilterChips } from '@/components/invoices/filter-chips';
import { useQuery } from '@tanstack/react-query';
import { fetchInvoiceFacets } from '@/lib/api/invoices';
```

**Lines 61-66:** Wrap in provider
```tsx
export default function Dashboard() {
  return (
    <InvoiceFiltersProvider>      // NEW
      <DashboardStatsProvider>
        <DashboardView />
      </DashboardStatsProvider>
    </InvoiceFiltersProvider>      // NEW
  );
}
```

**Lines 79-90:** Add filter state + facets query
```tsx
function DashboardView() {
  const { filters, reset } = useInvoiceFilters();  // NEW
  const { data: stats, isLoading, isError, params, setParams } = useDashboardStats();
  const [isFilterDrawerOpen, setFilterDrawerOpen] = React.useState(false);  // NEW

  // NEW - fetch facets for filter options
  const facetsQuery = useQuery({
    queryKey: ['invoice-facets'],
    queryFn: fetchInvoiceFacets,
    staleTime: 10 * 60 * 1000,
  });

  // NEW - check if filters are active
  const hasActiveFilters = React.useMemo(() => {
    return (
      filters.statuses.length > 0 ||
      filters.categories.length > 0 ||
      filters.vendors.length > 0 ||
      filters.amountRange !== null
    );
  }, [filters]);
```

**Lines 175-254:** Replace custom filter popover
```tsx
// BEFORE (delete lines 179-254):
<Popover>
  <PopoverTrigger>
    <Button variant="outline">Filter</Button>
  </PopoverTrigger>
  <PopoverContent>
    {/* Custom date-only filter UI */}
  </PopoverContent>
</Popover>

// AFTER (replace with):
<Button
  variant="outline"
  size="sm"
  onClick={() => setFilterDrawerOpen(true)}
>
  <Filter className="h-4 w-4" />
  <span>Filters</span>
</Button>

{/* Add after header section, before charts */}
<InvoiceFilterChips />

{/* Add before closing tag */}
<InvoiceFilterDrawer
  open={isFilterDrawerOpen}
  onOpenChange={setFilterDrawerOpen}
  facets={facetsQuery.data?.facets}
  isLoading={facetsQuery.isLoading}
/>
```

**2. Dashboard Stats Provider** (`src/components/dashboard/dashboard-stats-provider.tsx`)

**Lines 3-6:** Add imports
```tsx
import { useContext as useReactContext } from 'react';  // Rename to avoid conflict
import { useInvoiceFilters } from '@/hooks/use-invoices-filters';
```

**Lines 24-34:** Integrate filter state
```tsx
export function DashboardStatsProvider({ children }: { children: React.ReactNode }) {
  // Access filters from parent InvoiceFiltersProvider
  const context = useReactContext(InvoiceFiltersContext);
  const filters = context ? context.filters : {
    statuses: [],
    categories: [],
    vendors: [],
    amountRange: null,
  };

  const [params, setParamsState] = useState<DashboardStatsParams>({
    dateFrom: `${MIN_DATE}T00:00:00.000Z`,
  });

  // Merge params with filters for API call
  const queryParams = useMemo(() => ({
    ...params,
    status: filters.statuses.length ? filters.statuses : undefined,
    category: filters.categories.length ? filters.categories : undefined,
    vendor: filters.vendors.length ? filters.vendors : undefined,
    amountMin: filters.amountRange?.min,
    amountMax: filters.amountRange?.max,
  }), [params, filters]);

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', queryParams],
    queryFn: () => fetchDashboardStats(queryParams),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
```

**Note:** Alternative simpler approach - use `useInvoiceFilters()` directly, but requires conditional check since Dashboard must work standalone.

**3. Dashboard Stats API Type** (`src/lib/api/stats.ts`)

**Lines 54-58:** Extend interface
```tsx
export interface StatsParams {
  dateFrom?: string
  dateTo?: string
  triggerError?: boolean
  // NEW - filter params
  status?: string[]
  category?: string[]
  vendor?: string[]
  amountMin?: number
  amountMax?: number
}
```

**Lines 60-80:** Update fetch function
```tsx
export async function fetchDashboardStats(params: StatsParams = {}): Promise<DashboardStats> {
  const startTime = Date.now()

  try {
    const url = new URL(`/api/stats`,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

    // Existing params
    if (params.dateFrom) url.searchParams.set('dateFrom', params.dateFrom)
    if (params.dateTo) url.searchParams.set('dateTo', params.dateTo)
    if (params.triggerError) url.searchParams.set('triggerError', 'true')

    // NEW - filter params
    if (params.status?.length) {
      params.status.forEach(s => url.searchParams.append('status', s))
    }
    if (params.category?.length) {
      params.category.forEach(c => url.searchParams.append('category', c))
    }
    if (params.vendor?.length) {
      params.vendor.forEach(v => url.searchParams.append('vendor', v))
    }
    if (params.amountMin != null) url.searchParams.set('amountMin', String(params.amountMin))
    if (params.amountMax != null) url.searchParams.set('amountMax', String(params.amountMax))

    const response = await fetch(url.toString())
    // ... rest of function
```

**4. Dashboard Stats API Route** (`src/app/api/stats/route.ts`)

**Lines ~40-60:** Parse filter params
```tsx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Existing date params
    const fromParam = searchParams.get('dateFrom')
    const toParam = searchParams.get('dateTo')

    // NEW - parse filter params
    const statusFilters = searchParams.getAll('status')
    const categoryFilters = searchParams.getAll('category')
    const vendorFilters = searchParams.getAll('vendor')
    const amountMinParam = parseFloat(searchParams.get('amountMin') || '')
    const amountMaxParam = parseFloat(searchParams.get('amountMax') || '')
```

**Lines ~180-270:** Apply filters to data
```tsx
// After fetching currentPeriodData, before aggregation:
const filtered = currentPeriodData.filter((inv) => {
  // Status filter
  if (statusFilters.length) {
    const status = deriveInvoiceStatus(inv.amount_due || inv.total, inv.due_date, inv.invoice_date || inv.created_at, now)
    if (!statusFilters.includes(status)) return false
  }

  // Category filter
  if (categoryFilters.length) {
    const category = inv.category || 'Uncategorized'
    if (!categoryFilters.includes(category)) return false
  }

  // Vendor filter
  if (vendorFilters.length) {
    const vendor = inv.supplier_name || ''
    if (!vendorFilters.includes(vendor)) return false
  }

  // Amount filter
  const amount = inv.total || 0
  if (!isNaN(amountMinParam) && amount < amountMinParam) return false
  if (!isNaN(amountMaxParam) && amount > amountMaxParam) return false

  return true
})

// Use filtered data for all aggregations:
for (const inv of filtered) {  // Changed from currentPeriodData
  totalInvoices += 1
  totalAmount += amount
  // ... rest of aggregation logic
}
```

**5. Chart Components** (3 files)

**StatusBreakdown** (`src/components/charts/supplier-breakdown.tsx`)
**TopVendors** (`src/components/charts/top-vendors.tsx`)
**CategoryBreakdown** (if exists)

Add to all 3:
```tsx
interface Props {
  data: any;
  isFiltered?: boolean;  // NEW
}

export function ChartComponent({ data, isFiltered }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chart Title</CardTitle>
          {isFiltered && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
        {isFiltered && (
          <p className="text-xs text-slate-500">
            Showing filtered subset
          </p>
        )}
      </CardHeader>
      {/* existing chart content */}
    </Card>
  );
}
```

### Testing Strategy

**Manual Testing Checklist:**

**Dashboard Filter UI:**
- [ ] Filter button opens drawer (not popover)
- [ ] Drawer has 5 sections: Status, Category, Vendor, Date Range, Amount
- [ ] Status: All 5 statuses selectable
- [ ] Category: All categories from facets shown
- [ ] Vendor: All vendors from facets shown
- [ ] Date quick presets work
- [ ] Date custom range works
- [ ] Amount min/max work
- [ ] Clear All resets everything
- [ ] Filter chips appear when filters active
- [ ] Clicking chip removes filter

**Dashboard Charts:**
- [ ] Select status → Charts update
- [ ] Select category → Charts update
- [ ] Select vendor → Charts update
- [ ] Select amount range → Charts update
- [ ] Multiple filters combine (AND logic)
- [ ] "Filtered" badge shows on charts
- [ ] Stats cards stay unfiltered (show totals)
- [ ] Charts re-render correctly

**Cross-Page:**
- [ ] Dashboard filter UI = Kanban filter UI
- [ ] Dashboard filter UI = Invoices filter UI
- [ ] Same components used
- [ ] Same interaction patterns

**E2E Tests** (`tests-e2e/filter-drawer-sync.spec.ts`):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Filter Drawer Synchronization', () => {
  test('Dashboard has full filter drawer like Kanban/Invoices', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter drawer
    await page.click('button:has-text("Filters")')

    // Verify all 5 filter sections exist
    await expect(page.getByText('Status')).toBeVisible()
    await expect(page.getByText('Categories')).toBeVisible()
    await expect(page.getByText('Vendors')).toBeVisible()
    await expect(page.getByText('Date range')).toBeVisible()
    await expect(page.getByText('Amount range')).toBeVisible()
  })

  test('Dashboard charts update when filters applied', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter drawer
    await page.click('button:has-text("Filters")')

    // Select Pending status
    await page.click('button:has-text("pending")')

    // Close drawer
    await page.press('Escape')

    // Verify filtered badge appears on charts
    await expect(page.getByText('Filtered').first()).toBeVisible()
  })

  test('Filter UI identical across all pages', async ({ page }) => {
    // Count filter sections on Dashboard
    await page.goto('/dashboard')
    await page.click('button:has-text("Filters")')
    const dashboardSections = await page.locator('section').count()
    await page.press('Escape')

    // Count filter sections on Kanban
    await page.goto('/kanban')
    await page.click('button:has-text("Filters")')
    const kanbanSections = await page.locator('section').count()
    await page.press('Escape')

    // Count filter sections on Invoices
    await page.goto('/invoices')
    await page.click('button:has-text("Filters")')
    const invoicesSections = await page.locator('section').count()

    // All should be equal
    expect(dashboardSections).toBe(kanbanSections)
    expect(dashboardSections).toBe(invoicesSections)
  })

  test('Clear All resets all filters on Dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Open filter drawer and apply filters
    await page.click('button:has-text("Filters")')
    await page.click('button:has-text("pending")')
    await page.press('Escape')

    // Verify filter chip appears
    await expect(page.getByText('Status: pending')).toBeVisible()

    // Open drawer again
    await page.click('button:has-text("Filters")')

    // Click Clear All
    await page.click('button:has-text("Clear All")')

    // Verify chip disappears
    await expect(page.getByText('Status: pending')).not.toBeVisible()
  })
})
```

## Dependencies

**Existing Components (Reuse - No Changes Needed):**
- ✅ `InvoiceFilterDrawer` (`src/components/invoices/filter-drawer.tsx`)
- ✅ `InvoiceFilterForm` (`src/components/invoices/filter-sidebar.tsx`)
- ✅ `InvoiceFilterChips` (`src/components/invoices/filter-chips.tsx`)
- ✅ `InvoiceFiltersProvider` (`src/hooks/use-invoices-filters.tsx`)
- ✅ `useInvoiceFilters` hook
- ✅ `fetchInvoiceFacets` (`src/lib/api/invoices.ts`)

**Modified:**
- `src/app/(dashboard)/dashboard/page.tsx` - Add provider + drawer + chips
- `src/components/dashboard/dashboard-stats-provider.tsx` - Integrate filters
- `src/lib/api/stats.ts` - Extend StatsParams interface
- `src/app/api/stats/route.ts` - Add filter logic
- `src/components/charts/*.tsx` - Add isFiltered prop

**New:**
- `tests-e2e/filter-drawer-sync.spec.ts` - E2E tests

## Estimated Effort

**Breakdown:**
1. **Dashboard Page - Add Filter UI**: 30 minutes
   - Add InvoiceFiltersProvider wrapper
   - Replace custom popover with InvoiceFilterDrawer
   - Add InvoiceFilterChips
   - Add facets query

2. **Dashboard Stats API - Filter Logic**: 45 minutes
   - Extend StatsParams interface
   - Parse filter query params
   - Apply filters to data aggregation
   - Test filtered vs unfiltered results

3. **Dashboard Stats Provider - Integration**: 20 minutes
   - Access filter state from context
   - Merge filters into query params
   - Update query key to include filters
   - Test query invalidation

4. **Chart Components - Indicators**: 30 minutes
   - Add isFiltered prop to 3 chart components
   - Show "Filtered" badge when active
   - Update help text for filtered views
   - Test visual appearance

5. **Testing**: 30 minutes
   - Manual testing all filter combinations
   - Verify cross-page consistency
   - Test chart updates
   - Test performance

6. **E2E Tests**: 25 minutes
   - Write test spec
   - Test all filter types
   - Test cross-page comparison
   - Verify Clear All behavior

**Total Estimated Time**: 150-180 minutes (2.5-3 hours)

## Priority

**P2** - Medium Priority

**Reasoning:**
- UX inconsistency exists but not blocking core workflows
- Dashboard date filtering already works (main use case)
- Status/Category/Vendor filters nice-to-have for deeper analysis
- Can be implemented after Issue #12 is complete
- Builds on top of existing filter infrastructure
- Enhances analytics capabilities

## Risk Class

**Low-Medium Risk**

**Reasoning:**
- Reuses proven components from Kanban/Invoices
- Dashboard Stats API changes isolated to filter logic
- Backward compatible (date-only filtering still works)
- Chart updates are presentation-layer only
- Provider nesting is safe (React contexts don't conflict)
- Can be feature-flagged if needed

**Potential Issues:**
- Dashboard Stats API may need performance optimization for complex filters
- Chart re-renders may need optimization (React.memo, useMemo)
- Provider nesting order matters (InvoiceFiltersProvider must wrap DashboardStatsProvider)
- Facets query adds API overhead on initial load
- Filter state synchronization across pages if enhanced

**Mitigation:**
- Cache facets aggressively (10 min staleTime)
- Use React Query for intelligent caching + deduplication
- Test performance with large datasets (1000+ invoices)
- Monitor API response times with filters
- Consider pagination for chart data if needed
- Use React.memo for chart components

## Labels

`frontend`, `ux`, `consistency`, `filters`, `dashboard`, `charts`, `enhancement`, `analytics`

## Related Issues

- **Issue #12**: Sync Status Card Filters Across All Pages (prerequisite - establishes filter UX pattern)
- **Issue #11**: Kanban Board UX Improvements (established clickable status cards + filter pattern)

## References

- **Kanban Page** (reference): `src/app/(dashboard)/kanban/page.tsx:23-25` (provider wrapper)
- **Invoices Page** (reference): `src/app/(dashboard)/invoices/page.tsx:46-48` (provider wrapper)
- **Dashboard Page** (to fix): `src/app/(dashboard)/dashboard/page.tsx:179-254` (custom popover)
- **Filter Components**: `src/components/invoices/filter-*.tsx`
- **Filter Hook**: `src/hooks/use-invoices-filters.tsx`
- **Stats API**: `src/app/api/stats/route.ts`

## Success Criteria

**Functional:**
- ✅ Dashboard filter button opens same drawer as Kanban/Invoices
- ✅ All 5 filter types available on Dashboard
- ✅ Charts update when filters applied
- ✅ Filter chips show active filters
- ✅ Clear All resets all filters

**UX:**
- ✅ Identical filter UI across all 3 pages
- ✅ Consistent interaction patterns
- ✅ Clear "Filtered" indicators on charts
- ✅ Intuitive behavior
- ✅ No performance degradation

**Technical:**
- ✅ Dashboard Stats API supports all filter types
- ✅ Chart components respect filters
- ✅ Backward compatible with date-only filtering
- ✅ All E2E tests pass
- ✅ Type safety maintained

## Out of Scope (Future Enhancements)

- Filter state persistence across sessions (localStorage)
- Deep linking with filters in URL (shareable filtered Dashboard views)
- Advanced filter combinations (OR logic, NOT logic)
- Saved filter presets on Dashboard (like Invoices saved views)
- Real-time filter updates (debounced vs apply button)
- Filter history/undo functionality
- Cross-page filter state synchronization (clicking Dashboard pending → Kanban shows same filter)
- Dashboard-specific filters (e.g., filter by trend direction)
