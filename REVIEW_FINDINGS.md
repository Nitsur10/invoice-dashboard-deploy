# Invoice Dashboard Review Findings

Deployment: [rpd-invoice-dashboard-beta.vercel.app](https://rpd-invoice-dashboard-beta.vercel.app/)

## Critical Issues
- **Trend Metrics Misrepresented** – `/api/stats` populates `overview.trends` with raw totals (see `src/app/api/stats/route.ts`) while `StatsCards` renders them as percentage deltas (`src/components/dashboard/stats-cards.tsx`). Resulting values (e.g. `125.0%`) mislead stakeholders.

## High Severity Issues
- **Legacy Invoices Forced to Paid** – `deriveInvoiceStatus` in both stats and invoices APIs (`src/app/api/stats/route.ts`, `src/app/api/invoices/route.ts`) auto-marks any invoice issued before 2025-05-01 as `paid`, hiding genuine historical debt.
- **5k Row Fetch Ceiling** – Both APIs pull a maximum of 5 000 records (`select('*').limit(5000)`) and filter in-memory. Larger datasets silently truncate, skewing totals and lists for high-volume clients.

## Medium Severity Issues
- **Silent Stats API Failures** – `fetchDashboardStats` catches errors and returns an all-zero payload without surfacing `isError`, causing UI to display zeros instead of an outage indicator (`src/lib/api/stats.ts`).
- **Supabase Admin Client Without Guard** – `supabaseAdmin` initializes with `process.env.SUPABASE_SERVICE_ROLE_KEY!`; missing keys yield runtime failures even though `isSupabaseConfigured()` exists (`src/lib/server/supabase-admin.ts`).
- **Data Window Clamp Limits Insight** – Default minimum date of 2025-05-01 restricts the dashboard from displaying earlier history, limiting executive retrospectives.

## Open Questions
- Should invoices predating the May 2025 cutoff be fully supported (status + reporting)?
- What data volumes should we expect, and do we need SQL-side filtering/pagination to replace the 5 000 row cap?
- How should trend deltas be calculated—should we derive month-over-month changes from the n8n-sourced spreadsheet or Supabase views?

## Recommended Next Steps
- Align trend payload/visualization to true percentage deltas and add validation.
- Rework status derivation to respect real payment data, removing the hard May 2025 clamp.
- Push filtering/sorting into Supabase (or via paginated RPC) to scale beyond 5 000 invoices.
- Expose stats API errors to the UI (e.g. toast + retry) instead of masking with zeros.
- Validate Supabase env vars at startup and lazily instantiate the admin client when configured.
- Offer broader historical ranges so finance leaders can audit periods prior to May 2025.

