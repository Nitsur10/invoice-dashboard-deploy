'use client'

import { useMemo } from 'react'
import { useOrchestratorWorkflows } from '@/hooks/use-orchestrator-workflows'
import type { AgentStatus, FeatureWorkflow } from '@/lib/orchestrator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvoiceWorkflowMetadata {
  id: string
  masterPlanPhase: string
  clientPriority: 'Critical' | 'High' | 'Medium' | 'Low'
  timelineDay: number
  blockers: {
    id: string
    description: string
    severity: 'Critical' | 'High' | 'Medium' | 'Low'
    status: 'Open' | 'In Progress' | 'Resolved'
    owner?: string
  }[]
  clientReviewStatus: 'Not Ready' | 'Ready for Review' | 'In Review' | 'Approved'
  milestoneAlignment: {
    id: string
    name: string
    phase: string
    targetDay: number
    status: 'Pending' | 'In Progress' | 'Complete'
  }
  riskMitigation: {
    risk: string
    mitigation: string
    owner: string
    status: 'Planned' | 'Active' | 'Completed'
  }[]
  acceptanceCriteria: string[]
  summary: string
  agents: AgentStatus[]
}

type WorkflowWithMetadata = FeatureWorkflow & {
  metadata?: { invoiceDashboard?: InvoiceWorkflowMetadata }
}

function guardInvoiceWorkflow(workflow: FeatureWorkflow): workflow is WorkflowWithMetadata {
  const metadata = (workflow.metadata as WorkflowWithMetadata['metadata'])?.invoiceDashboard
  if (!metadata) return false
  return Boolean(
    metadata.id &&
      metadata.timelineDay !== undefined &&
      Array.isArray(metadata.acceptanceCriteria)
  )
}

function getPriorityVariant(priority: InvoiceWorkflowMetadata['clientPriority']) {
  switch (priority) {
    case 'Critical':
      return 'destructive' as const
    case 'High':
      return 'default' as const
    case 'Medium':
      return 'secondary' as const
    case 'Low':
      return 'outline' as const
    default:
      return 'default' as const
  }
}

function qualityGateIcon(gateState: string) {
  switch (gateState) {
    case 'Passed':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
    case 'Failed':
      return <TriangleAlert className="h-3.5 w-3.5 text-red-400" aria-hidden />
    case 'Bypassed':
      return <TriangleAlert className="h-3.5 w-3.5 text-amber-400" aria-hidden />
    default:
      return <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
  }
}

export function WorkflowRoadmap() {
  const { data, isLoading } = useOrchestratorWorkflows()

  const workflows = useMemo(() => {
    if (!data) return []
    return data.filter(guardInvoiceWorkflow) as WorkflowWithMetadata[]
  }, [data])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={`workflow-skeleton-${index}`} className="border-slate-800/40 bg-slate-950/30">
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!workflows.length) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Workflow Command Center</h2>
          <p className="text-sm text-slate-400">
            Tracking Enhanced Multi-Agent progress across Baseline, Enhancement, and Deployment phases.
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((workflow) => {
          const metadata = (workflow.metadata as WorkflowWithMetadata['metadata'])!.invoiceDashboard!
          const agents = workflow.agents
          const completedAgents = agents.filter((agent) => agent.status === 'Complete').length
          const progressValue = agents.length ? Math.round((completedAgents / agents.length) * 100) : 0
          const openBlockers = metadata.blockers.filter((blocker) => blocker.status !== 'Resolved')

          return (
            <Card key={metadata.id} className="border-slate-800/40 bg-slate-950/40 backdrop-blur-sm">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base text-slate-100">
                    {metadata.id} · {workflow.title}
                  </CardTitle>
                  <Badge variant={getPriorityVariant(metadata.clientPriority)}>
                    {metadata.clientPriority}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400 text-sm leading-relaxed">
                  {metadata.summary}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-300">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      Agent Progress
                    </span>
                    <span className="text-xs text-slate-400">
                      {completedAgents}/{agents.length} agents · {progressValue}%
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      Phase: {workflow.currentPhase}
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      Status: {workflow.status}
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      Timeline Day {metadata.timelineDay}/8
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                      Milestone: {metadata.milestoneAlignment.status}
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-slate-800/80" />

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Quality Gates</p>
                  <div className="flex flex-wrap gap-2">
                    {workflow.qualityGates.map((gate) => (
                      <Badge
                        key={gate.gate.name}
                        className={cn(
                          'border-slate-800/60 bg-slate-900/80 text-slate-200 font-normal gap-1',
                          gate.state === 'Passed' && 'bg-emerald-950/60 border-emerald-700/40 text-emerald-200',
                          gate.state === 'Failed' && 'bg-red-950/70 border-red-700/30 text-red-200',
                          gate.state === 'Bypassed' && 'bg-amber-950/70 border-amber-700/40 text-amber-200'
                        )}
                      >
                        {qualityGateIcon(gate.state)}
                        <span className="truncate max-w-[9rem]">{gate.gate.name}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator className="bg-slate-800/80" />

                <div className="grid gap-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Acceptance Snapshot
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {metadata.acceptanceCriteria.slice(0, 3).map((criteria) => (
                      <li key={criteria} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 min-w-[0.875rem] text-primary mt-0.5" aria-hidden />
                        <span>{criteria}</span>
                      </li>
                    ))}
                    {metadata.acceptanceCriteria.length > 3 && (
                      <li className="text-xs text-slate-500">
                        +{metadata.acceptanceCriteria.length - 3} more criteria documented
                      </li>
                    )}
                  </ul>
                </div>

                <Separator className="bg-slate-800/80" />

                {openBlockers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Active Blockers</p>
                    <ul className="space-y-1 text-xs">
                      {openBlockers.slice(0, 2).map((blocker) => (
                        <li key={blocker.id} className="flex items-start gap-2 text-amber-200">
                          <TriangleAlert className="h-3.5 w-3.5 min-w-[0.875rem] mt-0.5" aria-hidden />
                          <span>
                            <strong>{blocker.id}</strong>: {blocker.description}
                          </span>
                        </li>
                      ))}
                      {openBlockers.length > 2 && (
                        <li className="text-xs text-slate-500">
                          +{openBlockers.length - 2} additional blockers tracked
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    All blockers resolved for this workflow
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
