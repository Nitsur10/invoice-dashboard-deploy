# Issue: Refine Invoice Status Derivation Logic

## Summary
The API currently forces any invoice issued before 1 May 2025 to `paid`. Although the client focuses on data from that date forward, this hard clamp risks hiding legitimate overdue amounts if older records slip through. We should respect actual payment data and only fall back to derivation when fields are missing.

## Scope
- Update `deriveInvoiceStatus` in `src/app/api/invoices/route.ts` **and** `src/app/api/stats/route.ts` to:
  - Use stored status fields when available.
  - Remove the unconditional “pre-2025 == paid” rule.
  - Derive status based on `amount_due` and `due_date` irrespective of issue date.
- Add tests or logging to ensure future regressions are detectable.

## Acceptance Criteria
- Legacy invoices (if present) reflect their true status (pending/overdue) rather than defaulting to paid.
- Dashboard metrics and invoice list stay in sync because both share the same status rules.
- No regressions for post–May 2025 records (status derivation still works with partial data).

## References
- Current derivation function duplicated in:
  - `src/app/api/invoices/route.ts`
  - `src/app/api/stats/route.ts`

