# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Invoice Description Column (ISSUE-8)**: Replace duplicate supplier column with invoice description in table view
  - Text truncation with first-line display for improved readability
  - Native HTML tooltip on hover showing full description text
  - Full accessibility support with ARIA labels and keyboard navigation
  - Responsive design maintaining existing table layout consistency
  - Fallback display ("—") for empty descriptions
  - Preserves existing vendor filtering functionality through primary vendor column

### Technical Details
- Added `DescriptionCell` component with conditional tooltip display logic
- Implemented first-line extraction from multi-line descriptions
- Added comprehensive test coverage including accessibility, responsive design, and integration tests
- Maintains backward compatibility with existing data export functionality
- No breaking changes to API or database schema

### Files Modified
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