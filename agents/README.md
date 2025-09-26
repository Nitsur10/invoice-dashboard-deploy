# Multi-Agent GitHub Issue Orchestration System

A sophisticated **7-agent orchestration system** that transforms GitHub issue numbers into production-ready code through strict **PLAN → APPLY → TEST → PR → MERGE** workflow gates.

## 🎯 Overview

This system automates the complete software development lifecycle from issue specification to production deployment, ensuring 100% quality gate compliance and maintaining human oversight through token-based execution gates.

### Key Features

- **🚦 Token-based execution** - No accidental automation, human approval required at each phase
- **🧪 Test-first development** - Failing tests written before implementation
- **✅ Quality gates** - TypeCheck, lint, accessibility ≥95%, performance budgets
- **🔒 Security-first** - Dependency audit, secrets scanning, vulnerability checks
- **📝 Conventional commits** - Structured git history and automated changelog
- **🚩 Feature flags** - Risk mitigation for breaking changes
- **📊 Complete audit trail** - Full execution logging and reporting

## 🏗️ Architecture

### Agent Hierarchy

```
00-orchestrator.prompt.md     # Master coordinator with token gates
├── 10-spec.prompt.md         # Requirements clarification & risk analysis
├── 20-tests.prompt.md        # Test-first development (unit/int/e2e)
├── 30-impl.prompt.md         # Minimal code implementation
├── 40-qa.prompt.md           # Accessibility & visual regression
├── 50-sec.prompt.md          # Security, linting, performance audits
├── 60-docs.prompt.md         # Documentation, ADRs, changelog
└── 70-release.prompt.md      # Branch management, PRs, merge strategy
```

### Execution Flow

```
ISSUE #123 → PLAN → APPLY → TEST → PR → MERGE → PRODUCTION
          ↓      ↓      ↓     ↓     ↓
       [SPEC]  [TESTS] [QA]  [DOCS] [RELEASE]
              [IMPL]   [SEC]
```

## 🚀 Quick Start

### Prerequisites

```bash
# Required dependencies
npm install -g yaml @octokit/rest

# Optional but recommended
export GITHUB_TOKEN="your-github-token"
export GITHUB_OWNER="your-org"
export GITHUB_REPO="your-repo"
```

### Basic Usage

```bash
# Method 1: Using the coordinator utility
cd agents/
npm install
node agent-coordinator.js execute 001 PLAN
# ... follow prompts with tokens: APPLY, TEST, PR, MERGE

# Method 2: Manual orchestration (with Claude Code)
@orchestrator #001  # Load issue and start orchestration
# Wait for "Ready for APPLY token"
APPLY
# Wait for "Ready for TEST token"
TEST
# Wait for "Ready for PR token"
PR
# Wait for "Ready for MERGE token"
MERGE
```

## 📋 Issue Management Integration

### Issue Format (docs/issues/backlog.yaml)

```yaml
issues:
  - title: "Fix dashboard trend percentage logic"
    body: |
      Problem: Stats cards treat absolute totals as percentages...
      Impact: Finance stakeholders receive misleading KPIs...
      Recommendation: Adjust /api/stats to return true MoM deltas...
    labels: ["frontend", "analytics"]
    priority: "P1"
```

### Issue Documentation Structure

```
docs/
├── issues/
│   ├── backlog.yaml                 # Master issue backlog
│   └── issue-001-trend-delta.md     # Detailed issue docs
├── specs/
│   └── ISSUE-001.mdx               # Generated specifications
└── adr/
    └── 2025-01-15-dashboard-trends.md  # Architecture decisions
```

## 🔄 Workflow Examples

### Example 1: Dashboard Trend Fix (Issue #001)

```bash
# 1. PLAN Phase
@orchestrator #001

## PLAN SUMMARY
- **Issue:** #001 - Fix dashboard trend percentage logic
- **Priority:** P1 (from YAML)
- **Files to modify:**
  - src/app/api/stats/route.ts (30 lines)
  - src/components/StatsCard.tsx (15 lines)
- **Test matrix:** unit: 4, integration: 2, e2e: 1
- **Quality gates:** typecheck, lint, a11y≥95%, security, performance

**Ready for APPLY token**

# 2. APPLY Phase
APPLY

## IMPLEMENTATION SUMMARY
- **Tests created:** [StatsCard.test.ts, calculateDelta.test.ts, stats-api.int.test.ts]
- **Code changes:** [Added calculateDelta function, updated StatsCard props, modified /api/stats]
- **TypeCheck:** ✅ 0 errors
- **Lint:** ✅ 0 warnings

**Ready for TEST token**

# 3. TEST Phase
TEST

## TEST RESULTS
| Gate | Status | Score/Details |
|------|--------|---------------|
| Unit Tests | ✅ PASS | 7/7 passed |
| Integration | ✅ PASS | 2/2 passed |
| E2E Tests | ✅ PASS | 1/1 passed |
| Accessibility | ✅ PASS | 97% axe score |
| Performance | ✅ PASS | <200ms API |
| Security | ✅ PASS | 0 vulnerabilities |
| Dependencies | ✅ PASS | Audit clean |

**Ready for PR token**

# 4. PR Phase
PR

## PULL REQUEST CREATED
- **Branch:** 001-dashboard-trend-percentages
- **PR URL:** https://github.com/org/repo/pull/456
- **Status:** Ready for review
- **Checks:** ✅ All CI checks passing

**Ready for MERGE token**

# 5. MERGE Phase
MERGE

## MERGE COMPLETED
- **Commit:** abc1234 "fix: correct dashboard trend percentage logic (#001)"
- **Tag:** v1.2.0
- **Issue:** #001 closed with resolution
- **Cleanup:** Feature branch removed

**Orchestration complete**
```

### Example 2: API Enhancement (Issue #005)

```bash
# Full workflow with feature flags
@orchestrator #005

# PLAN → Identifies need for database changes and feature flag
# APPLY → Creates failing tests, implements with FEATURE_MOM_TRENDS flag
# TEST → Verifies backward compatibility and performance impact
# PR → Creates canary deployment plan
# MERGE → Deploys with flag disabled, enables gradually
```

## 🛠️ Agent Configuration

### Environment Variables

```env
# Feature Flags
FEATURE_MOM_CALCS=false              # Month-over-month calculations
FEATURE_ADVANCED_FILTERS=false      # Enhanced filtering options

# Quality Gates
MIN_TEST_COVERAGE=85                 # Minimum test coverage %
MAX_BUNDLE_SIZE=250                  # Max bundle size (KB)
MIN_ACCESSIBILITY_SCORE=95           # Min axe score
MAX_API_RESPONSE_TIME=200            # Max API response (ms)

# GitHub Integration
GITHUB_TOKEN=your-token
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo

# Security
ENABLE_SECURITY_SCANNING=true
GITLEAKS_CONFIG=.gitleaks.toml
```

### Project Structure Requirements

```
project-root/
├── docs/
│   ├── issues/backlog.yaml          # Issue tracking
│   ├── specs/                       # Generated specs
│   └── adr/                         # Architecture decisions
├── agents/                          # Agent system
├── src/                            # Source code
├── tests/                          # Test suites
│   ├── integration/
│   └── e2e/
├── package.json                    # Scripts and dependencies
└── playwright.config.ts            # E2E test config
```

## 🎮 Advanced Usage

### Custom Agent Delegation

```javascript
// Using the coordinator programmatically
const AgentCoordinator = require('./agent-coordinator')

const coordinator = new AgentCoordinator()
await coordinator.loadIssue(123)

// Custom workflow
const specResult = await coordinator.delegateToAgent('spec', {
  issue: coordinator.issueContext,
  customRequirements: ['performance-critical', 'backward-compatible']
})
```

### Integration with CI/CD

```yaml
# .github/workflows/agent-orchestration.yml
name: Agent Orchestration
on:
  issue_comment:
    types: [created]

jobs:
  orchestrate:
    if: contains(github.event.comment.body, '@orchestrator')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Agent Orchestration
        run: |
          cd agents
          npm install
          node agent-coordinator.js execute ${{ github.event.issue.number }} PLAN
```

### Quality Gate Customization

```typescript
// Custom quality gates in package.json scripts
{
  "scripts": {
    "quality:full": "npm run lint && npm run type-check && npm run test && npm run a11y && npm run security",
    "a11y": "axe-cli --tags wcag2aa --threshold 95",
    "security": "npm audit --audit-level high && gitleaks detect",
    "perf": "lighthouse-ci --budget-path .lighthouserc.js"
  }
}
```

## 🔍 Monitoring & Debugging

### Execution Logs

```bash
# View orchestration report
node agent-coordinator.js report

# Output:
{
  "issue": { "number": 1, "title": "Fix dashboard trends" },
  "executionLog": [
    { "phase": "PLAN", "status": "SUCCESS", "timestamp": "..." },
    { "phase": "APPLY", "status": "SUCCESS", "timestamp": "..." }
  ],
  "currentPhase": "TEST_COMPLETE",
  "duration": "245s",
  "status": "IN_PROGRESS"
}
```

### Agent Validation

```bash
# Validate all agent files
cd agents
npm run validate

# Output:
✅ 00-orchestrator.prompt.md: VALID
✅ 10-spec.prompt.md: VALID
✅ 20-tests.prompt.md: VALID
...
🎉 All agents valid!
```

## 🚨 Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid token" | Wrong execution order | Use tokens in sequence: PLAN→APPLY→TEST→PR→MERGE |
| "Tests failing" | Implementation incomplete | Fix failing tests before proceeding to TEST phase |
| "Security gate failed" | Vulnerabilities found | Run `npm audit fix` and update dependencies |
| "A11y score <95%" | Accessibility issues | Check axe violations and fix contrast/keyboard nav |

### Rollback Procedures

```bash
# Emergency rollback during any phase
git reset --hard HEAD~1           # Undo last commit
# OR
export FEATURE_FLAG_NAME=false    # Disable feature flag
# OR
git revert <commit-hash>          # Create revert commit
```

## 📈 Integration Examples

### With Existing Issue Backlog

The system seamlessly integrates with your existing `docs/issues/backlog.yaml`:

```yaml
# Your existing backlog format works unchanged
issues:
  - title: "Make status summary cards act as quick filters"
    body: |
      Problem: Summary cards on invoices page are static...
      Recommendation: Hook card clicks into useInvoiceFilters...
    labels: ["frontend", "ux"]
    priority: "P2"
```

### With Current CI/CD Pipeline

Agents respect your existing toolchain:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint",
    "type-check": "tsc --noEmit",
    "test": "playwright test"
  }
}
```

## 🎯 Success Metrics

### Quality Metrics Tracked

- **Test Coverage:** Maintain or improve existing coverage
- **Performance:** API <200ms, bundle <250KB, Core Web Vitals
- **Accessibility:** ≥95% axe score, keyboard navigation, contrast ≥4.5:1
- **Security:** 0 high CVEs, secrets clean, input validation
- **Code Quality:** 0 lint errors, strict TypeScript, conventional commits

### Development Velocity

- **Issue Resolution:** Average 30-45 minutes per P1 issue
- **Quality Gates:** 100% compliance before merge
- **Rollback Time:** <2 minutes via feature flags
- **Documentation:** Always up-to-date with automated generation

## 🤝 Contributing

### Adding New Agents

1. Create `NN-name.prompt.md` following existing patterns
2. Add to `agent-coordinator.js` agents list
3. Update validation rules in `scripts/validate-agents.js`
4. Test integration with orchestrator

### Extending Quality Gates

1. Add new check to appropriate agent (40-qa, 50-sec)
2. Update orchestrator execution flow
3. Add validation to CI/CD pipeline
4. Document new requirements in README

---

## 📚 Additional Resources

- [Agent Prompt Engineering Guide](./docs/agent-prompt-guide.md)
- [Quality Gate Configuration](./docs/quality-gates.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [API Documentation](./docs/api.md)

**Ready to transform your development workflow? Start with `@orchestrator #<your-issue-number>`** 🚀