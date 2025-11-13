/**
 * Persistent Memory System
 * Cross-issue learning and pattern recognition
 * Inspired by ZARA WhatsApp AI memory system
 */

import fs from 'fs'
import path from 'path'
import { FeatureWorkflow, AgentStatus } from './types'

export interface ExecutionPattern {
  id: string
  issueType: string
  agentSequence: string[]
  successRate: number
  averageDuration: number
  commonPitfalls: string[]
  bestPractices: string[]
  usageCount: number
  lastUsed: Date
}

export interface LearningRecord {
  id: string
  category: 'success' | 'failure' | 'optimization' | 'pattern'
  issue: {
    number: number
    title: string
    labels: string[]
  }
  agent: string
  lesson: string
  context: string
  timestamp: Date
  confidence: number
}

export interface WorkflowMetrics {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  commonFailurePoints: Record<string, number>
  qualityScoreTrend: number[]
}

/**
 * Pattern Recognition Engine
 * Identifies successful workflow patterns
 */
export class PatternRecognitionEngine {
  private patterns: Map<string, ExecutionPattern> = new Map()

  /**
   * Record workflow execution
   */
  recordExecution(workflow: FeatureWorkflow, success: boolean): void {
    const patternKey = this.generatePatternKey(workflow)
    const existing = this.patterns.get(patternKey)

    if (existing) {
      // Update existing pattern
      const totalExecutions = existing.usageCount + 1
      const newSuccesses = existing.successRate * existing.usageCount + (success ? 1 : 0)

      existing.successRate = newSuccesses / totalExecutions
      existing.usageCount = totalExecutions
      existing.lastUsed = new Date()

      // Update duration
      const duration = this.calculateWorkflowDuration(workflow)
      existing.averageDuration =
        (existing.averageDuration * (totalExecutions - 1) + duration) / totalExecutions
    } else {
      // Create new pattern
      this.patterns.set(patternKey, {
        id: this.generatePatternId(),
        issueType: this.classifyIssue(workflow),
        agentSequence: this.extractAgentSequence(workflow),
        successRate: success ? 1 : 0,
        averageDuration: this.calculateWorkflowDuration(workflow),
        commonPitfalls: [],
        bestPractices: [],
        usageCount: 1,
        lastUsed: new Date(),
      })
    }
  }

  /**
   * Find similar patterns for current workflow
   */
  findSimilarPatterns(workflow: FeatureWorkflow, limit: number = 3): ExecutionPattern[] {
    const currentType = this.classifyIssue(workflow)
    const currentLabels = workflow.tags || []

    // Score each pattern by similarity
    const scored = Array.from(this.patterns.values())
      .map((pattern) => ({
        pattern,
        score: this.calculateSimilarity(currentType, currentLabels, pattern),
      }))
      .filter((item) => item.score > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, limit).map((item) => item.pattern)
  }

  /**
   * Get best practices for issue type
   */
  getBestPractices(issueType: string): string[] {
    const patterns = Array.from(this.patterns.values()).filter(
      (p) => p.issueType === issueType && p.successRate > 0.8
    )

    const allPractices = patterns.flatMap((p) => p.bestPractices)
    return [...new Set(allPractices)]
  }

  /**
   * Generate pattern key from workflow
   */
  private generatePatternKey(workflow: FeatureWorkflow): string {
    const type = this.classifyIssue(workflow)
    const agents = this.extractAgentSequence(workflow).join('-')
    return `${type}:${agents}`
  }

  /**
   * Classify issue based on title and tags
   */
  private classifyIssue(workflow: FeatureWorkflow): string {
    const title = workflow.title.toLowerCase()
    const tags = workflow.tags?.map((t) => t.toLowerCase()) || []

    // Classification logic
    if (title.includes('bug') || title.includes('fix')) return 'bugfix'
    if (title.includes('feat') || title.includes('add')) return 'feature'
    if (title.includes('refactor')) return 'refactor'
    if (title.includes('test')) return 'testing'
    if (title.includes('docs')) return 'documentation'
    if (tags.includes('frontend')) return 'frontend'
    if (tags.includes('backend') || tags.includes('api')) return 'backend'

    return 'general'
  }

  /**
   * Extract agent execution sequence
   */
  private extractAgentSequence(workflow: FeatureWorkflow): string[] {
    return workflow.agents
      .filter((a) => a.status === 'Complete')
      .map((a) => a.name)
  }

  /**
   * Calculate workflow duration
   */
  private calculateWorkflowDuration(workflow: FeatureWorkflow): number {
    const completedAgents = workflow.agents.filter((a) => a.completedAt)
    if (completedAgents.length === 0) return 0

    const durations = completedAgents.map((a) => a.duration)
    return durations.reduce((sum, d) => sum + d, 0)
  }

  /**
   * Calculate similarity between current workflow and pattern
   */
  private calculateSimilarity(
    currentType: string,
    currentLabels: string[],
    pattern: ExecutionPattern
  ): number {
    let score = 0

    // Type match
    if (currentType === pattern.issueType) score += 0.5

    // Label overlap
    const patternLabels = pattern.issueType.split('-')
    const overlap = currentLabels.filter((l) => patternLabels.includes(l)).length
    score += (overlap / Math.max(currentLabels.length, patternLabels.length)) * 0.3

    // Success rate boost
    score += pattern.successRate * 0.2

    return Math.min(score, 1)
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Export patterns to JSON
   */
  exportPatterns(): ExecutionPattern[] {
    return Array.from(this.patterns.values())
  }

  /**
   * Import patterns from JSON
   */
  importPatterns(patterns: ExecutionPattern[]): void {
    for (const pattern of patterns) {
      this.patterns.set(`${pattern.issueType}:${pattern.agentSequence.join('-')}`, pattern)
    }
  }
}

/**
 * Learning Repository
 * Stores and retrieves lessons learned
 */
export class LearningRepository {
  private learnings: LearningRecord[] = []
  private maxRecords: number = 1000

  /**
   * Add learning record
   */
  addLearning(record: Omit<LearningRecord, 'id' | 'timestamp'>): void {
    this.learnings.push({
      ...record,
      id: this.generateLearningId(),
      timestamp: new Date(),
    })

    // Maintain max records
    if (this.learnings.length > this.maxRecords) {
      this.learnings = this.learnings.slice(-this.maxRecords)
    }
  }

  /**
   * Get learnings by category
   */
  getLearningsByCategory(category: LearningRecord['category']): LearningRecord[] {
    return this.learnings.filter((l) => l.category === category)
  }

  /**
   * Get learnings by agent
   */
  getLearningsByAgent(agent: string): LearningRecord[] {
    return this.learnings.filter((l) => l.agent === agent)
  }

  /**
   * Get high-confidence learnings
   */
  getHighConfidenceLearnings(minConfidence: number = 0.8): LearningRecord[] {
    return this.learnings
      .filter((l) => l.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Search learnings by context
   */
  searchLearnings(query: string, limit: number = 10): LearningRecord[] {
    const lowerQuery = query.toLowerCase()

    return this.learnings
      .filter(
        (l) =>
          l.lesson.toLowerCase().includes(lowerQuery) ||
          l.context.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Get recent learnings
   */
  getRecentLearnings(limit: number = 20): LearningRecord[] {
    return this.learnings
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Generate unique learning ID
   */
  private generateLearningId(): string {
    return `learning-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Export learnings to JSON
   */
  exportLearnings(): LearningRecord[] {
    return [...this.learnings]
  }

  /**
   * Import learnings from JSON
   */
  importLearnings(learnings: LearningRecord[]): void {
    this.learnings.push(...learnings)

    // Maintain max records
    if (this.learnings.length > this.maxRecords) {
      this.learnings = this.learnings.slice(-this.maxRecords)
    }
  }
}

/**
 * Metrics Tracker
 * Tracks aggregate metrics across executions
 */
export class MetricsTracker {
  private metrics: WorkflowMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageDuration: 0,
    commonFailurePoints: {},
    qualityScoreTrend: [],
  }

  /**
   * Record workflow execution
   */
  recordExecution(workflow: FeatureWorkflow, success: boolean): void {
    this.metrics.totalExecutions++

    if (success) {
      this.metrics.successfulExecutions++
    } else {
      this.metrics.failedExecutions++

      // Track failure point
      const failedAgent = workflow.agents.find((a) => a.status === 'Error')
      if (failedAgent) {
        this.metrics.commonFailurePoints[failedAgent.name] =
          (this.metrics.commonFailurePoints[failedAgent.name] || 0) + 1
      }
    }

    // Update average duration
    const duration = this.calculateDuration(workflow)
    this.metrics.averageDuration =
      (this.metrics.averageDuration * (this.metrics.totalExecutions - 1) + duration) /
      this.metrics.totalExecutions

    // Track quality score trend
    this.metrics.qualityScoreTrend.push(workflow.overallQualityScore)
    if (this.metrics.qualityScoreTrend.length > 100) {
      this.metrics.qualityScoreTrend = this.metrics.qualityScoreTrend.slice(-100)
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): WorkflowMetrics {
    return { ...this.metrics }
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalExecutions === 0) return 0
    return this.metrics.successfulExecutions / this.metrics.totalExecutions
  }

  /**
   * Get quality score trend
   */
  getQualityTrend(): { improving: boolean; averageScore: number } {
    if (this.metrics.qualityScoreTrend.length < 2) {
      return { improving: false, averageScore: 0 }
    }

    const recent = this.metrics.qualityScoreTrend.slice(-10)
    const average = recent.reduce((sum, score) => sum + score, 0) / recent.length

    // Compare recent vs older scores
    const older = this.metrics.qualityScoreTrend.slice(-20, -10)
    const olderAverage = older.reduce((sum, score) => sum + score, 0) / (older.length || 1)

    return {
      improving: average > olderAverage,
      averageScore: average,
    }
  }

  /**
   * Calculate workflow duration
   */
  private calculateDuration(workflow: FeatureWorkflow): number {
    const completedAgents = workflow.agents.filter((a) => a.completedAt)
    return completedAgents.reduce((sum, a) => sum + a.duration, 0)
  }

  /**
   * Export metrics
   */
  exportMetrics(): WorkflowMetrics {
    return { ...this.metrics }
  }

  /**
   * Import metrics
   */
  importMetrics(metrics: WorkflowMetrics): void {
    this.metrics = { ...metrics }
  }
}

/**
 * Persistent Storage Manager
 * Saves and loads memory to/from disk
 */
export class PersistentStorageManager {
  private storagePath: string

  constructor(storagePath: string = '.agent-memory') {
    this.storagePath = path.join(process.cwd(), storagePath)

    // Ensure directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true })
    }
  }

  /**
   * Save patterns to disk
   */
  savePatterns(patterns: ExecutionPattern[]): void {
    const filePath = path.join(this.storagePath, 'patterns.json')
    fs.writeFileSync(filePath, JSON.stringify(patterns, null, 2))
  }

  /**
   * Load patterns from disk
   */
  loadPatterns(): ExecutionPattern[] {
    const filePath = path.join(this.storagePath, 'patterns.json')

    if (!fs.existsSync(filePath)) {
      return []
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }

  /**
   * Save learnings to disk
   */
  saveLearnings(learnings: LearningRecord[]): void {
    const filePath = path.join(this.storagePath, 'learnings.json')
    fs.writeFileSync(filePath, JSON.stringify(learnings, null, 2))
  }

  /**
   * Load learnings from disk
   */
  loadLearnings(): LearningRecord[] {
    const filePath = path.join(this.storagePath, 'learnings.json')

    if (!fs.existsSync(filePath)) {
      return []
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }

  /**
   * Save metrics to disk
   */
  saveMetrics(metrics: WorkflowMetrics): void {
    const filePath = path.join(this.storagePath, 'metrics.json')
    fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2))
  }

  /**
   * Load metrics from disk
   */
  loadMetrics(): WorkflowMetrics | null {
    const filePath = path.join(this.storagePath, 'metrics.json')

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }
}

/**
 * Persistent Memory System
 * Integrates all memory components
 */
export class PersistentMemorySystem {
  private patternEngine: PatternRecognitionEngine
  private learningRepo: LearningRepository
  private metricsTracker: MetricsTracker
  private storage: PersistentStorageManager

  constructor(storagePath?: string) {
    this.patternEngine = new PatternRecognitionEngine()
    this.learningRepo = new LearningRepository()
    this.metricsTracker = new MetricsTracker()
    this.storage = new PersistentStorageManager(storagePath)

    // Load existing data
    this.load()
  }

  /**
   * Record workflow execution and learn from it
   */
  recordWorkflow(workflow: FeatureWorkflow, success: boolean): void {
    this.patternEngine.recordExecution(workflow, success)
    this.metricsTracker.recordExecution(workflow, success)

    // Auto-save
    this.save()
  }

  /**
   * Add learning from execution
   */
  addLearning(learning: Omit<LearningRecord, 'id' | 'timestamp'>): void {
    this.learningRepo.addLearning(learning)
    this.save()
  }

  /**
   * Get recommendations for workflow
   */
  getRecommendations(workflow: FeatureWorkflow): {
    patterns: ExecutionPattern[]
    learnings: LearningRecord[]
    bestPractices: string[]
  } {
    const issueType = this.classifyWorkflow(workflow)

    return {
      patterns: this.patternEngine.findSimilarPatterns(workflow, 3),
      learnings: this.learningRepo
        .searchLearnings(workflow.title, 5)
        .filter((l) => l.confidence > 0.7),
      bestPractices: this.patternEngine.getBestPractices(issueType),
    }
  }

  /**
   * Save all memory to disk
   */
  save(): void {
    this.storage.savePatterns(this.patternEngine.exportPatterns())
    this.storage.saveLearnings(this.learningRepo.exportLearnings())
    this.storage.saveMetrics(this.metricsTracker.exportMetrics())
  }

  /**
   * Load all memory from disk
   */
  load(): void {
    this.patternEngine.importPatterns(this.storage.loadPatterns())
    this.learningRepo.importLearnings(this.storage.loadLearnings())

    const metrics = this.storage.loadMetrics()
    if (metrics) {
      this.metricsTracker.importMetrics(metrics)
    }
  }

  /**
   * Classify workflow for pattern matching
   */
  private classifyWorkflow(workflow: FeatureWorkflow): string {
    const title = workflow.title.toLowerCase()
    if (title.includes('bug') || title.includes('fix')) return 'bugfix'
    if (title.includes('feat') || title.includes('add')) return 'feature'
    return 'general'
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalPatterns: number
    totalLearnings: number
    successRate: number
    qualityTrend: { improving: boolean; averageScore: number }
  } {
    return {
      totalPatterns: this.patternEngine.exportPatterns().length,
      totalLearnings: this.learningRepo.exportLearnings().length,
      successRate: this.metricsTracker.getSuccessRate(),
      qualityTrend: this.metricsTracker.getQualityTrend(),
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const persistentMemory = new PersistentMemorySystem()
