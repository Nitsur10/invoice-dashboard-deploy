import { createInitialQualityGateStatuses, invoiceDashboardQualityGates } from './quality-gates'
import { featureWorkflowRegistry } from './workflow-registry'
import type {
  AcceptanceCriteria,
  AgentState,
  AgentType,
  InvoiceDashboardWorkflow,
  MasterPlanMilestone,
  MasterPlanPhase,
  ProjectBlocker,
  RiskMitigationPlan,
} from './types'

interface AgentDefinition {
  id: string
  name: string
  type?: AgentType
  dependencies?: string[]
  nextAgent?: string
  initialState?: AgentState
}

interface InvoiceWorkflowBlueprintMetadata extends Omit<InvoiceDashboardWorkflow, 'agents'> {
  summary: string
}

interface InvoiceWorkflowBlueprint {
  id: string
  title: string
  description: string
  phase: MasterPlanPhase
  estimatedHours: number
  tags: string[]
  agents: AgentDefinition[]
  metadata: InvoiceWorkflowBlueprintMetadata
}

function hoursFromNow(hours: number): Date {
  const now = new Date()
  return new Date(now.getTime() + hours * 60 * 60 * 1000)
}

const baselineBlockers: ProjectBlocker[] = [
  {
    id: 'BL-001',
    description: 'Middleware redirect loop prevents access to /auth/login',
    severity: 'Critical',
    status: 'Open',
    owner: 'Baseline Stabilization Agent',
  },
  {
    id: 'BL-002',
    description: 'Playwright login helper selectors outdated after auth refactor',
    severity: 'High',
    status: 'Open',
    owner: 'Testing Agent',
  },
]

const baselineMitigation: RiskMitigationPlan[] = [
  {
    risk: 'Regression in auth flow post middleware fix',
    mitigation: 'Add Playwright happy-path auth coverage and document rollback steps',
    owner: 'Testing Agent',
    status: 'Planned',
  },
  {
    risk: 'Environment drift between local and Vercel environments',
    mitigation: 'Document required env vars and validate Supabase credentials before deploy',
    owner: 'Documentation Agent',
    status: 'Planned',
  },
]

const baselineMilestone: MasterPlanMilestone = {
  id: 'MS-BL-001',
  name: 'Baseline Stability Gate cleared',
  phase: 'Baseline',
  targetDay: 2,
  status: 'In Progress',
}

const baselineAcceptance: AcceptanceCriteria[] = [
  'Auth flow functional in all browsers',
  'Playwright tests pass consistently',
  'Build pipeline succeeds',
  'Environment documented',
]

const kpiBlockers: ProjectBlocker[] = [
  {
    id: 'BL-101',
    description: 'Dashboard KPI accuracy unverified after Supabase migration',
    severity: 'High',
    status: 'Open',
    owner: 'Schema Architect Agent',
  },
  {
    id: 'BL-102',
    description: 'Responsive layout polish required for hero and KPI cards',
    severity: 'Medium',
    status: 'Open',
    owner: 'Design System Agent',
  },
]

const kpiMitigation: RiskMitigationPlan[] = [
  {
    risk: 'Slow initial load for KPI queries',
    mitigation: 'Introduce server actions with cached aggregates and Supabase real-time updates',
    owner: 'API Integration Agent',
    status: 'Planned',
  },
  {
    risk: 'Chart rendering regressions on mobile',
    mitigation: 'Define responsive breakpoints and add visual regression coverage',
    owner: 'Design System Agent',
    status: 'Planned',
  },
]

const kpiMilestone: MasterPlanMilestone = {
  id: 'MS-ENH-001',
  name: 'Dashboard KPI enhancement approved',
  phase: 'Enhancement',
  targetDay: 6,
  status: 'Pending',
}

const kpiAcceptance: AcceptanceCriteria[] = [
  'Pixel parity across breakpoints',
  'Lighthouse >90 on all pages',
  'Advanced filters working correctly',
  'CSV export handles large datasets',
]

const filtersBlockers: ProjectBlocker[] = [
  {
    id: 'BL-201',
    description: 'Invoice filters lack persisted state and advanced criteria support',
    severity: 'High',
    status: 'Open',
    owner: 'Component Architect Agent',
  },
  {
    id: 'BL-202',
    description: 'CSV exports lack progress feedback and memory safeguards',
    severity: 'High',
    status: 'Open',
    owner: 'Feature Builder Agent',
  },
]

const filtersMitigation: RiskMitigationPlan[] = [
  {
    risk: 'Large invoice exports timing out during streaming',
    mitigation: 'Implement chunked streaming with progress UI and cancellation support',
    owner: 'Feature Builder Agent',
    status: 'Planned',
  },
  {
    risk: 'Filter UX inconsistency across breakpoints',
    mitigation: 'Adopt shadcn/ui responsive primitives with keyboard support tests',
    owner: 'Design System Agent',
    status: 'Planned',
  },
]

const filtersMilestone: MasterPlanMilestone = {
  id: 'MS-ENH-002',
  name: 'Invoice filters & export ready for client sign-off',
  phase: 'Enhancement',
  targetDay: 7,
  status: 'Pending',
}

const filtersAcceptance: AcceptanceCriteria[] = [
  'Advanced filters covered by automated tests',
  'CSV export functionality verified with large datasets',
  'Filter persistence and URL state management',
  'Mobile-responsive filter interface',
  'Performance validation for 10k+ invoice exports',
]

const WORKFLOW_BLUEPRINTS: InvoiceWorkflowBlueprint[] = [
  {
    id: 'ID-001',
    title: 'Authentication & Testing Stabilization',
    description: 'Restore access to login routes, repair Playwright auth flow, and document environments.',
    phase: 'Baseline',
    estimatedHours: 6,
    tags: ['baseline', 'auth', 'testing'],
    agents: [
      {
        id: 'baseline-stabilization',
        name: '🔧 Baseline Stabilization Agent',
        type: 'testing',
        initialState: 'Active',
      },
      {
        id: 'schema-architect',
        name: '🗄️ Schema Architect Agent',
        type: 'schema-architect',
        dependencies: ['baseline-stabilization'],
      },
      {
        id: 'testing',
        name: '🧪 Testing Agent',
        type: 'testing',
        dependencies: ['baseline-stabilization', 'schema-architect'],
      },
      {
        id: 'documentation',
        name: '📚 Documentation Agent',
        type: 'documentation',
        dependencies: ['testing'],
      },
    ],
    metadata: {
      id: 'ID-001',
      masterPlanPhase: 'Baseline',
      clientPriority: 'Critical',
      timelineDay: 1,
      blockers: baselineBlockers,
      clientReviewStatus: 'Not Ready',
      milestoneAlignment: baselineMilestone,
      riskMitigation: baselineMitigation,
      acceptanceCriteria: baselineAcceptance,
      summary: 'Resolve auth middleware regression, stabilise Playwright flows, and capture environment documentation.',
    },
  },
  {
    id: 'ID-002',
    title: 'Dashboard KPI Enhancement',
    description: 'Enhance KPI accuracy, polish responsive layout, and enable real-time updates.',
    phase: 'Enhancement',
    estimatedHours: 12,
    tags: ['dashboard', 'kpi', 'real-time'],
    agents: [
      {
        id: 'design-system',
        name: '🎨 Design System Agent',
        type: 'design-system',
        initialState: 'Active',
      },
      {
        id: 'schema-architect',
        name: '🗄️ Schema Architect Agent',
        type: 'schema-architect',
        dependencies: ['design-system'],
      },
      {
        id: 'component-architect',
        name: '🏗️ Component Architect Agent',
        type: 'component-architect',
        dependencies: ['design-system', 'schema-architect'],
      },
      {
        id: 'feature-builder',
        name: '🚀 Feature Builder Agent',
        type: 'feature-builder',
        dependencies: ['component-architect'],
      },
      {
        id: 'api-integration',
        name: '🔌 API Integration Agent',
        type: 'api-integration',
        dependencies: ['feature-builder'],
      },
      {
        id: 'testing',
        name: '🧪 Testing Agent',
        type: 'testing',
        dependencies: ['feature-builder', 'api-integration'],
      },
      {
        id: 'accessibility',
        name: '♿ Accessibility Agent',
        type: 'accessibility',
        dependencies: ['testing'],
      },
      {
        id: 'performance',
        name: '⚡ Performance Agent',
        type: 'performance',
        dependencies: ['testing'],
      },
      {
        id: 'documentation',
        name: '📚 Documentation Agent',
        type: 'documentation',
        dependencies: ['performance', 'accessibility'],
      },
    ],
    metadata: {
      id: 'ID-002',
      masterPlanPhase: 'Enhancement',
      clientPriority: 'High',
      timelineDay: 4,
      blockers: kpiBlockers,
      clientReviewStatus: 'Not Ready',
      milestoneAlignment: kpiMilestone,
      riskMitigation: kpiMitigation,
      acceptanceCriteria: kpiAcceptance,
      summary: 'Deliver accurate, real-time dashboard KPIs with responsive polish and resilient data flows.',
    },
  },
  {
    id: 'ID-003',
    title: 'Invoice Filters & CSV Export',
    description: 'Ship advanced invoice filters, URL sync, and resilient CSV exports with progress feedback.',
    phase: 'Enhancement',
    estimatedHours: 14,
    tags: ['invoices', 'filters', 'export'],
    agents: [
      {
        id: 'design-system',
        name: '🎨 Design System Agent',
        type: 'design-system',
        initialState: 'Active',
      },
      {
        id: 'schema-architect',
        name: '🗄️ Schema Architect Agent',
        type: 'schema-architect',
        dependencies: ['design-system'],
      },
      {
        id: 'component-architect',
        name: '🏗️ Component Architect Agent',
        type: 'component-architect',
        dependencies: ['design-system', 'schema-architect'],
      },
      {
        id: 'feature-builder',
        name: '🚀 Feature Builder Agent',
        type: 'feature-builder',
        dependencies: ['component-architect'],
      },
      {
        id: 'api-integration',
        name: '🔌 API Integration Agent',
        type: 'api-integration',
        dependencies: ['feature-builder'],
      },
      {
        id: 'testing',
        name: '🧪 Testing Agent',
        type: 'testing',
        dependencies: ['api-integration'],
      },
      {
        id: 'accessibility',
        name: '♿ Accessibility Agent',
        type: 'accessibility',
        dependencies: ['testing'],
      },
      {
        id: 'performance',
        name: '⚡ Performance Agent',
        type: 'performance',
        dependencies: ['testing'],
      },
      {
        id: 'deployment',
        name: '🚀 Deployment Agent',
        type: 'deployment',
        dependencies: ['performance', 'accessibility'],
      },
      {
        id: 'documentation',
        name: '📚 Documentation Agent',
        type: 'documentation',
        dependencies: ['deployment'],
      },
    ],
    metadata: {
      id: 'ID-003',
      masterPlanPhase: 'Enhancement',
      clientPriority: 'High',
      timelineDay: 5,
      blockers: filtersBlockers,
      clientReviewStatus: 'Not Ready',
      milestoneAlignment: filtersMilestone,
      riskMitigation: filtersMitigation,
      acceptanceCriteria: filtersAcceptance,
      summary: 'Deliver advanced invoice filtering and CSV export with strong UX, performance, and observability.',
    },
  },
]

let initialized = false

export function ensureInvoiceDashboardWorkflows(): void {
  if (initialized) return

  for (const blueprint of WORKFLOW_BLUEPRINTS) {
    const existing = featureWorkflowRegistry.getWorkflow(blueprint.id)
    if (!existing) {
      const workflow = featureWorkflowRegistry.createWorkflow({
        id: blueprint.id,
        title: blueprint.title,
        description: blueprint.description,
        phase: blueprint.phase === 'Baseline' ? 'Foundation' : 'Development',
        estimatedCompletion: hoursFromNow(blueprint.estimatedHours),
        tags: blueprint.tags,
        agents: blueprint.agents,
        qualityGateStatuses: createInitialQualityGateStatuses(invoiceDashboardQualityGates),
        metadata: {
          invoiceDashboard: {
            ...blueprint.metadata,
            agents: [],
          },
        },
      })

      featureWorkflowRegistry.updateWorkflow(blueprint.id, {
        metadata: {
          invoiceDashboard: {
            ...blueprint.metadata,
            agents: workflow.agents,
          },
        },
      })
    } else {
      featureWorkflowRegistry.updateWorkflow(blueprint.id, {
        title: blueprint.title,
        description: blueprint.description,
        currentPhase: blueprint.phase === 'Baseline' ? 'Foundation' : 'Development',
        metadata: {
          invoiceDashboard: {
            ...blueprint.metadata,
            agents: existing.agents,
          },
        },
      })
    }
  }

  initialized = true
}

export function getInvoiceDashboardBlueprints(): InvoiceWorkflowBlueprint[] {
  return WORKFLOW_BLUEPRINTS
}

export function getInvoiceWorkflowMetadata(id: string): InvoiceWorkflowBlueprintMetadata | undefined {
  return WORKFLOW_BLUEPRINTS.find((blueprint) => blueprint.id === id)?.metadata
}
