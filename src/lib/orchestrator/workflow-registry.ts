import { orchestratorEventBus } from './event-bus'
import { computeOverallQualityScore, createInitialQualityGateStatuses } from './quality-gates'
import { loadPersistedState, persistWorkflows } from '@/lib/orchestrator/persistence'
import { createRandomId } from './utils'
import {
  AgentState,
  AgentStatus,
  AgentType,
  FeatureWorkflow,
  OrchestratorEventType,
  QualityGateStatus,
  WorkflowPhase,
  WorkflowStatus,
} from './types'

interface FeatureWorkflowCreateInput {
  title: string
  description: string
  estimatedCompletion?: Date
  phase?: WorkflowPhase
  tags?: string[]
  agents?: AgentRegistration[]
  qualityGateStatuses?: QualityGateStatus[]
  id?: string
  startTime?: Date
  metadata?: Record<string, unknown>
}

interface AgentRegistration {
  id: string
  name: string
  dependencies?: string[]
  nextAgent?: string
  initialState?: AgentState
  type?: AgentType
}

interface FeatureWorkflowUpdateInput {
  title?: string
  description?: string
  status?: WorkflowStatus
  currentPhase?: WorkflowPhase
  estimatedCompletion?: Date
  activeAgent?: string | null
  tags?: string[]
  overallQualityScore?: number
  metadata?: Record<string, unknown> | null
}

interface AgentStatusUpdateInput {
  status?: AgentState
  progress?: number
  duration?: number
  outputs?: string[]
  nextAgent?: string
  error?: string | null
}

const phaseAgentMap: Record<WorkflowPhase, AgentType[]> = {
  Foundation: ['design-system', 'schema-architect'],
  Development: ['component-architect', 'feature-builder', 'api-integration'],
  Quality: ['testing', 'accessibility', 'performance', 'security'],
  Deployment: ['deployment', 'documentation'],
}

const phaseOrder: WorkflowPhase[] = ['Foundation', 'Development', 'Quality', 'Deployment']

function padSequence(value: number): string {
  return value.toString().padStart(3, '0')
}

function deriveWorkflowPhase(workflow: FeatureWorkflow): WorkflowPhase {
  for (const phase of phaseOrder) {
    const agentsForPhase = phaseAgentMap[phase] ?? []
    const pendingAgent = workflow.agents.find((agent) =>
      agentsForPhase.includes(agent.id as AgentType) && agent.status !== 'Complete'
    )

    if (pendingAgent) {
      return phase
    }
  }

  return 'Deployment'
}

function deriveWorkflowStatus(workflow: FeatureWorkflow): WorkflowStatus {
  const phase = deriveWorkflowPhase(workflow)
  const hasActiveAgent = workflow.agents.some((agent) => agent.status === 'Active')

  if (phase === 'Deployment' && workflow.agents.every((agent) => agent.status === 'Complete')) {
    return 'Complete'
  }

  if (phase === 'Quality') {
    return 'Quality Review'
  }

  if (hasActiveAgent || workflow.agents.some((agent) => agent.status === 'Queued')) {
    return 'In Progress'
  }

  return workflow.status
}

function emitHistoryEvent(
  workflow: FeatureWorkflow,
  type: OrchestratorEventType,
  payload: Record<string, unknown>
) {
  if (!workflow.history) {
    workflow.history = []
  }

  workflow.history.push({
    id: createRandomId('history'),
    type,
    timestamp: new Date(),
    payload,
  })
}

export class FeatureWorkflowRegistry {
  private workflows = new Map<string, FeatureWorkflow>()
  private sequence = 1

  constructor(initialWorkflows?: FeatureWorkflow[]) {
    if (initialWorkflows?.length) {
      initialWorkflows.forEach((workflow) => {
        this.workflows.set(workflow.id, workflow)
      })
      const highestSequence = Math.max(
        ...initialWorkflows
          .map((workflow) => Number(workflow.id.split('-')[1]))
          .filter((value) => !Number.isNaN(value)),
        0
      )

      this.sequence = highestSequence + 1
    }
  }

  private persist(): void {
    persistWorkflows(this.getWorkflows())
  }

  getWorkflows(): FeatureWorkflow[] {
    return Array.from(this.workflows.values())
  }

  getWorkflow(id: string): FeatureWorkflow | undefined {
    return this.workflows.get(id)
  }

  createWorkflow(input: FeatureWorkflowCreateInput): FeatureWorkflow {
    const now = new Date()
    const id = input.id ?? `FT-${padSequence(this.sequence++)}`

    const agents = (input.agents ?? []).map<AgentStatus>((agent) => ({
      id: agent.id,
      name: agent.name,
      status: agent.initialState ?? 'Queued',
      progress: 0,
      duration: 0,
      outputs: [],
      dependencies: agent.dependencies ?? [],
      nextAgent: agent.nextAgent,
      startedAt: undefined,
      completedAt: undefined,
    }))

    const qualityGates = input.qualityGateStatuses ?? createInitialQualityGateStatuses()

    const workflow: FeatureWorkflow = {
      id,
      title: input.title,
      description: input.description,
      status: 'Planning',
      currentPhase: input.phase ?? 'Foundation',
      agents,
      activeAgent: agents.find((agent) => agent.status === 'Active')?.id,
      startTime: input.startTime ?? now,
      estimatedCompletion: input.estimatedCompletion ?? new Date(now.getTime() + 30 * 60 * 1000),
      qualityGates,
      overallQualityScore: computeOverallQualityScore(qualityGates),
      tags: input.tags ?? [],
      metadata: input.metadata,
      history: [],
    }

    emitHistoryEvent(workflow, 'feature.created', { id })
    this.workflows.set(workflow.id, workflow)

    orchestratorEventBus.emit({
      type: 'feature.created',
      timestamp: now,
      payload: { workflow },
    })

    this.persist()

    return workflow
  }

  updateWorkflow(id: string, updates: FeatureWorkflowUpdateInput): FeatureWorkflow | undefined {
    const workflow = this.workflows.get(id)
    if (!workflow) return undefined

    const previous = { ...workflow }

    if (typeof updates.title === 'string') workflow.title = updates.title
    if (typeof updates.description === 'string') workflow.description = updates.description
    if (typeof updates.status === 'string') workflow.status = updates.status
    if (typeof updates.currentPhase === 'string') workflow.currentPhase = updates.currentPhase
    if (updates.estimatedCompletion instanceof Date) {
      workflow.estimatedCompletion = updates.estimatedCompletion
    }
    if (Array.isArray(updates.tags)) workflow.tags = updates.tags
    if (typeof updates.overallQualityScore === 'number') {
      workflow.overallQualityScore = updates.overallQualityScore
    }

    if (typeof updates.metadata === 'object') {
      workflow.metadata = updates.metadata ?? undefined
    }

    if (typeof updates.activeAgent === 'string') {
      workflow.activeAgent = updates.activeAgent
    } else if (updates.activeAgent === null) {
      workflow.activeAgent = undefined
    }

    workflow.currentPhase = deriveWorkflowPhase(workflow)
    workflow.status = deriveWorkflowStatus(workflow)

    emitHistoryEvent(workflow, 'feature.updated', { previous, updates })

    orchestratorEventBus.emit({
      type: 'feature.updated',
      timestamp: new Date(),
      payload: { workflowId: id, updates },
    })

    this.persist()

    return workflow
  }

  updateAgentStatus(
    featureId: string,
    agentId: string,
    updates: AgentStatusUpdateInput
  ): AgentStatus | undefined {
    const workflow = this.workflows.get(featureId)
    if (!workflow) return undefined

    const agentIndex = workflow.agents.findIndex((agent) => agent.id === agentId)
    if (agentIndex === -1) return undefined

    const agent = { ...workflow.agents[agentIndex] }
    const now = new Date()
    const previousStatus = agent.status

    if (typeof updates.status === 'string') {
      agent.status = updates.status

      if (updates.status === 'Active' && !agent.startedAt) {
        agent.startedAt = now
      }

      if (updates.status === 'Complete') {
        agent.completedAt = agent.completedAt ?? now
        if (agent.startedAt) {
          agent.duration = agent.completedAt.getTime() - agent.startedAt.getTime()
        }
      }

      if (updates.status !== 'Active' && workflow.activeAgent === agent.id) {
        workflow.activeAgent = undefined
      } else if (updates.status === 'Active') {
        workflow.activeAgent = agent.id
      }
    }

    if (typeof updates.progress === 'number') {
      agent.progress = Math.min(100, Math.max(0, updates.progress))
    }

    if (typeof updates.duration === 'number') {
      agent.duration = Math.max(0, updates.duration)
    }

    if (Array.isArray(updates.outputs)) {
      agent.outputs = updates.outputs
    }

    if (typeof updates.nextAgent === 'string' || updates.nextAgent === null) {
      agent.nextAgent = updates.nextAgent ?? undefined
    }

    if (typeof updates.error === 'string') {
      agent.error = updates.error
    } else if (updates.error === null) {
      delete agent.error
    }

    workflow.agents[agentIndex] = agent

    workflow.currentPhase = deriveWorkflowPhase(workflow)
    workflow.status = deriveWorkflowStatus(workflow)

    emitHistoryEvent(workflow, 'agent.status.updated', {
      agentId,
      previousStatus,
      nextStatus: agent.status,
      progress: agent.progress,
    })

    orchestratorEventBus.emit({
      type: 'agent.status.updated',
      timestamp: now,
      payload: {
        featureId,
        agentId,
        status: agent.status,
        progress: agent.progress,
        duration: agent.duration,
      },
    })

    this.persist()

    return agent
  }

  attachQualityGates(
    featureId: string,
    gates: QualityGateStatus[]
  ): FeatureWorkflow | undefined {
    const workflow = this.workflows.get(featureId)
    if (!workflow) return undefined

    workflow.qualityGates = gates

    orchestratorEventBus.emit({
      type: 'quality.score.updated',
      timestamp: new Date(),
      payload: {
        featureId,
        qualityGates: gates,
      },
    })

    this.persist()

    return workflow
  }

  updateQualityGateStatus(
    featureId: string,
    gateName: string,
    status: QualityGateStatus
  ): QualityGateStatus | undefined {
    const workflow = this.workflows.get(featureId)
    if (!workflow) return undefined

    const gateIndex = workflow.qualityGates.findIndex(
      (existing) => existing.gate.name === gateName
    )

    if (gateIndex === -1) {
      workflow.qualityGates.push(status)
    } else {
      workflow.qualityGates[gateIndex] = status
    }

    emitHistoryEvent(workflow, 'quality-gate.evaluated', {
      gateName,
      state: status.state,
      score: status.score,
    })

    orchestratorEventBus.emit({
      type: 'quality-gate.evaluated',
      timestamp: new Date(),
      payload: {
        featureId,
        gateName,
        status,
      },
    })

    this.persist()

    return status
  }

  updateQualityScore(featureId: string, score: number): FeatureWorkflow | undefined {
    const workflow = this.workflows.get(featureId)
    if (!workflow) return undefined

    workflow.overallQualityScore = score

    orchestratorEventBus.emit({
      type: 'quality.score.updated',
      timestamp: new Date(),
      payload: {
        featureId,
        score,
      },
    })

    this.persist()

    return workflow
  }
}

const { workflows: persistedWorkflows } = loadPersistedState()

export const featureWorkflowRegistry = new FeatureWorkflowRegistry(persistedWorkflows)
