/**
 * Claude Agent Executor
 * Real agent delegation using Claude API
 * Based on Anthropic best practices for building effective agents
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import {
  AgentName,
  AgentInvocation,
  AgentResult,
  validateAgentInput,
  validateAgentOutput,
  AGENT_SCHEMAS,
} from './agent-tool-schemas'

// ============================================================================
// Configuration
// ============================================================================

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10)
const TEMPERATURE = parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')

// Agent prompt file paths
const AGENT_PROMPTS: Record<AgentName, string> = {
  spec: './agents/10-spec.prompt.md',
  tests: './agents/20-tests.prompt.md',
  impl: './agents/30-impl.prompt.md',
  qa: './agents/40-qa.prompt.md',
  sec: './agents/50-sec.prompt.md',
  docs: './agents/60-docs.prompt.md',
  release: './agents/70-release.prompt.md',
}

// ============================================================================
// Context Management (Following Anthropic Best Practices)
// ============================================================================

/**
 * Compact context by summarizing conversation history
 * Implements Anthropic's context compaction recommendation
 */
function compactContext(messages: Anthropic.Messages.MessageParam[]): Anthropic.Messages.MessageParam[] {
  if (messages.length <= 4) return messages

  // Keep first message (system context) and last 2 messages
  const systemMessage = messages[0]
  const recentMessages = messages.slice(-2)

  // Summarize middle messages
  const middleMessages = messages.slice(1, -2)
  const summary = {
    role: 'user' as const,
    content: `[Context Summary: ${middleMessages.length} previous exchanges covered specification analysis, test planning, and implementation details. Key decisions documented in spec file.]`,
  }

  return [systemMessage, summary, ...recentMessages]
}

/**
 * Extract minimal context from input
 * "Find the smallest set of high-signal tokens"
 */
function extractMinimalContext<T extends AgentName>(
  agentName: T,
  input: AgentInvocation<T>['input']
): string {
  switch (agentName) {
    case 'spec':
      return `Issue #${input.issueNumber}: ${input.issueTitle}\n\nPriority: ${input.priority}\n\nDescription:\n${input.issueBody}`

    case 'tests':
      return `Issue #${input.issueNumber}\nSpec: ${input.specPath}\nTest Matrix: ${JSON.stringify(input.testMatrix)}`

    case 'impl':
      return `Issue #${input.issueNumber}\nSpec: ${input.specPath}\nTest Files: ${input.testFiles.join(', ')}`

    case 'qa':
      return `Issue #${input.issueNumber}\nChanged Files: ${input.changedFiles.join(', ')}\nRoutes: ${input.changedRoutes?.join(', ') || 'N/A'}`

    case 'sec':
      return `Issue #${input.issueNumber}\nChanged Files: ${input.changedFiles.join(', ')}`

    case 'docs':
      return `Issue #${input.issueNumber}\nSpec: ${input.specPath}\nChanged Files: ${input.changedFiles.join(', ')}`

    case 'release':
      return `Issue #${input.issueNumber}\nMode: ${input.mode}\nPR: ${input.prUrl || 'N/A'}`

    default:
      return JSON.stringify(input, null, 2)
  }
}

// ============================================================================
// Agent Executor
// ============================================================================

export class ClaudeAgentExecutor {
  private client: Anthropic
  private conversationHistory: Map<string, Anthropic.Messages.MessageParam[]> = new Map()

  constructor() {
    if (!CLAUDE_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable required. ' +
          'Get your API key from https://console.anthropic.com/'
      )
    }

    this.client = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    })
  }

  /**
   * Load agent system prompt from markdown file
   */
  private loadAgentPrompt(agentName: AgentName): string {
    const promptPath = path.resolve(AGENT_PROMPTS[agentName])

    if (!fs.existsSync(promptPath)) {
      throw new Error(`Agent prompt file not found: ${promptPath}`)
    }

    return fs.readFileSync(promptPath, 'utf-8')
  }

  /**
   * Build tool definition for structured output
   * Implements Anthropic's tool-use best practices
   */
  private buildToolDefinition<T extends AgentName>(
    agentName: T
  ): Anthropic.Messages.Tool {
    const schema = AGENT_SCHEMAS[agentName].output

    // Convert Zod schema to JSON Schema for Claude
    const jsonSchema = this.zodToJsonSchema(schema)

    return {
      name: `${agentName}_output`,
      description: `Structured output for ${agentName} agent`,
      input_schema: jsonSchema,
    }
  }

  /**
   * Convert Zod schema to JSON Schema
   * Simplified conversion for common types
   */
  private zodToJsonSchema(schema: any): any {
    // This is a simplified version
    // In production, use a library like zod-to-json-schema
    return {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        // Additional properties would be extracted from Zod schema
      },
      required: ['success'],
    }
  }

  /**
   * Execute agent with validated input/output
   * Implements: Augmented LLM pattern with tools + context management
   */
  async execute<T extends AgentName>(
    invocation: AgentInvocation<T>
  ): Promise<AgentResult<T>> {
    const startTime = Date.now()
    const { agent, input, timeout = 120000, retries = 2 } = invocation

    try {
      // Validate input against schema
      const validatedInput = validateAgentInput(agent, input)

      // Load agent system prompt
      const systemPrompt = this.loadAgentPrompt(agent)

      // Extract minimal context
      const minimalContext = extractMinimalContext(agent, validatedInput)

      // Build user message with context and instructions
      const userMessage = `${minimalContext}

INSTRUCTIONS:
${this.getAgentInstructions(agent)}

INPUT SCHEMA:
${JSON.stringify(AGENT_SCHEMAS[agent].input.shape, null, 2)}

REQUIRED OUTPUT SCHEMA:
${JSON.stringify(AGENT_SCHEMAS[agent].output.shape, null, 2)}

Please analyze the input and return a structured JSON response matching the output schema.`

      // Get or create conversation history
      const conversationKey = `${agent}-${(validatedInput as any).issueNumber || 'default'}`
      const history = this.conversationHistory.get(conversationKey) || []

      // Build messages array
      const messages: Anthropic.Messages.MessageParam[] = [
        ...history,
        {
          role: 'user',
          content: userMessage,
        },
      ]

      // Compact context if too long
      const compactedMessages = compactContext(messages)

      // Execute Claude API call
      const response = await this.client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: compactedMessages,
      })

      // Extract response content
      const content = response.content[0]
      let outputData: any

      if (content.type === 'text') {
        // Parse JSON from text response
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) ||
                         content.text.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          outputData = JSON.parse(jsonMatch[1] || jsonMatch[0])
        } else {
          throw new Error('No JSON output found in response')
        }
      } else {
        throw new Error('Unexpected response type')
      }

      // Validate output against schema
      const validatedOutput = validateAgentOutput(agent, outputData)

      // Update conversation history
      compactedMessages.push({
        role: 'assistant',
        content: JSON.stringify(validatedOutput, null, 2),
      })
      this.conversationHistory.set(conversationKey, compactedMessages)

      const duration = Date.now() - startTime

      return {
        agent,
        success: validatedOutput.success,
        output: validatedOutput,
        duration,
      }
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Retry logic
      if (retries > 0) {
        console.warn(`Agent ${agent} failed, retrying... (${retries} retries left)`)
        return this.execute({
          ...invocation,
          retries: retries - 1,
        })
      }

      return {
        agent,
        success: false,
        output: this.getFailureOutput(agent, error.message),
        duration,
        errors: [error.message],
      }
    }
  }

  /**
   * Get agent-specific instructions
   */
  private getAgentInstructions(agent: AgentName): string {
    const instructions: Record<AgentName, string> = {
      spec: 'Analyze the issue and create a comprehensive specification document.',
      tests: 'Create failing tests based on the specification. Tests should be comprehensive and cover edge cases.',
      impl: 'Implement minimal code changes to make the tests pass. Use feature flags for risky changes.',
      qa: 'Run accessibility checks, visual regression tests, and keyboard navigation validation.',
      sec: 'Perform security audit, dependency scanning, linting, type checking, and performance validation.',
      docs: 'Generate documentation including spec, ADR, changelog, and API docs.',
      release: 'Handle branch creation, PR management, merge strategy, and deployment.',
    }

    return instructions[agent]
  }

  /**
   * Generate failure output matching schema
   */
  private getFailureOutput<T extends AgentName>(agent: T, errorMessage: string): any {
    const baseFailure = { success: false }

    switch (agent) {
      case 'spec':
        return {
          ...baseFailure,
          specPath: '',
          problemStatement: `Error: ${errorMessage}`,
          scope: [],
          outOfScope: [],
          acceptanceCriteria: [],
          risks: [],
          testMatrix: { unit: 0, integration: 0, e2e: 0 },
          qualityBudgets: {
            accessibility: 'N/A',
            performance: 'N/A',
            security: 'N/A',
          },
          filesToModify: [],
          estimatedComplexity: 'Low' as const,
        }

      default:
        return baseFailure
    }
  }

  /**
   * Clear conversation history for agent
   */
  clearHistory(agent: AgentName, issueNumber?: number): void {
    const pattern = issueNumber ? `${agent}-${issueNumber}` : `${agent}-`
    for (const key of this.conversationHistory.keys()) {
      if (key.startsWith(pattern)) {
        this.conversationHistory.delete(key)
      }
    }
  }

  /**
   * Execute multiple agents in parallel
   * Implements Anthropic's parallelization pattern
   */
  async executeParallel<T extends AgentName>(
    invocations: AgentInvocation<T>[]
  ): Promise<AgentResult<T>[]> {
    return Promise.all(invocations.map((inv) => this.execute(inv)))
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const claudeAgentExecutor = new ClaudeAgentExecutor()
