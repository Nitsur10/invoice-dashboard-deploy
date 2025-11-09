/**
 * Context Management System
 * Implements Anthropic's best practices for context engineering
 * - Treat context as finite resource
 * - Structured note-taking
 * - Just-in-time retrieval
 * - Minimize token usage
 */

import { FeatureWorkflow, AgentStatus, WorkflowEvent } from './types'

export interface ContextSnapshot {
  issue: {
    number: number
    title: string
    priority: string
  }
  currentPhase: string
  activeAgent: string
  keyDecisions: string[]
  recentEvents: string[]
  estimatedTokens: number
}

export interface StructuredNote {
  id: string
  category: 'decision' | 'blocker' | 'achievement' | 'learning'
  phase: string
  agent: string
  content: string
  timestamp: Date
  references?: string[]
}

/**
 * Context Compactor
 * Reduces verbose history to high-signal summaries
 */
export class ContextCompactor {
  /**
   * Compact workflow to minimal context snapshot
   * "Find the smallest set of high-signal tokens"
   */
  compact(workflow: FeatureWorkflow): ContextSnapshot {
    const keyDecisions = this.extractKeyDecisions(workflow)
    const recentEvents = this.summarizeRecentEvents(workflow.history || [])

    return {
      issue: {
        number: parseInt(workflow.id.split('-')[1]) || 0,
        title: workflow.title,
        priority: workflow.tags?.find((t) => t.startsWith('P'))?.substring(0, 2) || 'P2',
      },
      currentPhase: workflow.currentPhase,
      activeAgent: workflow.activeAgent || 'none',
      keyDecisions,
      recentEvents,
      estimatedTokens: this.estimateTokenCount({
        keyDecisions,
        recentEvents,
      }),
    }
  }

  /**
   * Extract high-signal decisions from workflow
   */
  private extractKeyDecisions(workflow: FeatureWorkflow): string[] {
    const decisions: string[] = []

    // Quality gate decisions
    for (const gateStatus of workflow.qualityGates) {
      if (gateStatus.state === 'Passed' || gateStatus.state === 'Failed') {
        decisions.push(
          `${gateStatus.gate.name}: ${gateStatus.state} (${gateStatus.score}%)`
        )
      }
    }

    // Agent completions
    const completedAgents = workflow.agents.filter((a) => a.status === 'Complete')
    if (completedAgents.length > 0) {
      decisions.push(
        `Completed: ${completedAgents.map((a) => a.name).join(', ')}`
      )
    }

    // Errors
    const erroredAgents = workflow.agents.filter((a) => a.status === 'Error')
    for (const agent of erroredAgents) {
      decisions.push(`ERROR: ${agent.name} - ${agent.error}`)
    }

    return decisions.slice(-10) // Keep last 10 decisions
  }

  /**
   * Summarize recent events (last 5)
   */
  private summarizeRecentEvents(events: WorkflowEvent[]): string[] {
    return events
      .slice(-5)
      .map((e) => `${e.type}: ${this.formatEventPayload(e.payload)}`)
  }

  /**
   * Format event payload concisely
   */
  private formatEventPayload(payload: Record<string, unknown>): string {
    const keys = Object.keys(payload)
    if (keys.length === 0) return '(no details)'

    // Show first 2 key-value pairs
    return keys
      .slice(0, 2)
      .map((k) => `${k}=${JSON.stringify(payload[k])}`)
      .join(', ')
  }

  /**
   * Rough token count estimation
   * ~4 characters per token (conservative)
   */
  private estimateTokenCount(data: unknown): number {
    const jsonString = JSON.stringify(data)
    return Math.ceil(jsonString.length / 4)
  }
}

/**
 * Structured Note-Taking System
 * Persistent memory outside context window
 */
export class StructuredNotekeeper {
  private notes: Map<string, StructuredNote[]> = new Map()

  /**
   * Add structured note for workflow
   */
  addNote(
    workflowId: string,
    note: Omit<StructuredNote, 'id' | 'timestamp'>
  ): StructuredNote {
    const fullNote: StructuredNote = {
      ...note,
      id: this.generateNoteId(),
      timestamp: new Date(),
    }

    const existingNotes = this.notes.get(workflowId) || []
    existingNotes.push(fullNote)
    this.notes.set(workflowId, existingNotes)

    return fullNote
  }

  /**
   * Get notes by category
   */
  getNotesByCategory(
    workflowId: string,
    category: StructuredNote['category']
  ): StructuredNote[] {
    const allNotes = this.notes.get(workflowId) || []
    return allNotes.filter((n) => n.category === category)
  }

  /**
   * Get notes by phase
   */
  getNotesByPhase(workflowId: string, phase: string): StructuredNote[] {
    const allNotes = this.notes.get(workflowId) || []
    return allNotes.filter((n) => n.phase === phase)
  }

  /**
   * Get recent notes (last N)
   */
  getRecentNotes(workflowId: string, limit: number = 5): StructuredNote[] {
    const allNotes = this.notes.get(workflowId) || []
    return allNotes.slice(-limit)
  }

  /**
   * Get learning notes across all workflows
   * Enables cross-issue pattern recognition
   */
  getAllLearnings(): StructuredNote[] {
    const learnings: StructuredNote[] = []

    for (const notes of this.notes.values()) {
      learnings.push(...notes.filter((n) => n.category === 'learning'))
    }

    return learnings
  }

  /**
   * Clear notes for workflow
   */
  clearNotes(workflowId: string): void {
    this.notes.delete(workflowId)
  }

  /**
   * Generate unique note ID
   */
  private generateNoteId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

/**
 * Just-In-Time Context Retriever
 * Fetches relevant information only when needed
 */
export class JustInTimeRetriever {
  /**
   * Retrieve relevant file context based on query
   */
  async retrieveFileContext(query: string, maxResults: number = 5): Promise<string[]> {
    // In production, would use file search API or embeddings
    // For now, return placeholder

    const relevantFiles: string[] = []

    // Simulate file search based on query keywords
    const keywords = query.toLowerCase().split(/\s+/)

    if (keywords.includes('api') || keywords.includes('route')) {
      relevantFiles.push('src/app/api/stats/route.ts')
      relevantFiles.push('src/app/api/invoices/route.ts')
    }

    if (keywords.includes('component') || keywords.includes('ui')) {
      relevantFiles.push('src/components/StatsCard.tsx')
      relevantFiles.push('src/components/invoices/InvoicesTable.tsx')
    }

    if (keywords.includes('test')) {
      relevantFiles.push('tests-e2e/dashboard.spec.ts')
      relevantFiles.push('src/components/__tests__/StatsCard.test.tsx')
    }

    return relevantFiles.slice(0, maxResults)
  }

  /**
   * Retrieve similar issues/workflows
   */
  async retrieveSimilarIssues(
    currentIssue: { title: string; labels: string[] },
    maxResults: number = 3
  ): Promise<string[]> {
    // In production, would use vector similarity search
    // For now, return placeholder based on labels

    const similarIssues: string[] = []

    if (currentIssue.labels.includes('frontend')) {
      similarIssues.push('Issue #001: Dashboard trend percentage fix')
      similarIssues.push('Issue #005: Stats card quick filters')
    }

    if (currentIssue.labels.includes('analytics')) {
      similarIssues.push('Issue #003: Revenue breakdown analytics')
    }

    return similarIssues.slice(0, maxResults)
  }

  /**
   * Retrieve agent outputs from previous executions
   */
  async retrievePreviousOutputs(
    agentName: string,
    category: string
  ): Promise<string[]> {
    // In production, would query persistent storage
    return [
      `[${agentName}] Previous ${category} execution patterns`,
      `[${agentName}] Common pitfalls and solutions`,
    ]
  }
}

/**
 * Context Budget Monitor
 * Tracks token usage and warns when approaching limits
 */
export class ContextBudgetMonitor {
  private maxTokens: number
  private warningThreshold: number

  constructor(maxTokens: number = 100000, warningThreshold: number = 0.8) {
    this.maxTokens = maxTokens
    this.warningThreshold = warningThreshold
  }

  /**
   * Check if context is within budget
   */
  checkBudget(estimatedTokens: number): {
    withinBudget: boolean
    percentageUsed: number
    tokensRemaining: number
    shouldCompact: boolean
  } {
    const percentageUsed = estimatedTokens / this.maxTokens
    const tokensRemaining = this.maxTokens - estimatedTokens
    const withinBudget = percentageUsed < 1.0
    const shouldCompact = percentageUsed > this.warningThreshold

    return {
      withinBudget,
      percentageUsed,
      tokensRemaining,
      shouldCompact,
    }
  }

  /**
   * Recommend compaction strategy
   */
  recommendCompaction(estimatedTokens: number): string[] {
    const status = this.checkBudget(estimatedTokens)
    const recommendations: string[] = []

    if (status.shouldCompact) {
      recommendations.push('Compact conversation history (keep last 5 messages)')
      recommendations.push('Summarize completed agent outputs')
      recommendations.push('Remove redundant event payloads')
    }

    if (!status.withinBudget) {
      recommendations.push('CRITICAL: Context exceeds budget')
      recommendations.push('Consider sub-agent architecture with clean contexts')
      recommendations.push('Offload history to structured notes')
    }

    return recommendations
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const contextCompactor = new ContextCompactor()
export const structuredNotekeeper = new StructuredNotekeeper()
export const justInTimeRetriever = new JustInTimeRetriever()
export const contextBudgetMonitor = new ContextBudgetMonitor()

/**
 * High-level context management facade
 */
export class ContextManager {
  /**
   * Get optimized context for agent execution
   */
  async getAgentContext(workflow: FeatureWorkflow, agentName: string): Promise<{
    snapshot: ContextSnapshot
    notes: StructuredNote[]
    relevantFiles: string[]
    budgetStatus: ReturnType<ContextBudgetMonitor['checkBudget']>
  }> {
    // Compact workflow to snapshot
    const snapshot = contextCompactor.compact(workflow)

    // Get recent notes for context
    const notes = structuredNotekeeper.getRecentNotes(workflow.id, 5)

    // Retrieve relevant files just-in-time
    const relevantFiles = await justInTimeRetriever.retrieveFileContext(
      `${workflow.title} ${agentName}`,
      3
    )

    // Check budget
    const budgetStatus = contextBudgetMonitor.checkBudget(snapshot.estimatedTokens)

    if (budgetStatus.shouldCompact) {
      console.warn(
        `⚠️  Context approaching limit (${Math.round(budgetStatus.percentageUsed * 100)}%). Consider compaction.`
      )
    }

    return {
      snapshot,
      notes,
      relevantFiles,
      budgetStatus,
    }
  }

  /**
   * Log structured note during execution
   */
  logNote(
    workflowId: string,
    category: StructuredNote['category'],
    phase: string,
    agent: string,
    content: string
  ): void {
    structuredNotekeeper.addNote(workflowId, {
      category,
      phase,
      agent,
      content,
    })
  }
}

export const contextManager = new ContextManager()
