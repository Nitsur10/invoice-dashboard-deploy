# Issue: Invoice summary cards show incorrect counts from current page only

## Summary
On the invoices page, the five summary cards (Total, Current Page Total, Pending, Paid, Overdue) display counts that only reflect the current page of results, not the entire database. While "Total Invoices" correctly shows the full count from API pagination, the Pending/Paid/Overdue cards only count invoices visible on the current page.

## Scope
- Move status count calculations from client-side to backend aggregation in `/api/invoices` or create a dedicated stats endpoint.
- Update the invoices page to display true database totals for Pending/Paid/Overdue regardless of pagination state.
- Ensure the stats calculation doesn't degrade performance (use database aggregation, not full table scan).
- Consider caching strategy if stats are expensive to compute.

## Acceptance Criteria
- Pending card shows total pending invoices across entire database, not just current page.
- Paid and Overdue cards behave similarly with full database counts.
- Stats remain accurate when user navigates between pages or applies filters.
- Performance remains acceptable (stats load within 500ms).
- "Current Page Total" continues to show sum of amounts on visible page only.

## References
- Current implementation: `src/app/(dashboard)/invoices/page.tsx` lines 172-184 (stats calculation).
- Stats are computed client-side from `invoices` array which only contains current page data.
- API response: `src/lib/api/invoices.ts` defines InvoicesResponse structure.
- Consider patterns from: `src/app/api/stats/route.ts` for aggregation examples.