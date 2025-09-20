import type { QueryClient } from '@tanstack/react-query'
import { agentHandoffManager } from './handoff-service'
import { orchestratorEventBus } from './event-bus'
import { featureWorkflowRegistry } from './workflow-registry'
import { ensureInvoiceDashboardWorkflows } from './invoice-dashboard-workflows'
import type { OrchestratorEvent } from './types'

export const ORCHESTRATOR_QUERY_KEYS = {
  workflows: ['orchestrator', 'workflows'] as const,
  handoffs: (featureId: string) => ['orchestrator', 'handoffs', featureId] as const,
}

function syncWorkflows(queryClient: QueryClient) {
  const workflows = featureWorkflowRegistry.getWorkflows()
  queryClient.setQueryData(ORCHESTRATOR_QUERY_KEYS.workflows, workflows)
}

function syncHandoffs(featureId: string, queryClient: QueryClient) {
  const handoffs = agentHandoffManager.list(featureId)
  queryClient.setQueryData(ORCHESTRATOR_QUERY_KEYS.handoffs(featureId), handoffs)
}

function ensureWorkflowQueryDefaults(queryClient: QueryClient) {
  const existingDefaults = queryClient.getQueryDefaults(ORCHESTRATOR_QUERY_KEYS.workflows)
  if (!existingDefaults) {
    queryClient.setQueryDefaults(ORCHESTRATOR_QUERY_KEYS.workflows, {
      queryFn: async () => featureWorkflowRegistry.getWorkflows(),
      staleTime: 5 * 1000,
    })
  }
}

function ensureHandoffQueryDefaults(queryClient: QueryClient) {
  // No-op for now: handoff queries are seeded on-demand when events arrive
  return queryClient
}

function isWorkflowEvent(event: OrchestratorEvent): boolean {
  switch (event.type) {
    case 'feature.created':
    case 'feature.updated':
    case 'agent.status.updated':
    case 'quality-gate.evaluated':
    case 'quality.score.updated':
      return true
    default:
      return false
  }
}

function extractFeatureId(event: OrchestratorEvent): string | undefined {
  const { featureId } = event.payload as { featureId?: unknown }
  return typeof featureId === 'string' ? featureId : undefined
}

export function registerOrchestratorQueryBridge(queryClient: QueryClient): () => void {
  ensureInvoiceDashboardWorkflows()
  ensureWorkflowQueryDefaults(queryClient)
  ensureHandoffQueryDefaults(queryClient)
  syncWorkflows(queryClient)
  for (const workflow of featureWorkflowRegistry.getWorkflows()) {
    syncHandoffs(workflow.id, queryClient)
  }

  const unsubscribers = [
    orchestratorEventBus.subscribe('*', (event) => {
      if (isWorkflowEvent(event)) {
        syncWorkflows(queryClient)
        return
      }

      if (event.type === 'handoff.pending' || event.type === 'handoff.completed' || event.type === 'handoff.failed') {
        const featureId = extractFeatureId(event)
        if (featureId) {
          syncHandoffs(featureId, queryClient)
          // Handoff events often imply agent status changes, so refresh workflows too
          syncWorkflows(queryClient)
        }
      }
    }),
  ]

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

export function primeOrchestratorQueries(queryClient: QueryClient) {
  ensureInvoiceDashboardWorkflows()
  ensureWorkflowQueryDefaults(queryClient)
  syncWorkflows(queryClient)
}
