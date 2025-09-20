import type { AgentHandoffRecord, FeatureWorkflow } from './types'

interface PersistedState {
  version: number
  workflows: FeatureWorkflow[]
  handoffs: Record<string, AgentHandoffRecord[]>
  updatedAt: string
}

const memoryState: PersistedState = {
  version: 1,
  workflows: [],
  handoffs: {},
  updatedAt: new Date().toISOString(),
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function touch(): void {
  memoryState.updatedAt = new Date().toISOString()
}

export function loadPersistedState(): PersistedState {
  return {
    version: memoryState.version,
    workflows: clone(memoryState.workflows),
    handoffs: clone(memoryState.handoffs),
    updatedAt: memoryState.updatedAt,
  }
}

export function persistWorkflows(workflows: FeatureWorkflow[]): void {
  memoryState.workflows = clone(workflows)
  touch()
}

export function persistHandoffs(handoffs: Record<string, AgentHandoffRecord[]>): void {
  memoryState.handoffs = clone(handoffs)
  touch()
}

export function persistState(state: PersistedState): void {
  memoryState.version = state.version
  memoryState.workflows = clone(state.workflows)
  memoryState.handoffs = clone(state.handoffs)
  touch()
}
