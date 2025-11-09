# Claude Code Skills

This directory contains specialized skills for Claude Code to help maintain consistency and best practices in the project.

## Available Skills

### 1. Git Management (`git.md`)

**Purpose:** Enforces git workflow standards, branch naming conventions, commit message format, and PR structure.

**When to invoke:**
- Starting a new feature/issue
- Creating commits
- Preparing pull requests
- Checking git status
- Merging and cleanup operations

**Key capabilities:**
- Branch naming: `{issue-number}-{descriptive-name}`
- Conventional commits: `feat:`, `fix:`, `chore:` with issue references
- PR body generation with required sections
- CHANGELOG.md maintenance
- Integration with issue documentation structure

**Usage:**
Simply ask Claude Code about git operations, and the skill will automatically apply project standards.

**Examples:**
- "Create a branch for issue 015"
- "Commit these changes with proper message"
- "Create a PR for the current branch"
- "What's the git status?"
- "Help me merge this PR"

## How Skills Work

Skills are markdown files that provide Claude Code with specialized knowledge and workflows for specific domains. When invoked, Claude will:

1. Load the skill's instructions
2. Apply domain-specific standards
3. Guide you through workflows
4. Enforce best practices
5. Generate consistent outputs

## Adding New Skills

To add a new skill:

1. Create a `.md` file in this directory
2. Structure it with clear sections and examples
3. Include common scenarios and error handling
4. Reference project-specific patterns
5. Update this README

## Skill Development Guidelines

**Good skills have:**
- ✅ Clear purpose statement
- ✅ Concrete examples from the project
- ✅ Step-by-step workflows
- ✅ Quick reference sections
- ✅ Common scenarios and solutions
- ✅ Integration with existing tools

**Avoid:**
- ❌ Generic advice not specific to this project
- ❌ Vague instructions
- ❌ Missing examples
- ❌ Outdated patterns

## Project Context

This is the **Invoice Dashboard Deploy** repository, a Next.js 15 application with:
- Supabase backend
- Multi-agent orchestration system
- Comprehensive testing with Playwright
- Issue-driven development workflow
- Conventional commits and semantic versioning

Skills should align with these architectural decisions and maintain consistency with established patterns.
