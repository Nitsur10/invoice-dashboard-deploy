/**
 * Formal Tool Schemas for Multi-Agent System
 * Based on Anthropic best practices for agent-computer interfaces
 */

import { z } from 'zod'

// ============================================================================
// Common Schemas
// ============================================================================

export const FileChangeSchema = z.object({
  path: z.string().describe('Absolute or relative file path'),
  type: z.enum(['created', 'modified', 'deleted']),
  linesChanged: z.number().optional(),
  description: z.string().optional(),
})

export const TestResultSchema = z.object({
  testFile: z.string(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  duration: z.number().describe('Duration in milliseconds'),
  failures: z.array(z.string()).optional(),
})

export const QualityCheckSchema = z.object({
  name: z.string(),
  status: z.enum(['pass', 'fail', 'warning']),
  score: z.number().min(0).max(100).optional(),
  details: z.string().optional(),
  errors: z.array(z.string()).optional(),
})

// ============================================================================
// Agent Input/Output Schemas
// ============================================================================

// Spec Agent (10)
// --------------
export const SpecAgentInputSchema = z.object({
  issueNumber: z.number(),
  issueTitle: z.string(),
  issueBody: z.string(),
  labels: z.array(z.string()).default([]),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  existingSpecs: z.array(z.string()).optional(),
})

export const SpecAgentOutputSchema = z.object({
  success: z.boolean(),
  specPath: z.string().describe('Path to generated specification file'),
  problemStatement: z.string(),
  scope: z.array(z.string()),
  outOfScope: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  risks: z.array(
    z.object({
      description: z.string(),
      likelihood: z.enum(['Low', 'Medium', 'High']),
      impact: z.enum(['Low', 'Medium', 'High']),
      mitigation: z.string(),
    })
  ),
  testMatrix: z.object({
    unit: z.number(),
    integration: z.number(),
    e2e: z.number(),
  }),
  qualityBudgets: z.object({
    accessibility: z.string(),
    performance: z.string(),
    security: z.string(),
    bundle: z.string().optional(),
  }),
  filesToModify: z.array(z.string()),
  estimatedComplexity: z.enum(['Low', 'Medium', 'High']),
})

export type SpecAgentInput = z.infer<typeof SpecAgentInputSchema>
export type SpecAgentOutput = z.infer<typeof SpecAgentOutputSchema>

// Tests Agent (20)
// ---------------
export const TestsAgentInputSchema = z.object({
  issueNumber: z.number(),
  specPath: z.string(),
  testMatrix: z.object({
    unit: z.number(),
    integration: z.number(),
    e2e: z.number(),
  }),
  existingTestFiles: z.array(z.string()).optional(),
})

export const TestsAgentOutputSchema = z.object({
  success: z.boolean(),
  testFiles: z.array(
    z.object({
      path: z.string(),
      type: z.enum(['unit', 'integration', 'e2e']),
      testCount: z.number(),
      description: z.string(),
    })
  ),
  failingTests: z.number().describe('Number of failing tests (should be > 0)'),
  totalTests: z.number(),
  coverageTargets: z.array(z.string()).describe('Files/functions targeted for coverage'),
})

export type TestsAgentInput = z.infer<typeof TestsAgentInputSchema>
export type TestsAgentOutput = z.infer<typeof TestsAgentOutputSchema>

// Implementation Agent (30)
// ------------------------
export const ImplAgentInputSchema = z.object({
  issueNumber: z.number(),
  specPath: z.string(),
  testFiles: z.array(z.string()),
  featureFlags: z
    .array(
      z.object({
        name: z.string(),
        defaultValue: z.boolean(),
        description: z.string(),
      })
    )
    .optional(),
})

export const ImplAgentOutputSchema = z.object({
  success: z.boolean(),
  changedFiles: z.array(FileChangeSchema),
  featureFlags: z
    .array(
      z.object({
        name: z.string(),
        envVar: z.string(),
        defaultValue: z.boolean(),
        description: z.string(),
      })
    )
    .optional(),
  passingTests: z.number(),
  totalTests: z.number(),
  breakingChanges: z.boolean(),
  backwardCompatible: z.boolean(),
  rollbackStrategy: z.string(),
})

export type ImplAgentInput = z.infer<typeof ImplAgentInputSchema>
export type ImplAgentOutput = z.infer<typeof ImplAgentOutputSchema>

// QA Agent (40)
// ------------
export const QAAgentInputSchema = z.object({
  issueNumber: z.number(),
  changedFiles: z.array(z.string()),
  changedRoutes: z.array(z.string()).optional(),
  accessibilityThreshold: z.number().default(95),
})

export const QAAgentOutputSchema = z.object({
  success: z.boolean(),
  accessibilityScore: z.number().min(0).max(100),
  accessibilityViolations: z.array(
    z.object({
      rule: z.string(),
      severity: z.enum(['critical', 'serious', 'moderate', 'minor']),
      description: z.string(),
      element: z.string().optional(),
    })
  ),
  visualRegressions: z.array(z.string()).default([]),
  keyboardNavigation: z.boolean(),
  testResults: z.array(TestResultSchema),
  recommendations: z.array(z.string()).optional(),
})

export type QAAgentInput = z.infer<typeof QAAgentInputSchema>
export type QAAgentOutput = z.infer<typeof QAAgentOutputSchema>

// Security Agent (50)
// ------------------
export const SecAgentInputSchema = z.object({
  issueNumber: z.number(),
  changedFiles: z.array(z.string()),
  performanceBudgets: z
    .object({
      maxApiResponseTime: z.number().default(200),
      maxBundleSize: z.number().default(250),
    })
    .optional(),
})

export const SecAgentOutputSchema = z.object({
  success: z.boolean(),
  securityChecks: z.array(QualityCheckSchema),
  vulnerabilities: z.array(
    z.object({
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      package: z.string(),
      vulnerability: z.string(),
      fixAvailable: z.boolean(),
    })
  ),
  lintResults: QualityCheckSchema,
  typeCheckResults: QualityCheckSchema,
  performanceResults: z.object({
    apiResponseTimes: z.array(
      z.object({
        endpoint: z.string(),
        avgTime: z.number(),
        passed: z.boolean(),
      })
    ),
    bundleSize: z
      .object({
        size: z.number(),
        passed: z.boolean(),
      })
      .optional(),
  }),
  secretsFound: z.array(z.string()).default([]),
})

export type SecAgentInput = z.infer<typeof SecAgentInputSchema>
export type SecAgentOutput = z.infer<typeof SecAgentOutputSchema>

// Documentation Agent (60)
// -----------------------
export const DocsAgentInputSchema = z.object({
  issueNumber: z.number(),
  specPath: z.string(),
  changedFiles: z.array(z.string()),
  executionLog: z
    .array(
      z.object({
        phase: z.string(),
        status: z.string(),
        timestamp: z.string(),
      })
    )
    .optional(),
})

export const DocsAgentOutputSchema = z.object({
  success: z.boolean(),
  documentationFiles: z.array(
    z.object({
      path: z.string(),
      type: z.enum(['spec', 'adr', 'changelog', 'readme', 'api']),
      description: z.string(),
    })
  ),
  changelogEntry: z.string(),
  adrCreated: z.boolean(),
  apiDocsUpdated: z.boolean(),
})

export type DocsAgentInput = z.infer<typeof DocsAgentInputSchema>
export type DocsAgentOutput = z.infer<typeof DocsAgentOutputSchema>

// Release Agent (70)
// -----------------
export const ReleaseAgentInputSchema = z.object({
  issueNumber: z.number(),
  mode: z.enum(['create-pr', 'merge-cleanup']),
  testResults: z.array(QualityCheckSchema).optional(),
  prUrl: z.string().optional(),
})

export const ReleaseAgentOutputSchema = z.object({
  success: z.boolean(),
  branchName: z.string().optional(),
  prUrl: z.string().optional(),
  commitHash: z.string().optional(),
  tag: z.string().optional(),
  deploymentUrl: z.string().optional(),
  ciStatus: z.enum(['pending', 'running', 'passed', 'failed']).optional(),
})

export type ReleaseAgentInput = z.infer<typeof ReleaseAgentInputSchema>
export type ReleaseAgentOutput = z.infer<typeof ReleaseAgentOutputSchema>

// ============================================================================
// Agent Registry
// ============================================================================

export const AGENT_SCHEMAS = {
  spec: {
    input: SpecAgentInputSchema,
    output: SpecAgentOutputSchema,
  },
  tests: {
    input: TestsAgentInputSchema,
    output: TestsAgentOutputSchema,
  },
  impl: {
    input: ImplAgentInputSchema,
    output: ImplAgentOutputSchema,
  },
  qa: {
    input: QAAgentInputSchema,
    output: QAAgentOutputSchema,
  },
  sec: {
    input: SecAgentInputSchema,
    output: SecAgentOutputSchema,
  },
  docs: {
    input: DocsAgentInputSchema,
    output: DocsAgentOutputSchema,
  },
  release: {
    input: ReleaseAgentInputSchema,
    output: ReleaseAgentOutputSchema,
  },
} as const

export type AgentName = keyof typeof AGENT_SCHEMAS

// ============================================================================
// Tool Interface Helpers
// ============================================================================

/**
 * Validates agent input against schema
 * @throws {z.ZodError} if validation fails
 */
export function validateAgentInput<T extends AgentName>(
  agentName: T,
  input: unknown
): z.infer<(typeof AGENT_SCHEMAS)[T]['input']> {
  return AGENT_SCHEMAS[agentName].input.parse(input)
}

/**
 * Validates agent output against schema
 * @throws {z.ZodError} if validation fails
 */
export function validateAgentOutput<T extends AgentName>(
  agentName: T,
  output: unknown
): z.infer<(typeof AGENT_SCHEMAS)[T]['output']> {
  return AGENT_SCHEMAS[agentName].output.parse(output)
}

/**
 * Type-safe agent invocation wrapper
 */
export type AgentInvocation<T extends AgentName> = {
  agent: T
  input: z.infer<(typeof AGENT_SCHEMAS)[T]['input']>
  timeout?: number
  retries?: number
}

/**
 * Type-safe agent result wrapper
 */
export type AgentResult<T extends AgentName> = {
  agent: T
  success: boolean
  output: z.infer<(typeof AGENT_SCHEMAS)[T]['output']>
  duration: number
  errors?: string[]
}
