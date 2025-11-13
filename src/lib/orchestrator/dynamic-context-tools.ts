/**
 * Dynamic Context Retrieval Tools
 * Implements Anthropic's recommendation for autonomous information gathering
 * - Just-in-time context strategies
 * - Metadata and filesystem signals
 * - Autonomous exploration
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

export interface FileMetadata {
  path: string
  size: number
  lastModified: Date
  extension: string
  relatedFiles?: string[]
}

export interface CodeSymbol {
  name: string
  type: 'function' | 'class' | 'interface' | 'type' | 'const'
  file: string
  line: number
  signature?: string
}

export interface DependencyInfo {
  package: string
  version: string
  usedIn: string[]
  isDevDependency: boolean
}

/**
 * Dynamic File Explorer
 * Allows agents to discover relevant files autonomously
 */
export class DynamicFileExplorer {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * Search for files by pattern
   */
  async findFiles(pattern: string, options?: { limit?: number }): Promise<FileMetadata[]> {
    try {
      const files = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
      })

      const metadata: FileMetadata[] = []

      for (const file of files.slice(0, options?.limit || 50)) {
        const fullPath = path.join(this.projectRoot, file)
        const stats = fs.statSync(fullPath)

        metadata.push({
          path: file,
          size: stats.size,
          lastModified: stats.mtime,
          extension: path.extname(file),
        })
      }

      return metadata.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    } catch (error) {
      console.error('File search failed:', error)
      return []
    }
  }

  /**
   * Find files related to a specific file
   * Uses naming conventions and import analysis
   */
  async findRelatedFiles(filePath: string): Promise<FileMetadata[]> {
    const relatedFiles: FileMetadata[] = []

    // Find test files
    const baseName = path.basename(filePath, path.extname(filePath))
    const dir = path.dirname(filePath)

    const testPatterns = [
      `${dir}/__tests__/${baseName}.test.{ts,tsx,js,jsx}`,
      `${dir}/${baseName}.test.{ts,tsx,js,jsx}`,
      `${dir}/${baseName}.spec.{ts,tsx,js,jsx}`,
    ]

    for (const pattern of testPatterns) {
      const tests = await this.findFiles(pattern, { limit: 5 })
      relatedFiles.push(...tests)
    }

    // Find files with similar names
    const similarPattern = `**/${baseName}*.{ts,tsx,js,jsx}`
    const similar = await this.findFiles(similarPattern, { limit: 10 })
    relatedFiles.push(...similar.filter((f) => f.path !== filePath))

    return relatedFiles
  }

  /**
   * Get file statistics for a directory
   */
  async getDirectoryStats(dirPath: string): Promise<{
    totalFiles: number
    totalSize: number
    filesByExtension: Record<string, number>
    recentlyModified: FileMetadata[]
  }> {
    const files = await this.findFiles(`${dirPath}/**/*`, { limit: 1000 })

    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      filesByExtension: {} as Record<string, number>,
      recentlyModified: files.slice(0, 10),
    }

    for (const file of files) {
      const ext = file.extension || 'no-extension'
      stats.filesByExtension[ext] = (stats.filesByExtension[ext] || 0) + 1
    }

    return stats
  }
}

/**
 * Code Symbol Analyzer
 * Extracts functions, classes, types from codebase
 */
export class CodeSymbolAnalyzer {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * Find symbol by name
   * Simplified version - production would use TypeScript compiler API
   */
  async findSymbol(symbolName: string, filePattern?: string): Promise<CodeSymbol[]> {
    const pattern = filePattern || '**/*.{ts,tsx,js,jsx}'
    const explorer = new DynamicFileExplorer(this.projectRoot)
    const files = await explorer.findFiles(pattern, { limit: 100 })

    const symbols: CodeSymbol[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.projectRoot, file.path),
          'utf-8'
        )
        const lines = content.split('\n')

        // Simple regex-based search (production would use AST)
        const patterns = {
          function: new RegExp(`function\\s+${symbolName}\\s*\\(`),
          class: new RegExp(`class\\s+${symbolName}\\s*[{<]`),
          interface: new RegExp(`interface\\s+${symbolName}\\s*[{<]`),
          type: new RegExp(`type\\s+${symbolName}\\s*=`),
          const: new RegExp(`const\\s+${symbolName}\\s*[=:]`),
        }

        for (let i = 0; i < lines.length; i++) {
          for (const [type, pattern] of Object.entries(patterns)) {
            if (pattern.test(lines[i])) {
              symbols.push({
                name: symbolName,
                type: type as CodeSymbol['type'],
                file: file.path,
                line: i + 1,
                signature: lines[i].trim(),
              })
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue
      }
    }

    return symbols
  }

  /**
   * Get all exports from a file
   */
  async getFileExports(filePath: string): Promise<CodeSymbol[]> {
    const fullPath = path.join(this.projectRoot, filePath)

    if (!fs.existsSync(fullPath)) {
      return []
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    const exports: CodeSymbol[] = []

    // Find export statements
    const exportPattern = /export\s+(?:async\s+)?(function|class|interface|type|const)\s+(\w+)/

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(exportPattern)
      if (match) {
        exports.push({
          name: match[2],
          type: match[1] as CodeSymbol['type'],
          file: filePath,
          line: i + 1,
          signature: lines[i].trim(),
        })
      }
    }

    return exports
  }

  /**
   * Find usages of a symbol
   */
  async findUsages(symbolName: string, filePattern?: string): Promise<Array<{
    file: string
    line: number
    context: string
  }>> {
    const pattern = filePattern || '**/*.{ts,tsx,js,jsx}'
    const explorer = new DynamicFileExplorer(this.projectRoot)
    const files = await explorer.findFiles(pattern, { limit: 100 })

    const usages: Array<{ file: string; line: number; context: string }> = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.projectRoot, file.path),
          'utf-8'
        )
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(symbolName)) {
            usages.push({
              file: file.path,
              line: i + 1,
              context: lines[i].trim(),
            })
          }
        }
      } catch (error) {
        continue
      }
    }

    return usages.slice(0, 50) // Limit results
  }
}

/**
 * Dependency Inspector
 * Analyzes package.json and node_modules
 */
export class DependencyInspector {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * Get all dependencies
   */
  getDependencies(): {
    production: DependencyInfo[]
    development: DependencyInfo[]
  } {
    const packageJsonPath = path.join(this.projectRoot, 'package.json')

    if (!fs.existsSync(packageJsonPath)) {
      return { production: [], development: [] }
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    const production = Object.entries(packageJson.dependencies || {}).map(
      ([pkg, version]) => ({
        package: pkg,
        version: version as string,
        usedIn: [],
        isDevDependency: false,
      })
    )

    const development = Object.entries(packageJson.devDependencies || {}).map(
      ([pkg, version]) => ({
        package: pkg,
        version: version as string,
        usedIn: [],
        isDevDependency: true,
      })
    )

    return { production, development }
  }

  /**
   * Find where a dependency is used
   */
  async findDependencyUsage(packageName: string): Promise<string[]> {
    const explorer = new DynamicFileExplorer(this.projectRoot)
    const files = await explorer.findFiles('**/*.{ts,tsx,js,jsx}', { limit: 200 })

    const usages: string[] = []

    for (const file of files) {
      try {
        const content = fs.readFileSync(
          path.join(this.projectRoot, file.path),
          'utf-8'
        )

        // Check for imports
        const importPatterns = [
          new RegExp(`from\\s+['"]${packageName}['"]`),
          new RegExp(`require\\(['"]${packageName}['"]\\)`),
        ]

        if (importPatterns.some((p) => p.test(content))) {
          usages.push(file.path)
        }
      } catch (error) {
        continue
      }
    }

    return usages
  }

  /**
   * Check for outdated dependencies
   */
  async checkOutdated(): Promise<Array<{
    package: string
    current: string
    latest: string
  }>> {
    // In production, would call npm outdated or similar
    // Returning placeholder for now
    return []
  }
}

/**
 * Test Coverage Analyzer
 * Identifies untested code
 */
export class TestCoverageAnalyzer {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * Find files without tests
   */
  async findUntestedFiles(sourcePattern: string = 'src/**/*.{ts,tsx}'): Promise<string[]> {
    const explorer = new DynamicFileExplorer(this.projectRoot)
    const sourceFiles = await explorer.findFiles(sourcePattern)

    const untestedFiles: string[] = []

    for (const file of sourceFiles) {
      const baseName = path.basename(file.path, path.extname(file.path))
      const dir = path.dirname(file.path)

      // Check for corresponding test file
      const testPatterns = [
        `${dir}/__tests__/${baseName}.test.*`,
        `${dir}/${baseName}.test.*`,
        `${dir}/${baseName}.spec.*`,
      ]

      let hasTest = false
      for (const pattern of testPatterns) {
        const tests = await explorer.findFiles(pattern)
        if (tests.length > 0) {
          hasTest = true
          break
        }
      }

      if (!hasTest) {
        untestedFiles.push(file.path)
      }
    }

    return untestedFiles
  }

  /**
   * Suggest test files to create
   */
  async suggestTestFiles(filePath: string): Promise<string[]> {
    const baseName = path.basename(filePath, path.extname(filePath))
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)

    return [
      `${dir}/__tests__/${baseName}.test${ext}`,
      `${dir}/${baseName}.test${ext}`,
    ]
  }
}

/**
 * Context Tool Registry
 * Central registry of all dynamic context retrieval tools
 */
export class ContextToolRegistry {
  private fileExplorer: DynamicFileExplorer
  private symbolAnalyzer: CodeSymbolAnalyzer
  private dependencyInspector: DependencyInspector
  private coverageAnalyzer: TestCoverageAnalyzer

  constructor(projectRoot: string = process.cwd()) {
    this.fileExplorer = new DynamicFileExplorer(projectRoot)
    this.symbolAnalyzer = new CodeSymbolAnalyzer(projectRoot)
    this.dependencyInspector = new DependencyInspector(projectRoot)
    this.coverageAnalyzer = new TestCoverageAnalyzer(projectRoot)
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): string[] {
    return [
      'findFiles',
      'findRelatedFiles',
      'findSymbol',
      'getFileExports',
      'findUsages',
      'getDependencies',
      'findDependencyUsage',
      'findUntestedFiles',
      'suggestTestFiles',
    ]
  }

  /**
   * Execute tool by name
   */
  async executeTool(toolName: string, args: any[]): Promise<any> {
    switch (toolName) {
      case 'findFiles':
        return this.fileExplorer.findFiles(...args)
      case 'findRelatedFiles':
        return this.fileExplorer.findRelatedFiles(...args)
      case 'findSymbol':
        return this.symbolAnalyzer.findSymbol(...args)
      case 'getFileExports':
        return this.symbolAnalyzer.getFileExports(...args)
      case 'findUsages':
        return this.symbolAnalyzer.findUsages(...args)
      case 'getDependencies':
        return this.dependencyInspector.getDependencies()
      case 'findDependencyUsage':
        return this.dependencyInspector.findDependencyUsage(...args)
      case 'findUntestedFiles':
        return this.coverageAnalyzer.findUntestedFiles(...args)
      case 'suggestTestFiles':
        return this.coverageAnalyzer.suggestTestFiles(...args)
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const contextToolRegistry = new ContextToolRegistry()
