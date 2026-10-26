/**
 * Settings → Model Routing (autobyteus-32): the server's JSON values as the page reads them (the shapes of
 * `modelRoutingStatus`, `modelRoutingDecisions` and `modelRoutingStatistics`).
 */
export type ModelRoutingReasonCode =
  | 'OFF' | 'ROUTER_NOT_SET' | 'RUNTIME_UNAVAILABLE' | 'SIGNED_OUT' | 'MODEL_NOT_OFFERED' | 'MODEL_BLOCKED' | 'REPORT_UNREADABLE'

export type ModelRoutingStatus = Readonly<{
  enabled: boolean
  routerLaunch: Readonly<{ runtimeKind: string; llmModelIdentifier: string }> | null
  active: boolean
  reasonCode: ModelRoutingReasonCode | null
  reasonParams: Readonly<Record<string, string | null>>
  reasonText: string | null
  agentRunId: string | null
}>

export type DecisionLaunchSource = 'agent_default' | 'team_default' | 'model_router' | 'inherited'

export type RoutingDecisionRecord = Readonly<{
  recordedAt: string
  taskId: string | null
  taskKey: string | null
  projectId: string | null
  taskTitle: string
  delegatingRunId: string | null
  delegatingAgentName: string
  fromNode: string | null
  copyAddress: string
  copyKind: 'agent' | 'agent_team'
  agentAddress: string
  runtimeKind: string
  llmModelIdentifier: string
  source: DecisionLaunchSource
  taskKind: string | null
  choiceReason: string | null
  routerFailure: string | null
  skipped: readonly Readonly<{ layer: 'agent_default' | 'team_default'; runtimeKind: string | null; llmModelIdentifier: string | null; detail: string }>[]
  notes: readonly string[]
}>

export type RoutingDecisionDelegation = Readonly<{
  recordedAt: string
  delegatingRunId: string | null
  delegatingAgentName: string
  fromNode: string | null
  copyAddress: string
  copyKind: 'agent' | 'agent_team'
  records: readonly RoutingDecisionRecord[]
}>

export type RoutingDecisionTaskGroup = Readonly<{
  taskId: string | null
  taskKey: string | null
  projectId: string | null
  taskTitle: string
  latestAt: string
  delegations: readonly RoutingDecisionDelegation[]
}>

export type RoutingDecisionPage = Readonly<{ groups: readonly RoutingDecisionTaskGroup[]; totalTasks: number }>

export type RuntimeCount = Readonly<{ runtimeKind: string; count: number }>
export type ModelCount = Readonly<{ runtimeKind: string; llmModelIdentifier: string; count: number }>
export type RoutingStatisticsGroup = Readonly<{ count: number; runtimes: readonly RuntimeCount[]; models: readonly ModelCount[] }>

export type RoutingStatistics = Readonly<{
  totalAgents: number
  sources: Readonly<Record<DecisionLaunchSource, number>>
  taskKinds: readonly (RoutingStatisticsGroup & Readonly<{ taskKind: string }>)[]
  notRouted: RoutingStatisticsGroup
  routerFailures: number
}>

/** Where "View decision" points: the delegating run, the copy and the agent (design D9). */
export type DecisionLocator = Readonly<{ runId: string; copy: string; agent: string }>
