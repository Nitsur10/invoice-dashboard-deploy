export type WorkflowStatus = 'Planning' | 'In Progress' | 'Quality Review' | 'Complete'

export type WorkflowPhase = 'Foundation' | 'Development' | 'Quality' | 'Deployment'

export type AgentState = 'Queued' | 'Active' | 'Complete' | 'Error' | 'Waiting'

export type QualityGateState = 'Pending' | 'Passed' | 'Failed' | 'Bypassed'

export type AgentType =
  | 'design-system'
  | 'schema-architect'
  | 'component-architect'
  | 'feature-builder'
  | 'api-integration'
  | 'testing'
  | 'accessibility'
  | 'performance'
  | 'security'
  | 'deployment'
  | 'observability'
  | 'documentation'

export interface AgentStatus {
  id: string
  name: string
  status: AgentState
  progress: number
  duration: number
  outputs: string[]
  dependencies: string[]
  nextAgent?: string
  startedAt?: Date
  completedAt?: Date
  error?: string
}

export type QualityCriteria = string

export interface QualityGate {
  name: string
  phase: WorkflowPhase
  criteria: QualityCriteria[]
  threshold: number
  canBypass: boolean
  validators: AgentType[]
}

export interface QualityGateStatus {
  gate: QualityGate
  state: QualityGateState
  score: number
  evaluatedAt?: Date
  notes?: string
  criteriaResults?: Record<QualityCriteria, number>
  bypassedBy?: AgentType
}

export interface QualityGateEvaluationResult {
  state: QualityGateState
  score: number
  notes?: string
  criteriaResults?: Record<QualityCriteria, number>
  evaluatedAt: Date
  bypassedBy?: AgentType
}

export interface QualityGateEvaluationContext {
  gate: QualityGate
  criteriaResults: Record<QualityCriteria, number>
  allowBypass?: boolean
  requestedBy?: AgentType
}

export interface FeatureWorkflow {
  id: string
  title: string
  description: string
  status: WorkflowStatus
  currentPhase: WorkflowPhase
  agents: AgentStatus[]
  activeAgent?: string
  startTime: Date
  estimatedCompletion: Date
  qualityGates: QualityGateStatus[]
  overallQualityScore: number
  tags?: string[]
  metadata?: Record<string, unknown>
  history?: WorkflowEvent[]
}

export interface WorkflowEvent {
  id: string
  type: OrchestratorEventType
  timestamp: Date
  payload: Record<string, unknown>
}

export type OrchestratorEventType =
  | 'feature.created'
  | 'feature.updated'
  | 'agent.status.updated'
  | 'quality-gate.evaluated'
  | 'handoff.completed'
  | 'handoff.failed'
  | 'handoff.pending'
  | 'quality.score.updated'

export interface OrchestratorEvent<TType extends OrchestratorEventType = OrchestratorEventType> {
  type: TType
  timestamp: Date
  payload: Record<string, unknown>
}

export interface DesignTokenSet {
  name: string
  tokens: Record<string, string>
}

export interface ThemeConfig {
  defaultMode: 'light' | 'dark' | 'system'
  supportsContrastModes?: boolean
  customProperties?: Record<string, string>
}

export interface ComponentPattern {
  name: string
  description: string
  tokensUsed: string[]
  accessibilityNotes?: string
}

export interface BrandGuideline {
  rule: string
  description: string
  severity?: 'critical' | 'warning' | 'info'
}

export interface PostgreSQLSchema {
  tables: string[]
  relationships: Record<string, string[]>
  indexes: Record<string, string[]>
}

export interface RLSPolicy {
  table: string
  policy: string
  rule: string
}

export interface RealtimeConfig {
  channels: string[]
  filters: Record<string, string>
}

export interface TypeScriptTypes {
  entities: Record<string, string>
}

export interface MigrationScript {
  id: string
  up: string
  down?: string
}

export interface ComponentBlueprint {
  name: string
  description: string
  files: string[]
  dependencies: string[]
}

export interface ArchitecturalPattern {
  name: string
  description: string
  appliesTo: string[]
}

export interface ZodSchema {
  name: string
  definition: string
}

export interface TestTemplate {
  name: string
  description: string
  path: string
}

export interface ServerAction {
  name: string
  implementation: string
}

export interface ClientComponent {
  name: string
  path: string
  description?: string
}

export interface StreamingConfig {
  boundaries: string[]
  description?: string
}

export interface OptimisticPattern {
  name: string
  description: string
}

export interface ErrorBoundary {
  name: string
  description: string
  fallbackComponent: string
}

export interface DesignHandoff {
  designTokens: DesignTokenSet
  themeConfiguration: ThemeConfig
  componentPatterns: ComponentPattern[]
  brandGuidelines: BrandGuideline[]
}

export interface SchemaHandoff {
  databaseSchema: PostgreSQLSchema
  rlsPolicies: RLSPolicy[]
  realtimeConfig: RealtimeConfig
  typeDefinitions: TypeScriptTypes
  migrationScripts: MigrationScript[]
}

export interface ComponentHandoff {
  componentBlueprints: ComponentBlueprint[]
  designPatterns: ArchitecturalPattern[]
  validationSchemas: ZodSchema[]
  testingTemplates: TestTemplate[]
}

export interface FeatureHandoff {
  serverActions: ServerAction[]
  clientComponents: ClientComponent[]
  streamingConfig: StreamingConfig
  optimisticUpdates: OptimisticPattern[]
  errorBoundaries: ErrorBoundary[]
}

export type HandoffPayload = DesignHandoff | SchemaHandoff | ComponentHandoff | FeatureHandoff

export interface AgentHandoffRecord {
  id: string
  fromAgent: string
  toAgent: string
  status: 'pending' | 'complete' | 'failed'
  createdAt: Date
  completedAt?: Date
  payload?: HandoffPayload
  validationErrors?: string[]
}

export interface AgentDependencyGraph {
  agentId: string
  dependsOn: string[]
  handoffTargets?: string[]
}

export type MasterPlanPhase = 'Baseline' | 'Enhancement' | 'Deployment' | 'Sign-off'

export type ClientReviewStatus = 'Not Ready' | 'Ready for Review' | 'In Review' | 'Approved'

export interface ProjectBlocker {
  id: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Resolved'
  owner?: string
  notes?: string
}

export interface MasterPlanMilestone {
  id: string
  name: string
  phase: MasterPlanPhase
  targetDay: number
  status: 'Pending' | 'In Progress' | 'Complete'
  notes?: string
}

export interface RiskMitigationPlan {
  risk: string
  mitigation: string
  owner: string
  status: 'Planned' | 'Active' | 'Completed'
  notes?: string
}

export type AcceptanceCriteria = string

export interface InvoiceDashboardWorkflow {
  id: string
  masterPlanPhase: MasterPlanPhase
  clientPriority: 'Critical' | 'High' | 'Medium' | 'Low'
  timelineDay: number
  agents: AgentStatus[]
  blockers: ProjectBlocker[]
  clientReviewStatus: ClientReviewStatus
  milestoneAlignment: MasterPlanMilestone
  riskMitigation: RiskMitigationPlan[]
  acceptanceCriteria: AcceptanceCriteria[]
}

export interface AutomatedCheck {
  id: string
  description: string
  command?: string
  ownerAgent?: AgentType
}

export interface ManualCheck {
  id: string
  description: string
  owner?: string
  notes?: string
}

export interface ClientQualityGate {
  name: string
  masterPlanPhase: MasterPlanPhase
  clientReviewRequired: boolean
  acceptanceCriteria: AcceptanceCriteria[]
  automatedValidation: AutomatedCheck[]
  manualValidation: ManualCheck[]
}
