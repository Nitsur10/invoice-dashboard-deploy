# n8n Workflows

This directory centralizes knowledge about the automations that collect, enrich, and deliver the datasets powering the Invoice Dashboard. Keep every production-ready workflow captured here so future iterations of the dashboard can rely on a clear, versioned source of truth.

## Current Scope
- Inventory and document the n8n workflows running in production.
- Describe how each workflow is triggered, where the data lands, and what the downstream contract looks like for the dashboard.
- Track upcoming changes (new flows or edits) before they are deployed, linking to designs or issues when available.

## Environments
### Production (`n8n` Lightsail instance)
- **Base URL:** `https://13-54-176-108.nip.io`
- **Version:** n8n `1.115.3` (updated 2025-10-16; verify before upgrades).
- **Primary Workflow ID:** `tkQhi81f24yhshdW` (existing automation on the shared instance; confirm before reuse or edits).
- **Access:** `ssh -i ~/.ssh/lightsail_n8n.pem ubuntu@13.54.176.108`
- **Credentials:** Managed in the n8n credential store; follow the Lightsail SSH key rotation playbook before changing secrets.
- **Webhooks:** `scripts/update-tracker.mjs` expects `N8N_WEBHOOK` to point at the production webhook that records tracker events.
- **Monitoring:** Use the n8n execution list and `docker logs -f n8n` on the Lightsail host; document additional monitoring (CloudWatch, external alerting) if configured.

### Non-production / local testing
- No dedicated sandbox is tracked yet. Document any ad-hoc setups (e.g., local Docker, staging instance) before using them for development.

## Workflow Catalogue
| Workflow | Purpose | Trigger | Outputs / Destinations | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| [Zara Invoice Management V2.0 – Xero only](zara-invoice-management-v20-xero-only.md) | Capture Xero reminder emails with invoice links, extract data, archive PDFs | Schedule (every 3h) | Supabase `invoice` table + SharePoint `Invoice Register.xlsx` (`Xero only` Table4) + OneDrive archive | Active (prod) | Export: `exports/wf-wzR6HlmIjTuvfyfj.json` |
| [Zara Invoice Management V2.0 – Taxcellent](zara-invoice-management-v20-taxcellent.md) | Process Taxcellent + ATO/ASIC payment reminders for the Taxcellent register | Schedule (every 3h) | Supabase `invoice` table + SharePoint `Invoice Register.xlsx` (`Taxcellent` Table5 & `Xero only` Table4) + OneDrive archive | Active (prod) | Export: `exports/wf-ZZcktTuP2fFegZ26.json` |
| [Invoice Management – Frank only](invoice-management-frank-only.md) | Parse Frank/FBCS invoices from Outlook, dedupe, and sync to the dashboard dataset | Schedule (every 3h) | Supabase `invoice` table + SharePoint `Invoice Register.xlsx` (`Frank` Table2 & `Xero only` Table4) + OneDrive archive | Active (prod) | Export: `exports/wf-fEAs3LZr0lMDWziF.json` |
| [Postal Invoice Intake – OCR](postal-invoice-ocr.md) | Pick up postal invoices dropped in OneDrive, OCR, archive, and land data for the dashboard | Schedule (every 3h) + manual | Supabase `invoice` table + SharePoint `Invoice Register.xlsx` (Postal sheet) + OneDrive archive | Planned (spec ready) | Requires Supabase + Graph credentials; see design for rollout checklist |

See [Invoice Dataset Schema](invoice-dataset-schema.md) for the column-level contract shared across these flows.

Populate the table above as you audit the existing flows. Each workflow should also have:
- Links to the n8n JSON export committed alongside this README.
- Version history notes (changes, owners, approval date).
- Data shape definition (fields exposed to the dashboard).

## Data Contracts
- Outputs from these workflows feed the Invoice Dashboard’s aggregation logic. Document each dataset (tables, files, or API endpoints), including primary keys and freshness SLAs.
- Call out any transformations expected downstream (e.g., Supabase views, dashboard ETL steps) so changes in n8n stay compatible.
- Record how failures in the workflow propagate to the dashboard (missing data, stale metrics) and who to notify.
- Maintain the `source` field taxonomy (see [Invoice Dataset Schema](invoice-dataset-schema.md)) so each invoice can be traced back to its originating workflow (e.g., `xero_email`, `taxcellent_email`, `frank_email`, `postal_ocr`).

## Pending Work
- [ ] Audit all active production workflows and add their entries (with exports) to this directory.
- [ ] Outline the new flows requested for upcoming dashboard enhancements, referencing design or analytics requirements.
- [ ] Capture any minor modifications needed on existing flows before deployment, including regression test steps.
- [ ] Extend the four invoice workflows to support 30-day backfills with data-miss detection dashboards.
- [ ] Harden Supabase ↔ Excel reconciliation (daily counts, supabase_id parity) across the invoice workflows.

Keep this README close to reality—update it whenever a workflow changes or a new automation is introduced.
