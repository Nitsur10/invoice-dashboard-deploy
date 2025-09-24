# Release Agent

## ROLE
release

## BRANCH
<num>-<slug>; base origin/main

## PR
title "fix: <summary> (#<num>)"; body links spec; labels from issue; assignees

## MERGE
squash; Conventional Commit; optional tag

## ROLLOUT
note feature flag state, canary, rollback command

## DETAILED BEHAVIOR

### Branch Management

#### Branch Creation
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b 001-dashboard-trend-percentages

# Branch naming convention: <issue-number>-<slug>
# Examples:
# 001-dashboard-trend-percentages
# 002-invoice-status-derivation
# 003-stats-error-handling
```

#### Branch Protection
- Always base feature branches on `origin/main`
- Ensure clean working directory before branch creation
- Verify no uncommitted changes that could conflict

### Pull Request Creation

#### PR Title Format
Follow Conventional Commits specification:
```
fix: correct dashboard trend percentage logic (#001)
feat: add month-over-month calculations (#005)
docs: update API documentation for stats endpoint (#003)
```

**Commit Types:**
- `fix:` - Bug fixes
- `feat:` - New features
- `docs:` - Documentation changes
- `style:` - Formatting, no code change
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

#### PR Body Template
```markdown
## Summary
Fixes dashboard trend percentage display showing absolute values instead of month-over-month percentages.

## Related Issue
Closes #001

## Specification
- 📋 [Specification Document](docs/specs/ISSUE-001.mdx)
- 🏗️ [Architecture Decision Record](docs/adr/2025-01-15-dashboard-trends.md)

## Changes Made
- Modified `/api/stats` to calculate true MoM deltas
- Updated `StatsCard` component to display percentage or N/A
- Added feature flag `FEATURE_MOM_CALCS` for safe rollout
- Enhanced error handling for missing historical data

## Test Coverage
| Type | Files | Test Cases | Status |
|------|-------|------------|--------|
| Unit | 2 files | 7 cases | ✅ Pass |
| Integration | 1 file | 5 cases | ✅ Pass |
| E2E | 1 file | 2 cases | ✅ Pass |

**Coverage:** 87% (+2% from baseline)
**Runtime:** 2m 15s

## Quality Gates
- ✅ TypeScript: No errors
- ✅ ESLint: No violations
- ✅ Tests: 14/14 passing
- ✅ Accessibility: 97% axe score
- ✅ Security: No vulnerabilities
- ✅ Performance: Within budgets

## Deployment Notes
### Feature Flag Configuration
```bash
# Production (default: disabled)
FEATURE_MOM_CALCS=false

# Staging (enabled for testing)
FEATURE_MOM_CALCS=true
```

### Rollback Plan
```bash
# Emergency rollback command
git revert <commit-hash> --no-edit
# OR
# Disable feature flag
export FEATURE_MOM_CALCS=false && restart application
```

## Screenshots
- Before: [Dashboard showing "125.0%" for invoice count]
- After: [Dashboard showing "+12.5%" or "N/A" appropriately]

## Checklist
- [x] Tests pass locally
- [x] Documentation updated
- [x] Feature flag configured
- [x] Rollback plan documented
- [x] Security scan clean
- [x] Performance impact assessed
```

#### PR Labels Assignment
Auto-assign labels based on issue metadata:
```typescript
const assignLabels = (issueData: IssueMetadata) => {
  const labels = []

  // From issue labels in backlog.yaml
  if (issueData.labels.includes('frontend')) labels.push('frontend')
  if (issueData.labels.includes('backend')) labels.push('backend')
  if (issueData.labels.includes('analytics')) labels.push('analytics')

  // Priority labels
  if (issueData.priority === 'P1') labels.push('high-priority')
  if (issueData.priority === 'P2') labels.push('medium-priority')

  // Auto-detected labels
  if (hasFeatureFlag) labels.push('feature-flag')
  if (hasBreakingChange) labels.push('breaking-change')
  if (isDatabaseChange) labels.push('database')

  return labels
}
```

#### Assignee Selection
```typescript
const assignReviewers = (changeType: string[]) => {
  const reviewers = []

  if (changeType.includes('frontend')) reviewers.push('@frontend-lead')
  if (changeType.includes('backend')) reviewers.push('@backend-lead')
  if (changeType.includes('database')) reviewers.push('@db-admin')
  if (changeType.includes('security')) reviewers.push('@security-team')

  return reviewers
}
```

### Merge Strategy

#### Squash Merge with Conventional Commit
```bash
# Final commit message format
git commit -m "fix: correct dashboard trend percentage logic (#001)

- Modified /api/stats to calculate true month-over-month deltas
- Updated StatsCard component for percentage/N/A display
- Added FEATURE_MOM_CALCS flag for safe production rollout
- Enhanced error handling for missing historical data

Closes #001"
```

#### Pre-merge Validation
```bash
# Verify all checks pass
gh pr checks 001-dashboard-trend-percentages --wait

# Confirm no conflicts
git fetch origin main
git merge-base --is-ancestor origin/main HEAD || echo "Rebase required"

# Final test run
npm test && npm run lint && npm run type-check
```

#### Optional Tagging
```bash
# Create semantic version tag if significant feature
git tag -a v1.2.0 -m "Release v1.2.0: Dashboard trend calculations"
git push origin v1.2.0
```

### Deployment and Rollout

#### Canary Deployment Strategy
```markdown
## Rollout Plan

### Phase 1: Staging (FEATURE_MOM_CALCS=true)
- Deploy to staging environment
- Run full test suite
- Manual QA validation
- Performance monitoring

### Phase 2: Production Canary (FEATURE_MOM_CALCS=false)
- Deploy code with feature flag disabled
- Monitor application stability
- Verify no regressions

### Phase 3: Feature Flag Enable (FEATURE_MOM_CALCS=true)
- Enable feature for 10% of users
- Monitor error rates and performance
- Gradually increase to 100%

### Phase 4: Cleanup (Optional)
- Remove feature flag after stable period
- Clean up conditional code
```

#### Rollback Commands
```bash
# Method 1: Git revert (preferred)
git revert <commit-hash> --no-edit
git push origin main

# Method 2: Feature flag disable (immediate)
# Update environment variable
FEATURE_MOM_CALCS=false
# Restart application servers

# Method 3: Previous deployment (last resort)
# Redeploy previous known-good version
git checkout <previous-commit>
# Deploy through normal pipeline
```

#### Monitoring and Validation
```bash
# Post-deployment validation
curl -s /api/stats | jq '.totalRevenue.delta'
# Should return percentage or null

# Monitor error rates
# Check application logs for trend calculation errors
# Verify dashboard loads without JavaScript errors
# Confirm no performance regression
```

### Communication

#### Release Notes
```markdown
## Release Notes - v1.2.0

### 🎯 Dashboard Improvements
- **Fixed:** Trend percentages now show correct month-over-month changes instead of absolute values
- **Added:** Graceful handling of missing historical data with "N/A" display
- **Enhanced:** Feature flag control for safe production rollout

### 🛡️ Technical Details
- API endpoint `/api/stats` now returns optional `delta` fields
- Feature flag `FEATURE_MOM_CALCS` controls new functionality
- Backward compatible with existing integrations

### 📊 Impact
- Finance stakeholders now receive accurate KPI trends
- Dashboard shows meaningful percentage changes
- Zero breaking changes for existing functionality
```

## EXECUTION PROTOCOL

### Release Process Steps
1. **Create feature branch** from latest main
2. **Commit all changes** from implementation phase
3. **Generate PR title** using conventional commit format
4. **Create PR body** with comprehensive documentation
5. **Assign labels and reviewers** based on change analysis
6. **Validate all CI checks** pass before merge
7. **Execute squash merge** with conventional commit message
8. **Create deployment plan** with rollout strategy
9. **Document rollback procedures** for emergency response

### Output Format
```markdown
## Release Summary

### Branch Created
- Name: `001-dashboard-trend-percentages`
- Base: `origin/main`
- Commits: 3 changes ready

### Pull Request
- Title: `fix: correct dashboard trend percentage logic (#001)`
- URL: https://github.com/org/repo/pull/123
- Labels: `frontend`, `analytics`, `high-priority`, `feature-flag`
- Reviewers: @frontend-lead, @analytics-team

### Merge Strategy
- Method: Squash merge
- Commit: Conventional format
- Tag: v1.2.0 (optional)

### Rollout Plan
- Staging: Feature enabled for testing
- Production: Feature flag disabled initially
- Canary: 10% → 50% → 100% rollout
- Rollback: Feature flag disable or git revert

### Ready for MERGE token
```