import type { AgentHandoffRecord, FeatureWorkflow } from './types'

interface PersistedState {
  version: number
  workflows: FeatureWorkflow[]
  handoffs: Record<string, AgentHandoffRecord[]>
  updatedAt: string
}

const DATE_KEYS = new Set<keyof AgentHandoffRecord | keyof FeatureWorkflow | 'updatedAt' | 'startTime' | 'estimatedCompletion' | 'timestamp' | 'evaluatedAt' | 'createdAt' | 'completedAt' | 'startedAt'>([
  'startTime',
  'estimatedCompletion',
  'timestamp',
  'evaluatedAt',
  'createdAt',
  'completedAt',
  'startedAt',
  'updatedAt',
])

function createEmptyState(): PersistedState {
  return {
    version: 1,
    workflows: [],
    handoffs: {},
    updatedAt: new Date().toISOString(),
  }
}

interface ServerModules {
  fs: typeof import('fs')
  path: typeof import('path')
}

let serverModules: ServerModules | null = null
let moduleLoadErrorLogged = false
let readErrorLogged = false
let cachedState: PersistedState | null = null

function isServerEnvironment(): boolean {
  return typeof window === 'undefined'
}

function ensureServerModules(): ServerModules | null {
  if (!isServerEnvironment()) {
    return null
  }

  if (!serverModules) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      serverModules = {
        fs: require('fs') as typeof import('fs'),
        path: require('path') as typeof import('path'),
      }
    } catch (error) {
      if (!moduleLoadErrorLogged) {
        console.warn('[orchestrator:persistence] Node persistence unavailable', error)
        moduleLoadErrorLogged = true
      }
      serverModules = null
      return null
    }
  }

  return serverModules
}

function reviveDates<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value),
    (key, val) => {
      if (typeof val === 'string' && DATE_KEYS.has(key as never) && !Number.isNaN(Date.parse(val))) {
        return new Date(val)
      }
      return val
    }
  )
}

function cloneState(state: PersistedState): PersistedState {
  return reviveDates(state)
}

function getStateFile(modules: ServerModules): string {
  return modules.path.join(process.cwd(), 'data', 'orchestrator-state.json')
}

function ensureDirExists(modules: ServerModules, filePath: string) {
  const dir = modules.path.dirname(filePath)
  if (!modules.fs.existsSync(dir)) {
    modules.fs.mkdirSync(dir, { recursive: true })
  }
}

function readStateFromDisk(): PersistedState {
  const modules = ensureServerModules()
  if (!modules) {
    return createEmptyState()
  }

  const stateFile = getStateFile(modules)
  if (!modules.fs.existsSync(stateFile)) {
    return createEmptyState()
  }

  try {
    const raw = modules.fs.readFileSync(stateFile, 'utf8')
    const parsed = JSON.parse(raw)
    return reviveDates<PersistedState>({
      version: parsed.version ?? 1,
      workflows: parsed.workflows ?? [],
      handoffs: parsed.handoffs ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    })
  } catch (error) {
    if (!readErrorLogged) {
      console.warn('[orchestrator:persistence] Failed to parse persisted state, resetting.', error)
      readErrorLogged = true
    }
    return createEmptyState()
  }
}

function writeStateInternal(state: PersistedState): void {
  const modules = ensureServerModules()
  if (!modules) {
    return
  }

  const stateFile = getStateFile(modules)
  try {
    ensureDirExists(modules, stateFile)
    const payload = JSON.stringify(
      state,
      (key, value) => (value instanceof Date ? value.toISOString() : value),
      2
    )
    modules.fs.writeFileSync(stateFile, payload, 'utf8')
    cachedState = cloneState(state)
  } catch (error) {
    console.error('[orchestrator:persistence] Failed to persist state', error)
  }
}

function snapshotState(): PersistedState {
  if (!cachedState) {
    cachedState = readStateFromDisk()
  }

  return cloneState(cachedState)
}

function commitState(mutator: (state: PersistedState) => void): void {
  if (!isServerEnvironment()) {
    return
  }

  const state = snapshotState()
  mutator(state)
  state.updatedAt = new Date().toISOString()
  writeStateInternal(state)
}

export function loadPersistedState(): PersistedState {
  if (!isServerEnvironment()) {
    return createEmptyState()
  }

  return snapshotState()
}

export function persistWorkflows(workflows: FeatureWorkflow[]): void {
  commitState((state) => {
    state.workflows = reviveDates(workflows)
  })
}

export function persistHandoffs(handoffs: Record<string, AgentHandoffRecord[]>): void {
  commitState((state) => {
    state.handoffs = reviveDates(handoffs)
  })
}

export function persistState(state: PersistedState): void {
  if (!isServerEnvironment()) {
    return
  }

  const nextState = reviveDates(state)
  nextState.updatedAt = new Date().toISOString()
  writeStateInternal(nextState)
}
