export type WorkspaceExecutionLink =
  | {
      kind: 'agent'
      runId: string
    }
  | {
      kind: 'team'
      teamRunId: string
      memberRouteKey: string | null
    }
