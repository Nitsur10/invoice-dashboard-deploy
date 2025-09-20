import { orchestratorEventBus } from './event-bus'
import { featureWorkflowRegistry } from './workflow-registry'
import { createRandomId } from './utils'
import { loadPersistedState, persistHandoffs } from '@/lib/orchestrator/persistence'
import { AgentHandoffRecord, AgentStatus, HandoffPayload } from './types'

export interface CreateHandoffInput {
  featureId: string
  fromAgent: string
  toAgent: string
  payload?: HandoffPayload
  autoActivate?: boolean
}

export interface CompleteHandoffInput {
  featureId: string
  handoffId: string
  payload?: HandoffPayload
  autoActivate?: boolean
}

export interface FailHandoffInput {
  featureId: string
  handoffId: string
  reason: string
}

function getAgent(workflowAgents: AgentStatus[], agentId: string): AgentStatus | undefined {
  return workflowAgents.find((agent) => agent.id === agentId)
}

function isDependencySatisfied(agent: AgentStatus, dependencyId: string, agents: AgentStatus[]): boolean {
  const dependencyAgent = getAgent(agents, dependencyId)
  if (!dependencyAgent) return false
  return dependencyAgent.status === 'Complete'
}

function validateHandoff(
  fromAgent: AgentStatus | undefined,
  toAgent: AgentStatus | undefined,
  agents: AgentStatus[]
): string[] {
  const errors: string[] = []

  if (!fromAgent) {
    errors.push('Source agent missing in workflow')
  }

  if (!toAgent) {
    errors.push('Target agent missing in workflow')
  }

  if (fromAgent && fromAgent.status !== 'Complete') {
    errors.push(`Source agent ${fromAgent.id} is not complete`)
  }

  if (toAgent) {
    for (const dependency of toAgent.dependencies) {
      if (!isDependencySatisfied(toAgent, dependency, agents)) {
        errors.push(`Dependency ${dependency} for agent ${toAgent.id} is not satisfied`)
      }
    }
  }

  return errors
}

class AgentHandoffManager {
  private handoffs = new Map<string, AgentHandoffRecord[]>()

  constructor(initialHandoffs?: Record<string, AgentHandoffRecord[]>) {
    if (initialHandoffs) {
      for (const [featureId, records] of Object.entries(initialHandoffs)) {
        this.handoffs.set(featureId, records.map((record) => ({ ...record })))
      }
    }
  }

  private snapshot(): Record<string, AgentHandoffRecord[]> {
    return Object.fromEntries(
      Array.from(this.handoffs.entries()).map(([featureId, records]) => [
        featureId,
        records.map((record) => ({ ...record })),
      ])
    )
  }

  private persist(): void {
    persistHandoffs(this.snapshot())
  }

  create(input: CreateHandoffInput): AgentHandoffRecord {
    const { featureId, fromAgent, toAgent, payload, autoActivate } = input
    const workflow = featureWorkflowRegistry.getWorkflow(featureId)

    if (!workflow) {
      throw new Error(`Workflow ${featureId} not found`)
    }

    const from = getAgent(workflow.agents, fromAgent)
    const to = getAgent(workflow.agents, toAgent)
    const validationErrors = validateHandoff(from, to, workflow.agents)

    const record: AgentHandoffRecord = {
      id: createRandomId('handoff'),
      fromAgent,
      toAgent,
      status: validationErrors.length ? 'failed' : 'pending',
      createdAt: new Date(),
      completedAt: validationErrors.length ? new Date() : undefined,
      payload,
      validationErrors: validationErrors.length ? validationErrors : undefined,
    }

    const records = this.handoffs.get(featureId) ?? []
    records.push(record)
    this.handoffs.set(featureId, records)

    orchestratorEventBus.emit({
      type: validationErrors.length ? 'handoff.failed' : 'handoff.pending',
      timestamp: new Date(),
      payload: {
        featureId,
        handoffId: record.id,
        fromAgent,
        toAgent,
        validationErrors,
      },
    })

    if (validationErrors.length) {
      featureWorkflowRegistry.updateAgentStatus(featureId, toAgent, {
        status: 'Waiting',
        error: validationErrors.join('; '),
      })
    } else if (!validationErrors.length && autoActivate) {
      featureWorkflowRegistry.updateAgentStatus(featureId, toAgent, {
        status: 'Active',
        progress: 0,
      })
    } else if (!validationErrors.length) {
      featureWorkflowRegistry.updateAgentStatus(featureId, toAgent, {
        status: 'Queued',
      })
    }

    this.persist()

    return record
  }

  complete(input: CompleteHandoffInput): AgentHandoffRecord {
    const { featureId, handoffId, payload, autoActivate } = input
    const workflow = featureWorkflowRegistry.getWorkflow(featureId)

    if (!workflow) {
      throw new Error(`Workflow ${featureId} not found`)
    }

    const records = this.handoffs.get(featureId)
    if (!records) {
      throw new Error(`No handoffs tracked for workflow ${featureId}`)
    }

    const record = records.find((candidate) => candidate.id === handoffId)
    if (!record) {
      throw new Error(`Handoff ${handoffId} not found for workflow ${featureId}`)
    }

    record.status = 'complete'
    record.completedAt = new Date()
    record.payload = payload ?? record.payload

    orchestratorEventBus.emit({
      type: 'handoff.completed',
      timestamp: record.completedAt,
      payload: {
        featureId,
        handoffId,
        toAgent: record.toAgent,
      },
    })

    if (autoActivate ?? true) {
      featureWorkflowRegistry.updateAgentStatus(featureId, record.toAgent, {
        status: 'Active',
        progress: 0,
      })
    }

    this.persist()

    return record
  }

  fail(input: FailHandoffInput): AgentHandoffRecord {
    const { featureId, handoffId, reason } = input
    const records = this.handoffs.get(featureId)
    if (!records) {
      throw new Error(`No handoffs tracked for workflow ${featureId}`)
    }

    const record = records.find((candidate) => candidate.id === handoffId)
    if (!record) {
      throw new Error(`Handoff ${handoffId} not found for workflow ${featureId}`)
    }

    record.status = 'failed'
    record.completedAt = new Date()
    record.validationErrors = [...(record.validationErrors ?? []), reason]

    orchestratorEventBus.emit({
      type: 'handoff.failed',
      timestamp: record.completedAt,
      payload: {
        featureId,
        handoffId,
        reason,
      },
    })

    featureWorkflowRegistry.updateAgentStatus(featureId, record.toAgent, {
      status: 'Waiting',
      error: reason,
    })

    this.persist()

    return record
  }

  list(featureId: string): AgentHandoffRecord[] {
    return [...(this.handoffs.get(featureId) ?? [])]
  }

  listActive(featureId: string): AgentHandoffRecord[] {
    return this.list(featureId).filter((record) => record.status === 'pending')
  }
}

const { handoffs: persistedHandoffs } = loadPersistedState()

export const agentHandoffManager = new AgentHandoffManager(persistedHandoffs)
