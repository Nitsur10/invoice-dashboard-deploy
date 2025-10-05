# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Synchronized Status Filter Cards (ISSUE-12)**: Consistent clickable status filters across all pages
  - Added In Review and Approved cards to Invoices page (now shows all 5 statuses)
  - Standardized Pending card color to blue across all pages (was amber on Invoices)
  - Made Dashboard Pending and Overdue cards clickable with navigation to filtered Invoices view
  - Updated Invoices grid layout from 4 to 7 columns (lg:grid-cols-5 xl:grid-cols-7)
  - Full keyboard navigation support (Tab + Enter/Space) on all clickable cards
  - ARIA attributes for accessibility (role="link", aria-label)
  - E2E test coverage for cross-page filter synchronization
  - Consistent color mapping: Pending=Blue, In Review=Amber, Approved=Purple, Paid=Green, Overdue=Red

- **Kanban Board UX Improvements (ISSUE-11)**: Enhanced kanban card readability and interactive status filters
  - Card description text now truncates to 2 lines with ellipsis (line-clamp-2)
  - Full description visible on hover via native HTML tooltip
  - Status summary cards are now clickable filters (Pending, In Review, Approved, Paid, Overdue)
  - Visual feedback: ring indicators and background tint when status filter is active
  - Full keyboard navigation support (Tab + Enter/Space)
  - Screen reader announcements for filter state (ARIA attributes)
  - Consistent UX with Invoices page clickable status cards pattern
  - Maintains all existing drag-and-drop functionality

### Fixed
- **Kanban Status Count Accuracy (ISSUE-11)**: Corrected status card counts to show accurate numbers
  - Fixed overdue count showing "5" instead of actual count
  - Replaced 5 separate API calls with single optimized query
  - Client-side status counting for all 5 statuses (pending, in_review, approved, paid, overdue)
  - Improved performance by reducing API calls from 5 to 1

### Added
- **Mobile & Desktop Responsive Design (ISSUE-10)**: Complete mobile and tablet support for dashboard
  - Responsive hooks: `useMediaQuery`, `useBreakpoint`, `useCurrentBreakpoint` for viewport detection
  - Mobile drawer navigation with hamburger menu (< 768px)
  - Card-based invoice list view for mobile devices (replaces table on small screens)
  - Touch-friendly interactions with 44x44px minimum touch targets
  - Progressive grid scaling: 1 → 2 → 4 → 5 columns across breakpoints
  - SSR-safe responsive logic with proper hydration
  - No horizontal scroll on any viewport size
  - Full accessibility support (ARIA labels, keyboard navigation, focus trap)

- **Invoice Description Column (ISSUE-8)**: Replace duplicate supplier column with invoice description in table view
  - Text truncation with first-line display for improved readability
  - Native HTML tooltip on hover showing full description text
  - Full accessibility support with ARIA labels and keyboard navigation
  - Responsive design maintaining existing table layout consistency
  - Fallback display ("—") for empty descriptions
  - Preserves existing vendor filtering functionality through primary vendor column

### Changed
- **Dashboard Layout**: Switched from fixed sidebar to responsive sidebar with adaptive padding (`pl-0 md:pl-72`)
- **Invoice Table**: Now uses `DataTableResponsive` wrapper that conditionally renders table (desktop) or cards (mobile)
- **Stats Grids**: Updated to progressive scaling `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`

### Technical Details (ISSUE-10)
- Added responsive hook system (`src/hooks/useMediaQuery.ts`, `src/hooks/useBreakpoint.ts`)
- Implemented `ResponsiveSidebar` component with mobile drawer pattern
- Created `InvoiceCard` and `InvoiceCardList` components for mobile data views
- Added `DataTableResponsive` wrapper for viewport-adaptive table rendering
- Comprehensive test coverage: 125+ test cases (unit tests + E2E Playwright tests)
- Zero security vulnerabilities (npm audit clean)
- Type-safe breakpoint detection with compile-time validation
- ADR document: `docs/adr/ADR-010-mobile-responsive-architecture.md`

### Technical Details (ISSUE-8)
- Added `DescriptionCell` component with conditional tooltip display logic
- Implemented first-line extraction from multi-line descriptions
- Added comprehensive test coverage including accessibility, responsive design, and integration tests
- Maintains backward compatibility with existing data export functionality
- No breaking changes to API or database schema

### Files Modified (ISSUE-10)
- `src/app/(dashboard)/layout.tsx`: Integrated ResponsiveSidebar with adaptive padding
- `src/components/layout/sidebar.tsx`: Added onNavigate callback prop for drawer close
- `src/app/(dashboard)/invoices/page.tsx`: Switched to DataTableResponsive with responsive grids

### Files Modified (ISSUE-8)
- `src/components/invoices/columns.tsx`: Added description column with `DescriptionCell` component
- Added comprehensive test suite covering accessibility and responsive behavior

## [Previous Releases]

### [2025-09-21] - Major Dashboard Improvements
- Status chart implementation
- Actions column with inline status updates
- API fixes and improvements
- Enhanced status management with dropdown controls

### [2025-09-20] - Initial Release
- Core invoice management system
- Supabase integration
- User authentication
- Dashboard with Kanban board
- CSV export functionality
- Responsive design implementation