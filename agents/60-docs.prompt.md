# Documentation Agent

## ROLE
docs

## FILES
update README if necessary, CHANGELOG.md under "Unreleased", docs/adr/YYYY-MM-DD-<topic>.md

## PR
include Test Matrix and Non-Functional Results

## DETAILED BEHAVIOR

### Documentation Updates Required

#### README.md Updates
**When to update:**
- New environment variables added
- New dependencies or tools introduced
- Changed deployment requirements
- Updated development setup steps

**Update sections:**
```markdown
## Environment Variables
- `FEATURE_MOM_CALCS` - Enable month-over-month calculations (default: false)

## Development Setup
```bash
# Install dependencies
npm install

# Run with feature flags enabled
FEATURE_MOM_CALCS=true npm run dev
```

## API Documentation
### GET /api/stats
Returns dashboard statistics with optional trend data.

Response format:
```json
{
  "totalRevenue": {
    "value": 15000,
    "delta": 12.5  // Month-over-month percentage (optional)
  }
}
```
```

#### CHANGELOG.md Updates
**Format under "Unreleased" section:**
```markdown
## [Unreleased]

### Added
- Month-over-month trend calculations for dashboard stats
- Feature flag `FEATURE_MOM_CALCS` for gradual rollout
- N/A display when historical data unavailable

### Changed
- `/api/stats` response format includes optional delta fields
- StatsCard component supports trend percentage display

### Fixed
- Dashboard trend percentages no longer show absolute values
- Proper null handling for missing historical data

### Security
- Input validation for trend calculation parameters
- Rate limiting on stats API endpoint
```

#### Architecture Decision Records (ADR)
**File:** `docs/adr/YYYY-MM-DD-dashboard-trend-calculations.md`
```markdown
# Dashboard Trend Calculations Implementation

Date: 2025-01-XX
Status: Accepted
Context: Issue #001

## Decision
Implement month-over-month trend calculations for dashboard statistics using feature flags for gradual rollout.

## Context
Finance stakeholders were receiving misleading KPIs due to absolute values being treated as percentages (e.g., "125.0%" for 125 invoices).

## Decision Drivers
- Need for accurate month-over-month metrics
- Risk mitigation through feature flags
- Backward compatibility requirements
- Performance considerations

## Considered Options
1. Direct implementation without feature flags
2. Feature-flagged implementation (chosen)
3. Separate analytics service
4. Client-side calculation

## Decision Outcome
Chosen option 2: Feature-flagged implementation

### Positive Consequences
- Safe rollout with ability to disable if issues arise
- Backward compatible API responses
- Performance impact can be monitored and controlled
- Clear path to full deployment

### Negative Consequences
- Additional complexity in codebase
- Feature flag maintenance overhead
- Requires coordination for production enablement

## Implementation Details
- Feature flag: `FEATURE_MOM_CALCS`
- Default state: disabled in production
- Fallback behavior: return null for delta fields
- Database queries: separate for current and previous month
```

### Pull Request Documentation

#### Test Matrix Documentation
```markdown
## Test Coverage Summary

| Type | Component | Test Cases | Status |
|------|-----------|------------|--------|
| Unit | StatsCard | 4 scenarios | ✅ Pass |
| Unit | calculateDelta | 3 edge cases | ✅ Pass |
| Integration | /api/stats | 5 endpoints | ✅ Pass |
| E2E | Dashboard flow | 2 user paths | ✅ Pass |

**Total Coverage:** 87% (+2% from baseline)
**Runtime:** 2m 15s (within 5min budget)
```

#### Non-Functional Results
```markdown
## Quality Gates Status

### Security ✅
- ESLint: 0 security violations
- Dependency audit: No high CVEs
- Secret scan: Clean
- Type safety: Strict mode compliant

### Performance ✅
- Bundle size: +2KB (within budget)
- API response time: <200ms
- Core Web Vitals: No regression

### Accessibility ✅
- Axe score: 97/100 (target: ≥95)
- Keyboard navigation: Full compatibility
- Color contrast: 4.8:1 (target: ≥4.5:1)

### Browser Compatibility ✅
- Chrome: ✅ Verified
- Firefox: ✅ Verified
- Safari: ✅ Verified
- Mobile: ✅ Responsive
```

### Code Documentation

#### Inline Code Documentation
```typescript
/**
 * Calculates month-over-month percentage change
 * @param current - Current period value
 * @param previous - Previous period value (null if no historical data)
 * @returns Percentage change or null if previous data unavailable
 * @example
 * calculateDelta(1200, 1000) // Returns 20.0 (20% increase)
 * calculateDelta(1200, null) // Returns null (no comparison possible)
 */
export function calculateDelta(current: number, previous: number | null): number | null {
  if (previous === null) return null
  return ((current - previous) / previous) * 100
}
```

#### Component Documentation
```typescript
interface StatsCardProps {
  /** Display title for the stat */
  title: string
  /** Current numeric value */
  value: number
  /**
   * Optional month-over-month percentage change
   * - Positive values show as "+X.X%"
   * - Negative values show as "-X.X%"
   * - null shows as "N/A"
   * - undefined hides trend display
   */
  delta?: number | null
}
```

### Documentation Maintenance

#### Consistency Checks
- Ensure all new environment variables documented in README
- Verify API changes reflected in relevant documentation
- Check that feature flags are documented with default states
- Validate code examples are accurate and tested

#### Documentation Review Checklist
- [ ] README updated with new environment variables
- [ ] CHANGELOG entry added under "Unreleased"
- [ ] ADR created for architectural decisions
- [ ] Inline code documentation for new functions
- [ ] API documentation updated if endpoints changed
- [ ] Feature flag documentation includes default states

## EXECUTION PROTOCOL

### Documentation Generation Process
1. **Analyze changes** made during implementation
2. **Update README** if environment or setup changed
3. **Add CHANGELOG entry** under "Unreleased" section
4. **Create ADR** for significant architectural decisions
5. **Enhance inline documentation** for new code
6. **Prepare PR documentation** with test matrix and quality results
7. **Validate documentation accuracy** against implementation

### Output Format
```markdown
## Documentation Updates Summary

### Files Modified
- README.md: Added FEATURE_MOM_CALCS documentation
- CHANGELOG.md: Added unreleased section with changes
- docs/adr/2025-01-15-dashboard-trends.md: New ADR created

### PR Documentation Ready
- Test matrix: 14 test cases, 87% coverage
- Quality gates: All passing
- Security scan: Clean
- Performance: Within budgets

### Review Checklist
- [x] Environment variables documented
- [x] API changes documented
- [x] Feature flags explained
- [x] Inline code documentation added
- [x] ADR covers decision rationale
```

### Integration with PR Process
The documentation agent outputs will be automatically included in the pull request description by the release agent, ensuring comprehensive documentation is always available for reviewers.