/**
 * Evaluator-Optimizer Pattern
 * Implements Anthropic's recommendation for iterative refinement
 * One agent generates, another provides feedback, enables auto-correction
 */

import { QualityGateStatus, QualityGateState, AgentType } from './types'

export interface EvaluatorFeedback {
  passed: boolean
  score: number
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low'
    category: string
    description: string
    suggestion: string
  }>
  recommendations: string[]
}

export interface OptimizationResult {
  improved: boolean
  iterations: number
  finalScore: number
  changesMade: string[]
}

export interface EvaluatorOptimizerConfig {
  maxIterations: number
  targetScore: number
  autoFix: boolean
  stopOnFirstPass: boolean
}

const DEFAULT_CONFIG: EvaluatorOptimizerConfig = {
  maxIterations: 3,
  targetScore: 95,
  autoFix: true,
  stopOnFirstPass: true,
}

/**
 * Evaluator: Analyzes quality gate results and provides actionable feedback
 */
export class QualityGateEvaluator {
  /**
   * Evaluate quality gate results and provide structured feedback
   */
  evaluate(gateStatus: QualityGateStatus): EvaluatorFeedback {
    const { gate, state, score, criteriaResults } = gateStatus
    const issues: EvaluatorFeedback['issues'] = []
    const recommendations: string[] = []

    // Analyze each criterion
    for (const [criterion, criterionScore] of Object.entries(criteriaResults || {})) {
      if (criterionScore < gate.threshold) {
        const gap = gate.threshold - criterionScore

        // Determine severity based on gap
        const severity =
          gap >= 30 ? 'critical' : gap >= 20 ? 'high' : gap >= 10 ? 'medium' : 'low'

        issues.push({
          severity,
          category: this.categorizeCriterion(criterion),
          description: `${criterion}: Score ${criterionScore} is below threshold ${gate.threshold}`,
          suggestion: this.generateSuggestion(criterion, criterionScore, gate.threshold),
        })
      }
    }

    // Generate recommendations based on overall score
    if (score < gate.threshold) {
      recommendations.push(
        ...this.generateRecommendations(gate.phase, score, gate.threshold, issues)
      )
    }

    return {
      passed: state === 'Passed',
      score,
      issues,
      recommendations,
    }
  }

  /**
   * Categorize criterion for targeted suggestions
   */
  private categorizeCriterion(criterion: string): string {
    const categories: Record<string, RegExp> = {
      accessibility: /a11y|accessibility|wcag|aria|keyboard/i,
      performance: /performance|lighthouse|speed|load|bundle/i,
      security: /security|vulnerability|audit|secrets/i,
      testing: /test|coverage|playwright|jest/i,
      code_quality: /lint|type|eslint|typescript/i,
      functionality: /feature|behavior|functionality|works/i,
    }

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(criterion)) return category
    }

    return 'general'
  }

  /**
   * Generate actionable suggestion for failing criterion
   */
  private generateSuggestion(
    criterion: string,
    currentScore: number,
    threshold: number
  ): string {
    const category = this.categorizeCriterion(criterion)

    const suggestions: Record<string, string> = {
      accessibility: `Run axe DevTools to identify violations. Focus on ARIA labels, contrast ratios ≥4.5:1, and keyboard navigation.`,
      performance: `Analyze bundle size with 'npm run build'. Check API response times and consider caching strategies.`,
      security: `Run 'npm audit fix' to resolve vulnerabilities. Check for secrets with gitleaks.`,
      testing: `Add missing test cases. Ensure edge cases and error paths are covered. Aim for ≥${threshold}% coverage.`,
      code_quality: `Fix linting errors with 'npm run lint --fix'. Resolve TypeScript errors in strict mode.`,
      functionality: `Review acceptance criteria. Ensure core user flows work end-to-end.`,
      general: `Review implementation against specification. Gap: ${threshold - currentScore} points.`,
    }

    return suggestions[category] || suggestions.general
  }

  /**
   * Generate phase-specific recommendations
   */
  private generateRecommendations(
    phase: string,
    currentScore: number,
    threshold: number,
    issues: EvaluatorFeedback['issues']
  ): string[] {
    const recommendations: string[] = []
    const gap = threshold - currentScore

    // Critical issues first
    const criticalIssues = issues.filter((i) => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalIssues.length} critical issues must be resolved before proceeding.`
      )
    }

    // Phase-specific recommendations
    switch (phase) {
      case 'Foundation':
        if (gap > 10) {
          recommendations.push(
            'Foundation issues may cascade. Resolve baseline stability before adding features.'
          )
        }
        break

      case 'Development':
        if (gap > 15) {
          recommendations.push(
            'Consider breaking down implementation into smaller, testable units.'
          )
        }
        break

      case 'Quality':
        recommendations.push(
          'Quality gate failures at this phase may indicate scope creep or insufficient testing earlier.'
        )
        break

      case 'Deployment':
        if (gap > 5) {
          recommendations.push(
            'BLOCKER: Deployment gate must achieve ≥95% to proceed to production.'
          )
        }
        break
    }

    // General improvement strategy
    if (gap > 20) {
      recommendations.push(
        `Large gap (${gap} points) suggests fundamental issues. Consider revisiting spec or implementation approach.`
      )
    } else if (gap > 10) {
      recommendations.push(`Moderate gap. Focus on top ${issues.length} issues for quickest improvement.`)
    } else {
      recommendations.push(`Minor adjustments needed. Prioritize high-severity items.`)
    }

    return recommendations
  }
}

/**
 * Optimizer: Attempts to auto-fix issues based on evaluator feedback
 */
export class QualityGateOptimizer {
  constructor(private config: EvaluatorOptimizerConfig = DEFAULT_CONFIG) {}

  /**
   * Attempt to optimize quality gate results through iterative refinement
   */
  async optimize(
    gateStatus: QualityGateStatus,
    evaluator: QualityGateEvaluator,
    optimizationAgent: AgentType
  ): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      improved: false,
      iterations: 0,
      finalScore: gateStatus.score,
      changesMade: [],
    }

    let currentStatus = gateStatus
    let currentFeedback = evaluator.evaluate(currentStatus)

    // Optimization loop
    while (
      result.iterations < this.config.maxIterations &&
      !currentFeedback.passed &&
      currentStatus.score < this.config.targetScore
    ) {
      result.iterations++

      console.log(
        `🔄 Optimization iteration ${result.iterations}/${this.config.maxIterations}`
      )
      console.log(`Current score: ${currentStatus.score}, Target: ${this.config.targetScore}`)

      if (!this.config.autoFix) {
        // Manual mode: return feedback for human intervention
        console.log('⚠️  Auto-fix disabled. Manual intervention required.')
        break
      }

      // Apply optimizations based on feedback
      const optimizations = await this.applyOptimizations(
        currentFeedback,
        optimizationAgent
      )

      if (optimizations.length === 0) {
        console.log('⚠️  No optimizations available. Manual intervention required.')
        break
      }

      result.changesMade.push(...optimizations)

      // Simulate re-evaluation (in production, would re-run quality gates)
      const scoreImprovement = this.estimateImprovement(currentFeedback.issues)
      currentStatus = {
        ...currentStatus,
        score: Math.min(100, currentStatus.score + scoreImprovement),
      }

      // Re-evaluate with new score
      currentFeedback = evaluator.evaluate(currentStatus)

      if (currentFeedback.passed && this.config.stopOnFirstPass) {
        result.improved = true
        result.finalScore = currentStatus.score
        console.log(`✅ Optimization successful! Score: ${result.finalScore}`)
        break
      }
    }

    if (result.iterations >= this.config.maxIterations) {
      console.log('⚠️  Max iterations reached. Score may still be below threshold.')
    }

    result.finalScore = currentStatus.score
    result.improved = result.finalScore > gateStatus.score

    return result
  }

  /**
   * Apply optimizations based on evaluator feedback
   */
  private async applyOptimizations(
    feedback: EvaluatorFeedback,
    agent: AgentType
  ): Promise<string[]> {
    const optimizations: string[] = []

    // Sort issues by severity
    const sortedIssues = [...feedback.issues].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    // Apply fixes for each issue
    for (const issue of sortedIssues.slice(0, 5)) {
      // Limit to top 5 issues per iteration
      const fix = await this.generateFix(issue, agent)
      if (fix) {
        optimizations.push(fix)
      }
    }

    return optimizations
  }

  /**
   * Generate fix for specific issue
   */
  private async generateFix(
    issue: EvaluatorFeedback['issues'][0],
    agent: AgentType
  ): Promise<string | null> {
    // In production, this would delegate to appropriate agent
    // For now, return suggestion as pseudo-fix

    const fixTemplates: Record<string, string> = {
      accessibility: `[${agent}] Add ARIA labels and improve keyboard navigation`,
      performance: `[${agent}] Optimize bundle size and API response times`,
      security: `[${agent}] Resolve ${issue.severity} security vulnerability`,
      testing: `[${agent}] Add missing test coverage for ${issue.category}`,
      code_quality: `[${agent}] Fix linting and type errors`,
      functionality: `[${agent}] Implement missing acceptance criteria`,
    }

    return fixTemplates[issue.category] || `[${agent}] ${issue.suggestion}`
  }

  /**
   * Estimate improvement from fixing issues
   */
  private estimateImprovement(issues: EvaluatorFeedback['issues']): number {
    // Conservative estimate: 5-15 points per iteration based on severity
    const severityPoints = {
      critical: 15,
      high: 10,
      medium: 7,
      low: 5,
    }

    // Take highest severity issue as base improvement
    const topIssue = issues[0]
    return topIssue ? severityPoints[topIssue.severity] : 5
  }
}

/**
 * Convenience function to run evaluator-optimizer loop
 */
export async function evaluateAndOptimize(
  gateStatus: QualityGateStatus,
  agent: AgentType,
  config?: Partial<EvaluatorOptimizerConfig>
): Promise<{
  feedback: EvaluatorFeedback
  optimization: OptimizationResult
}> {
  const evaluator = new QualityGateEvaluator()
  const optimizer = new QualityGateOptimizer({ ...DEFAULT_CONFIG, ...config })

  const feedback = evaluator.evaluate(gateStatus)
  const optimization = await optimizer.optimize(gateStatus, evaluator, agent)

  return { feedback, optimization }
}
