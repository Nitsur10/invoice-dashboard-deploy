import { featureWorkflowRegistry } from './workflow-registry'
import {
  computeOverallQualityScore,
  createInitialQualityGateStatuses,
  evaluateQualityGate,
  qualityGates,
} from './quality-gates'
import { AgentType, QualityGateStatus } from './types'

export function initializeQualityGates(featureId: string): QualityGateStatus[] {
  const workflow = featureWorkflowRegistry.getWorkflow(featureId)
  if (!workflow) {
    throw new Error(`Workflow ${featureId} not found`)
  }

  const statuses = createInitialQualityGateStatuses()
  featureWorkflowRegistry.attachQualityGates(featureId, statuses)
  featureWorkflowRegistry.updateQualityScore(featureId, 0)

  return statuses
}

export interface FeatureQualityGateEvaluationInput {
  featureId: string
  gateName: string
  criteriaResults: Record<string, number>
  allowBypass?: boolean
  requestedBy?: AgentType
}

export function evaluateQualityGateForFeature(
  input: FeatureQualityGateEvaluationInput
): QualityGateStatus {
  const { featureId, gateName, criteriaResults, allowBypass, requestedBy } = input
  const workflow = featureWorkflowRegistry.getWorkflow(featureId)

  if (!workflow) {
    throw new Error(`Workflow ${featureId} not found`)
  }

  const gate = qualityGates.find((candidate) => candidate.name === gateName)

  if (!gate) {
    throw new Error(`Quality gate ${gateName} not recognised`)
  }

  const result = evaluateQualityGate({
    gate,
    criteriaResults,
    allowBypass,
    requestedBy,
  })

  const status: QualityGateStatus = {
    gate,
    state: result.state,
    score: result.score,
    evaluatedAt: result.evaluatedAt,
    notes: result.notes,
    criteriaResults: result.criteriaResults,
    bypassedBy: result.bypassedBy,
  }

  featureWorkflowRegistry.updateQualityGateStatus(featureId, gateName, status)

  const updatedWorkflow = featureWorkflowRegistry.getWorkflow(featureId)
  if (updatedWorkflow) {
    const overall = computeOverallQualityScore(updatedWorkflow.qualityGates)
    featureWorkflowRegistry.updateQualityScore(featureId, overall)
  }

  return status
}

export function ensureQualityGatesInitialized(featureId: string): QualityGateStatus[] {
  const workflow = featureWorkflowRegistry.getWorkflow(featureId)
  if (!workflow) {
    throw new Error(`Workflow ${featureId} not found`)
  }

  if (!workflow.qualityGates.length) {
    return initializeQualityGates(featureId)
  }

  return workflow.qualityGates
}
