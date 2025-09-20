"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useOrchestratorWorkflows } from '@/hooks/use-orchestrator-workflows'
import type { FeatureWorkflow, AgentStatus } from '@/lib/orchestrator'

const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-2.27.0.min.js'

type PlotlyHTMLElement = HTMLElement & { data?: unknown }

type PlotlyModule = {
  react: (
    element: PlotlyHTMLElement,
    data: Array<Record<string, unknown>>,
    layout: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<void>
  purge: (element: PlotlyHTMLElement) => void
}

const AGENT_COLORS: Record<string, string> = {
  Foundation: '#1FB8CD',
  Development: '#2E8B57',
  Quality: '#D2BA4C',
  Deployment: '#DB4545',
  'Cross-cutting': '#944454',
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#2E8B57',
  Complete: '#1FB8CD',
  Queued: '#5D878F',
  Waiting: '#D2BA4C',
  Error: '#DB4545',
}

declare global {
  interface Window {
    Plotly?: PlotlyModule
  }
}

function ensurePlotlyLoaded(): Promise<PlotlyModule> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Plotly requires a browser environment'))
  }

  if (window.Plotly) {
    return Promise.resolve(window.Plotly)
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PLOTLY_CDN}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        window.Plotly ? resolve(window.Plotly) : reject(new Error('Plotly failed to load'))
      })
      existing.addEventListener('error', () => reject(new Error('Failed to load Plotly CDN script')))
      return
    }

    const script = document.createElement('script')
    script.src = PLOTLY_CDN
    script.async = true
    script.onload = () => {
      window.Plotly ? resolve(window.Plotly) : reject(new Error('Plotly failed to load'))
    }
    script.onerror = () => reject(new Error('Failed to load Plotly CDN script'))
    document.head.appendChild(script)
  })
}

function agentCategory(agent: AgentStatus): keyof typeof AGENT_COLORS {
  const name = agent.name.toLowerCase()
  if (name.includes('baseline') || name.includes('schema') || name.includes('foundation')) {
    return 'Foundation'
  }
  if (name.includes('design') || name.includes('component') || name.includes('feature') || name.includes('api')) {
    return 'Development'
  }
  if (name.includes('test') || name.includes('quality')) {
    return 'Quality'
  }
  if (name.includes('deploy')) {
    return 'Deployment'
  }
  if (name.includes('doc') || name.includes('observ') || name.includes('perf') || name.includes('security')) {
    return 'Cross-cutting'
  }
  return 'Development'
}

interface PlotDefinition {
  data: Array<Record<string, unknown>>
  layout: Record<string, unknown>
}

function buildPlot(workflows: FeatureWorkflow[]): PlotDefinition {
  const shapes: Array<Record<string, unknown>> = []
  const annotations: Array<Record<string, unknown>> = []
  const traces: Array<Record<string, unknown>> = []

  let yPos = 0

  const addLegend = () => {
    for (const [category, color] of Object.entries(AGENT_COLORS)) {
      traces.push({
        x: [null],
        y: [null],
        mode: 'markers',
        marker: { size: 10, color },
        name: category,
        showlegend: true,
        type: 'scatter',
      })
    }
    for (const [status, color] of Object.entries(STATUS_COLORS)) {
      traces.push({
        x: [null],
        y: [null],
        mode: 'markers',
        marker: { size: 8, color, symbol: 'square' },
        name: `Status: ${status}`,
        showlegend: true,
        type: 'scatter',
      })
    }
  }

  workflows.forEach((workflow) => {
    const featureId = workflow.id
    const featureTitle = workflow.title

    // Feature header
    shapes.push({
      type: 'rect',
      x0: 0,
      x1: 120,
      y0: yPos - 0.4,
      y1: yPos + 0.4,
      fillcolor: '#13343B',
      line: { color: 'white', width: 1 },
    })

    annotations.push({
      x: 60,
      y: yPos,
      text: `<b>${featureId}</b> ${featureTitle}`,
      showarrow: false,
      font: { color: 'white', size: 14 },
      xanchor: 'center',
    })

    yPos -= 1

    workflow.agents.forEach((agent) => {
      const category = agentCategory(agent)
      const progress = agent.progress ?? 0
      const status = agent.status ?? 'Queued'
      const statusColor = STATUS_COLORS[status] ?? '#5D878F'

      shapes.push({
        type: 'rect',
        x0: 10,
        x1: 110,
        y0: yPos - 0.3,
        y1: yPos + 0.3,
        fillcolor: AGENT_COLORS[category],
        opacity: 0.3,
        line: { color: AGENT_COLORS[category], width: 2 },
      })

      if (progress > 0) {
        shapes.push({
          type: 'rect',
          x0: 70,
          x1: 70 + progress * 0.35,
          y0: yPos - 0.2,
          y1: yPos + 0.2,
          fillcolor: statusColor,
          line: { color: statusColor, width: 1 },
        })
      }

      const task = (agent.outputs?.length ?? 0) > 0 ? agent.outputs.join(', ') : 'Pending task'

      annotations.push({
        x: 15,
        y: yPos,
        text: `<b>${agent.name}</b><br>${task}<br>Status: ${status}`,
        showarrow: false,
        font: { size: 10 },
        xanchor: 'left',
        align: 'left',
      })

      annotations.push({
        x: 105,
        y: yPos,
        text: `${progress}%`,
        showarrow: false,
        font: { size: 10, color: statusColor },
        xanchor: 'right',
      })

      yPos -= 0.8
    })

    yPos -= 0.5
  })

  addLegend()

  const layout: Record<string, unknown> = {
    title: 'Agent Workflow Dashboard',
    xaxis: { range: [0, 180], showgrid: false, showticklabels: false, zeroline: false },
    yaxis: { range: [yPos - 1, 1], showgrid: false, showticklabels: false, zeroline: false },
    plot_bgcolor: 'white',
    shapes,
    annotations,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
    },
    margin: { t: 40, r: 20, b: 40, l: 20 },
  }

  return { data: traces, layout }
}

export function AgentWorkflowPlot() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [plotlyReady, setPlotlyReady] = useState(false)
  const { data: workflows, isLoading, isError } = useOrchestratorWorkflows()

  useEffect(() => {
    let mounted = true
    ensurePlotlyLoaded()
      .then(() => {
        if (mounted) {
          setPlotlyReady(true)
        }
      })
      .catch((error) => {
        console.error('Failed to load Plotly', error)
      })

    return () => {
      mounted = false
    }
  }, [])

  const figure = useMemo(() => {
    if (!workflows?.length) return null
    return buildPlot(workflows)
  }, [workflows])

  useEffect(() => {
    if (!plotlyReady || !figure || !containerRef.current || !window.Plotly) {
      return
    }

    const element = containerRef.current as PlotlyHTMLElement
    window.Plotly.react(element, figure.data, figure.layout, {
      displayModeBar: false,
      responsive: true,
    })

    return () => {
      if (window.Plotly && element) {
        window.Plotly.purge(element)
      }
    }
  }, [figure, plotlyReady])

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading orchestrator data…</div>
  }

  if (isError) {
    return <div className="text-sm text-red-600">Failed to load orchestrator workflows.</div>
  }

  if (!figure) {
    return <div className="text-sm text-slate-500">No workflow data available yet.</div>
  }

  return <div ref={containerRef} className="w-full" style={{ minHeight: 400 }} />
}

export default AgentWorkflowPlot
