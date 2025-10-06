# Sync Filter Drawer UI Across All Pages (ISSUE-13)

## Summary

Replaces Dashboard's custom date-only filter popover with the shared `InvoiceFilterDrawer` component used by Kanban and Invoices pages, providing a consistent filtering experience across the entire application.

## Changes

### Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)
- ✅ Wrapped in `InvoiceFiltersProvider` for filter state management
- ✅ Replaced custom Popover filter (lines 179-254) with `InvoiceFilterDrawer`
- ✅ Added `InvoiceFilterChips` to display active filters
- ✅ Added facets query for filter options
- ✅ Removed unused date filter functions (applyFilters, setQuickDateRange, clearFilters)
- ✅ Added `hasActiveFilters` check to pass to charts

### Dashboard Stats API Integration
**StatsParams Interface (`src/lib/api/stats.ts`)**
- ✅ Extended with filter fields: `status`, `category`, `vendor`, `amountMin`, `amountMax`
- ✅ Updated `fetchDashboardStats` to handle array parameters (status, category, vendor)

**API Route (`src/app/api/stats/route.ts`)**
- ✅ Parse filter query params from URL
- ✅ Apply filters during data aggregation (after date filtering, before calculations)
- ✅ Backward compatible with existing date-only filtering

### Dashboard Stats Provider (`src/components/dashboard/dashboard-stats-provider.tsx`)
- ✅ Import and access `useInvoiceFilters` hook
- ✅ Gracefully handle missing `InvoiceFiltersProvider` (try-catch)
- ✅ Merge filter state into query params
- ✅ Update query key to trigger refetch on filter changes

### Chart Components
**StatusBreakdown (`src/components/charts/supplier-breakdown.tsx`)**
- ✅ Add `isFiltered` prop
- ✅ Show "Filtered" badge when active
- ✅ Update description text for filtered views

**TopVendors (`src/components/charts/top-vendors.tsx`)**
- ✅ Add `isFiltered` prop
- ✅ Show "Filtered" badge when active
- ✅ Update description text for filtered views

### Testing
**E2E Tests (`tests-e2e/filter-drawer-sync.spec.ts`)**
- ✅ Verify Dashboard has full filter drawer with all 5 sections
- ✅ Verify charts update when filters applied
- ✅ Verify filter UI identical across Dashboard, Kanban, Invoices
- ✅ Verify Clear All resets all filters
- ✅ Verify filter chips appear and remove correctly

### Documentation
**Specification (`docs/specs/ISSUE-013.mdx`)**
- ✅ Problem statement, solution, implementation plan
- ✅ Acceptance criteria, risk assessment
- ✅ Estimated effort: 2.5-3 hours

**CHANGELOG (`CHANGELOG.md`)**
- ✅ Added entry for ISSUE-13 under "Unreleased" section

## Test Plan

### Manual Testing
- [ ] Open Dashboard, click Filters button
- [ ] Verify filter drawer opens with all 5 sections (Status, Category, Vendor, Date Range, Amount)
- [ ] Apply filters from each section
- [ ] Verify filter chips appear below header
- [ ] Verify charts show "Filtered" badge
- [ ] Verify charts update with filtered data
- [ ] Click chip to remove filter
- [ ] Click Clear All to reset all filters
- [ ] Compare filter UI with Kanban and Invoices pages (should be identical)

### Automated Tests
```bash
npm test -- tests-e2e/filter-drawer-sync.spec.ts
```

### Build & Type Check
```bash
npm run build
npm run type-check
```

## Risk Assessment

**Low-Medium Risk**

**Reasons:**
- Reuses proven `InvoiceFilterDrawer` and `InvoiceFiltersProvider` components
- Dashboard Stats API changes isolated to filter logic
- Backward compatible (date-only filtering still works)
- Provider nesting is safe (contexts don't conflict)

**Potential Issues:**
- Performance with complex filters (mitigated by React Query caching)
- Provider order matters (`InvoiceFiltersProvider` must wrap `DashboardStatsProvider`)

## Acceptance Criteria

- [x] Dashboard filter button opens `InvoiceFilterDrawer` (not custom popover)
- [x] All 5 filter types available: Status, Category, Vendor, Date Range, Amount
- [x] Filter chips appear below header showing active filters
- [x] Charts update when filters applied
- [x] "Filtered" badge shows on charts when filters active
- [x] Clear All button resets all filters
- [x] Filter UI identical across Dashboard, Kanban, Invoices pages
- [x] Backward compatible with existing date-only filtering
- [x] All E2E tests pass
- [x] Build succeeds

## Screenshots

_Add screenshots showing:_
1. Dashboard with filter drawer open
2. Charts with "Filtered" badge
3. Filter chips below header
4. Comparison with Kanban/Invoices filter drawer

## Related Issues

- Closes #13
- Builds on #12 (Sync Status Filter Cards)
- Builds on #11 (Kanban UX Improvements)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
