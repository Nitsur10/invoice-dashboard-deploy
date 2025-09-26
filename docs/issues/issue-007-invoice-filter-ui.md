# Issue: Redesign invoice filters as top-right popover

## Summary
Invoice filters currently live in a left-hand sidebar/drawer. Request is to mirror the Kanban board pattern: provide a filter button next to "Export CSV" that opens a compact popover with status, category, vendor, date, and amount controls (pre-populated instead of blank).

## Scope
- Replace `InvoiceFilterSidebar` with a top-right filter trigger (button or dropdown) positioned near the export actions.
- Reuse existing filter controls inside a popover/modal so desktop & mobile match the Kanban UX.
- Ensure facets (statuses, categories, vendors, etc.) load before rendering so lists aren’t empty; show skeleton/loader when fetching.
- Update tests/docs as necessary and remove unused sidebar layout code.

## Acceptance Criteria
- Invoices page shows a filter button beside Export CSV; sidebar is removed.
- Clicking the button opens a popover containing status/category/vendor/date/amount filters populated from Supabase facets.
- Filters continue to sync with `useInvoiceFilters` context and chips.
- Works on mobile (drawer style) and desktop (popover) with accessible focus management.

## References
- Current layout: `src/app/(dashboard)/invoices/page.tsx` (sidebar grid + toolbar buttons).
- Filter components: `src/components/invoices/filter-sidebar.tsx`, `filter-drawer.tsx`, `filter-chips.tsx`.
- Kanban filter UX inspiration: `src/components/kanban/*` (check board header controls).

