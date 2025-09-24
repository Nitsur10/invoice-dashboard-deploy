#!/usr/bin/env node

/**
 * Agent Validation Utility
 * Validates agent prompt files for consistency and completeness
 */

const fs = require('fs')
const path = require('path')

class AgentValidator {
  constructor() {
    this.agents = [
      '00-orchestrator.prompt.md',
      '10-spec.prompt.md',
      '20-tests.prompt.md',
      '30-impl.prompt.md',
      '40-qa.prompt.md',
      '50-sec.prompt.md',
      '60-docs.prompt.md',
      '70-release.prompt.md'
    ]

    this.requiredSections = {
      'orchestrator': ['SYSTEM ROLE', 'EXECUTION FLOW', 'SUB-AGENTS COORDINATION', 'POLICIES & CONSTRAINTS'],
      'spec': ['ROLE', 'INPUT', 'OUTPUT', 'RULES', 'DETAILED BEHAVIOR'],
      'tests': ['ROLE', 'GOAL', 'UNIT', 'INTEGRATION', 'E2E', 'BUDGETS'],
      'impl': ['ROLE', 'STRATEGY', 'NO', 'YES', 'DETAILED BEHAVIOR'],
      'qa': ['ROLE', 'A11Y', 'VISUAL', 'DETAILED BEHAVIOR'],
      'sec': ['ROLE', 'CHECKS', 'OUTPUT', 'DETAILED BEHAVIOR'],
      'docs': ['ROLE', 'FILES', 'PR', 'DETAILED BEHAVIOR'],
      'release': ['ROLE', 'BRANCH', 'PR', 'MERGE', 'ROLLOUT']
    }
  }

  /**
   * Validate all agent files
   */
  validateAll() {
    console.log('🔍 Validating agent system...\n')

    const results = {
      passed: 0,
      failed: 0,
      errors: []
    }

    for (const agentFile of this.agents) {
      const agentPath = path.join(__dirname, '..', agentFile)
      const agentName = this.getAgentName(agentFile)

      try {
        const validation = this.validateAgent(agentPath, agentName)

        if (validation.valid) {
          console.log(`✅ ${agentFile}: VALID`)
          results.passed++
        } else {
          console.log(`❌ ${agentFile}: INVALID`)
          validation.errors.forEach(error => {
            console.log(`   - ${error}`)
            results.errors.push(`${agentFile}: ${error}`)
          })
          results.failed++
        }
      } catch (error) {
        console.log(`💥 ${agentFile}: ERROR - ${error.message}`)
        results.failed++
        results.errors.push(`${agentFile}: ${error.message}`)
      }
    }

    console.log(`\n📊 Validation Summary:`)
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`📁 Total: ${this.agents.length}`)

    if (results.failed > 0) {
      console.log(`\n🚨 Errors found:`)
      results.errors.forEach(error => console.log(`   - ${error}`))
      process.exit(1)
    } else {
      console.log(`\n🎉 All agents valid!`)
    }

    return results
  }

  /**
   * Validate individual agent file
   */
  validateAgent(agentPath, agentName) {
    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent file not found: ${agentPath}`)
    }

    const content = fs.readFileSync(agentPath, 'utf8')
    const errors = []

    // Check file is not empty
    if (content.trim().length === 0) {
      errors.push('File is empty')
      return { valid: false, errors }
    }

    // Check required sections exist
    const requiredSections = this.requiredSections[agentName] || []
    for (const section of requiredSections) {
      if (!this.hasSection(content, section)) {
        errors.push(`Missing required section: ${section}`)
      }
    }

    // Check for ROLE definition
    if (!content.includes('## ROLE') && !content.includes('SYSTEM ROLE')) {
      errors.push('Missing ROLE definition')
    }

    // Validate markdown structure
    const markdownErrors = this.validateMarkdown(content)
    errors.push(...markdownErrors)

    // Check for agent-specific validations
    const specificErrors = this.validateAgentSpecific(agentName, content)
    errors.push(...specificErrors)

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if content has required section
   */
  hasSection(content, sectionName) {
    const patterns = [
      new RegExp(`^## ${sectionName}`, 'm'),
      new RegExp(`^### ${sectionName}`, 'm'),
      new RegExp(`\\*\\*${sectionName}\\*\\*`, 'i')
    ]

    return patterns.some(pattern => pattern.test(content))
  }

  /**
   * Validate markdown structure
   */
  validateMarkdown(content) {
    const errors = []

    // Check for proper heading structure
    const headings = content.match(/^#{1,6}\s+.+$/gm) || []
    if (headings.length === 0) {
      errors.push('No headings found - ensure proper markdown structure')
    }

    // Check for code blocks are properly closed
    const codeBlockCount = (content.match(/```/g) || []).length
    if (codeBlockCount % 2 !== 0) {
      errors.push('Unclosed code block detected')
    }

    // Check for proper list formatting
    const listItems = content.match(/^[\s]*[-*+]\s+/gm) || []
    const numberedItems = content.match(/^[\s]*\d+\.\s+/gm) || []

    if (listItems.length === 0 && numberedItems.length === 0) {
      // Not necessarily an error, but worth noting
    }

    return errors
  }

  /**
   * Agent-specific validation rules
   */
  validateAgentSpecific(agentName, content) {
    const errors = []

    switch (agentName) {
      case 'orchestrator':
        if (!content.includes('TOKEN:')) {
          errors.push('Missing token-based execution flow')
        }
        if (!content.includes('PLAN → APPLY → TEST → PR → MERGE')) {
          errors.push('Missing standard execution sequence')
        }
        break

      case 'spec':
        if (!content.includes('docs/specs/ISSUE-')) {
          errors.push('Missing specification output path pattern')
        }
        break

      case 'tests':
        if (!content.includes('*.test.ts')) {
          errors.push('Missing unit test file pattern')
        }
        if (!content.includes('coverage not lower')) {
          errors.push('Missing coverage requirement')
        }
        break

      case 'impl':
        if (!content.includes('feature flags')) {
          errors.push('Missing feature flag guidance')
        }
        break

      case 'qa':
        if (!content.includes('axe score')) {
          errors.push('Missing accessibility score requirement')
        }
        break

      case 'sec':
        if (!content.includes('eslint') && !content.includes('lint')) {
          errors.push('Missing linting check')
        }
        if (!content.includes('audit')) {
          errors.push('Missing dependency audit')
        }
        break

      case 'docs':
        if (!content.includes('CHANGELOG.md')) {
          errors.push('Missing changelog update requirement')
        }
        break

      case 'release':
        if (!content.includes('Conventional Commit')) {
          errors.push('Missing conventional commit requirement')
        }
        if (!content.includes('squash')) {
          errors.push('Missing squash merge strategy')
        }
        break
    }

    return errors
  }

  /**
   * Extract agent name from filename
   */
  getAgentName(filename) {
    const match = filename.match(/\d+-([^.]+)\.prompt\.md/)
    if (match) {
      return match[1]
    }

    if (filename.includes('orchestrator')) {
      return 'orchestrator'
    }

    return 'unknown'
  }

  /**
   * Generate integration test
   */
  generateIntegrationTest() {
    console.log('\n🔗 Validating agent integration...')

    // Check that orchestrator references all sub-agents
    const orchestratorPath = path.join(__dirname, '..', '00-orchestrator.prompt.md')
    const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf8')

    const expectedAgents = ['spec', 'tests', 'impl', 'qa', 'sec', 'docs', 'release']
    const missingReferences = expectedAgents.filter(agent =>
      !orchestratorContent.includes(`\`${agent}\``) &&
      !orchestratorContent.includes(`${agent} agent`)
    )

    if (missingReferences.length > 0) {
      console.log(`⚠️  Orchestrator missing references to: ${missingReferences.join(', ')}`)
    } else {
      console.log(`✅ Orchestrator properly references all sub-agents`)
    }

    // Check token flow consistency
    const tokens = ['PLAN', 'APPLY', 'TEST', 'PR', 'MERGE']
    const missingTokens = tokens.filter(token => !orchestratorContent.includes(`TOKEN: ${token}`))

    if (missingTokens.length > 0) {
      console.log(`⚠️  Missing token definitions: ${missingTokens.join(', ')}`)
    } else {
      console.log(`✅ All execution tokens properly defined`)
    }
  }
}

// CLI interface
if (require.main === module) {
  const validator = new AgentValidator()

  const [,, command] = process.argv

  switch (command) {
    case 'integration':
      validator.generateIntegrationTest()
      break
    case 'all':
    default:
      validator.validateAll()
      validator.generateIntegrationTest()
      break
  }
}

module.exports = AgentValidator