// Observability budget system
export interface PerformanceBudget {
  endpoint: string
  budgetMs: number
  breachCount: number
  lastBreach?: string
  status: 'OK' | 'Over Budget'
}

export interface BudgetConfig {
  [key: string]: number
}

// Budget thresholds in milliseconds
export const budgets: BudgetConfig = {
  '/api/stats': 400,
  '/api/invoices': 600,
  '/api/outstanding': 500,
}

// In-memory storage for budget tracking (in production, use Redis/database)
const budgetStore = new Map<string, PerformanceBudget>()

// Initialize budgets
Object.keys(budgets).forEach(endpoint => {
  budgetStore.set(endpoint, {
    endpoint,
    budgetMs: budgets[endpoint],
    breachCount: 0,
    status: 'OK'
  })
})

export function trackAPIPerformance(endpoint: string, duration: number): void {
  const budget = budgetStore.get(endpoint)
  if (!budget) return

  if (duration > budget.budgetMs) {
    budget.breachCount++
    budget.lastBreach = new Date().toISOString()
    budget.status = 'Over Budget'
    
    // Log budget breach
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ [Budget Breach] ${endpoint} took ${duration}ms (budget: ${budget.budgetMs}ms)`)
    }
  }

  budgetStore.set(endpoint, budget)
}

export function getBudgetStatus(): PerformanceBudget[] {
  return Array.from(budgetStore.values()).sort((a, b) => a.endpoint.localeCompare(b.endpoint))
}

export function resetBudgetCounters(): void {
  budgetStore.forEach((budget, endpoint) => {
    budget.breachCount = 0
    budget.status = 'OK'
    budget.lastBreach = undefined
    budgetStore.set(endpoint, budget)
  })
}

// Utility to format duration with color coding
export function formatDuration(duration: number, budget: number): {
  duration: string
  status: 'good' | 'warning' | 'error'
} {
  const ratio = duration / budget
  
  if (ratio <= 0.7) {
    return { duration: `${duration}ms`, status: 'good' }
  } else if (ratio <= 1.0) {
    return { duration: `${duration}ms`, status: 'warning' }
  } else {
    return { duration: `${duration}ms`, status: 'error' }
  }
}