import fs from 'fs'
import path from 'path'
import type { AgentHandoffRecord, FeatureWorkflow } from './types'

interface OrchestratorPersistedState {
  version: number
  workflows: FeatureWorkflow[]
  handoffs: Record<string, AgentHandoffRecord[]>
  updatedAt: string
}

const STATE_FILE = path.join(process.cwd(), 'data', 'orchestrator-state.json')
const DATE_KEYS = new Set([
  'startTime',
  'estimatedCompletion',
  'timestamp',
  'evaluatedAt',
  'createdAt',
  'completedAt',
  'startedAt',
  'updatedAt',
])

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function reviveDates<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value),
    (key, val) => {
      if (typeof val === 'string' && DATE_KEYS.has(key) && !Number.isNaN(Date.parse(val))) {
        return new Date(val)
      }
      return val
    }
  )
}

function serializeState(state: OrchestratorPersistedState): string {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString()
    }
    return value
  }, 2)
}

let cachedState: OrchestratorPersistedState | null = null

function readStateFromDisk(): OrchestratorPersistedState {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      version: 1,
      workflows: [],
      handoffs: {},
      updatedAt: new Date().toISOString(),
    }
  }

  const raw = fs.readFileSync(STATE_FILE, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    return reviveDates<OrchestratorPersistedState>({
      version: parsed.version ?? 1,
      workflows: parsed.workflows ?? [],
      handoffs: parsed.handoffs ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[orchestrator:persistence] Failed to parse persisted state, resetting.', error)
    return {
      version: 1,
      workflows: [],
      handoffs: {},
      updatedAt: new Date().toISOString(),
    }
  }
}

function writeState(state: OrchestratorPersistedState) {
  ensureDirExists(STATE_FILE)
  const payload = serializeState(state)
  fs.writeFileSync(STATE_FILE, payload, 'utf8')
  cachedState = reviveDates(state)
}

function snapshotState(): OrchestratorPersistedState {
  if (!cachedState) {
    cachedState = readStateFromDisk()
  }
  return reviveDates(cachedState)
}

export function loadOrchestratorState(): OrchestratorPersistedState {
  return snapshotState()
}

export function saveOrchestratorState(state: OrchestratorPersistedState): void {
  writeState({
    ...state,
    updatedAt: new Date().toISOString(),
  })
}

export function saveWorkflows(workflows: FeatureWorkflow[]): void {
  const state = snapshotState()
  state.workflows = reviveDates(workflows)
  state.updatedAt = new Date().toISOString()
  writeState(state)
}

export function saveHandoffs(handoffs: Record<string, AgentHandoffRecord[]>): void {
  const state = snapshotState()
  state.handoffs = reviveDates(handoffs)
  state.updatedAt = new Date().toISOString()
  writeState(state)
}
