import {
  AgentType,
  ClientQualityGate,
  QualityGate,
  QualityGateEvaluationContext,
  QualityGateEvaluationResult,
  QualityGateStatus,
  QualityGateState,
} from './types'

export const invoiceDashboardQualityGates: QualityGate[] = [
  {
    name: 'Baseline Stability Gate',
    phase: 'Foundation',
    criteria: [
      'Auth flow functional in all browsers',
      'Playwright tests pass consistently',
      'Build pipeline succeeds',
      'Environment documented',
    ],
    threshold: 95,
    canBypass: false,
    validators: ['testing', 'deployment', 'documentation'],
  },
  {
    name: 'Feature Enhancement Gate',
    phase: 'Quality',
    criteria: [
      'Pixel parity across breakpoints',
      'Lighthouse >90 on all pages',
      'Advanced filters working correctly',
      'CSV export handles large datasets',
    ],
    threshold: 92,
    canBypass: false,
    validators: ['design-system', 'feature-builder', 'api-integration', 'testing', 'performance', 'accessibility'],
  },
  {
    name: 'Production Deployment Gate',
    phase: 'Deployment',
    criteria: [
      'Preview deployment stable',
      'All integration tests pass',
      'Client sign-off obtained',
      'Production monitoring configured',
    ],
    threshold: 95,
    canBypass: false,
    validators: ['deployment', 'observability', 'documentation'],
  },
]

export const qualityGates = invoiceDashboardQualityGates

export const invoiceDashboardClientQualityGates: ClientQualityGate[] = [
  {
    name: 'Baseline Stability Gate',
    masterPlanPhase: 'Baseline',
    clientReviewRequired: false,
    acceptanceCriteria: invoiceDashboardQualityGates[0].criteria,
    automatedValidation: [
      {
        id: 'baseline-playwright',
        description: 'Playwright auth suite runs without timeouts',
        command: 'npm run test',
        ownerAgent: 'testing',
      },
      {
        id: 'baseline-build',
        description: 'Production build completes successfully',
        command: 'npm run build',
        ownerAgent: 'deployment',
      },
      {
        id: 'baseline-lint',
        description: 'Linting passes with no errors',
        command: 'npm run lint',
        ownerAgent: 'documentation',
      },
    ],
    manualValidation: [
      {
        id: 'baseline-browser-check',
        description: 'Login flow verified manually in Chrome/Safari/Edge',
        owner: 'Testing Agent',
      },
      {
        id: 'baseline-docs',
        description: 'Environment variables documented for dev and Vercel',
        owner: 'Documentation Agent',
      },
    ],
  },
  {
    name: 'Feature Enhancement Gate',
    masterPlanPhase: 'Enhancement',
    clientReviewRequired: true,
    acceptanceCriteria: invoiceDashboardQualityGates[1].criteria,
    automatedValidation: [
      {
        id: 'enhancement-e2e',
        description: 'E2E suites for dashboard, invoices, kanban pass',
        command: 'npm run test',
        ownerAgent: 'testing',
      },
      {
        id: 'enhancement-lighthouse',
        description: 'Lighthouse CI score exceeds 90 for key pages',
        command: 'npm run validate:perf',
        ownerAgent: 'performance',
      },
      {
        id: 'enhancement-a11y',
        description: 'Accessibility validations succeed',
        ownerAgent: 'accessibility',
      },
    ],
    manualValidation: [
      {
        id: 'enhancement-pixel-review',
        description: 'Client UI review across breakpoints',
        owner: 'Design System Agent',
      },
      {
        id: 'enhancement-uat',
        description: 'UAT checklist completed with stakeholders',
        owner: 'Documentation Agent',
      },
    ],
  },
  {
    name: 'Production Deployment Gate',
    masterPlanPhase: 'Deployment',
    clientReviewRequired: true,
    acceptanceCriteria: invoiceDashboardQualityGates[2].criteria,
    automatedValidation: [
      {
        id: 'deployment-smoke',
        description: 'Preview deployment smoke tests pass',
        ownerAgent: 'deployment',
      },
      {
        id: 'deployment-monitoring',
        description: 'Monitoring and alerting configured',
        ownerAgent: 'observability',
      },
    ],
    manualValidation: [
      {
        id: 'deployment-client-approval',
        description: 'Client final approval received',
        owner: 'Deployment Agent',
      },
      {
        id: 'deployment-rollback',
        description: 'Rollback procedure rehearsed',
        owner: 'Deployment Agent',
      },
    ],
  },
]

export function createInitialQualityGateStatuses(
  gates: QualityGate[] = invoiceDashboardQualityGates
): QualityGateStatus[] {
  return gates.map((gate) => ({
    gate,
    state: 'Pending',
    score: 0,
  }))
}

function calculateScore(criteriaResults: Record<string, number>): number {
  const entries = Object.values(criteriaResults ?? {})
  if (!entries.length) return 0

  const bounded = entries.map((value) => Math.min(100, Math.max(0, value)))
  const sum = bounded.reduce((total, value) => total + value, 0)

  return Math.round(sum / bounded.length)
}

export function evaluateQualityGate(
  context: QualityGateEvaluationContext
): QualityGateEvaluationResult {
  const { gate, criteriaResults, allowBypass, requestedBy } = context
  const score = calculateScore(criteriaResults)
  const evaluatedAt = new Date()

  let state: QualityGateState = 'Failed'
  let bypassedBy: AgentType | undefined

  if (score >= gate.threshold) {
    state = 'Passed'
  } else if (allowBypass && gate.canBypass && requestedBy) {
    state = 'Bypassed'
    bypassedBy = requestedBy
  }

  return {
    state,
    score,
    evaluatedAt,
    criteriaResults,
    bypassedBy,
    notes:
      state === 'Failed'
        ? `Threshold ${gate.threshold} not met`
        : state === 'Bypassed'
          ? 'Gate bypassed with emergency approval'
          : undefined,
  }
}

export function computeOverallQualityScore(statuses: QualityGateStatus[]): number {
  if (!statuses.length) return 0

  const activeScores = statuses.map((status) => status.score)
  const total = activeScores.reduce((sum, score) => sum + score, 0)
  const average = total / statuses.length

  return Math.round(average)
}
