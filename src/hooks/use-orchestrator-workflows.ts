'use client'

import { useQuery } from '@tanstack/react-query'
import { featureWorkflowRegistry } from '@/lib/orchestrator'
import { ORCHESTRATOR_QUERY_KEYS } from '@/lib/orchestrator/query-bridge'
import type { FeatureWorkflow } from '@/lib/orchestrator'

export function useOrchestratorWorkflows() {
  return useQuery<FeatureWorkflow[]>({
    queryKey: ORCHESTRATOR_QUERY_KEYS.workflows,
    queryFn: async () => featureWorkflowRegistry.getWorkflows(),
  })
}
