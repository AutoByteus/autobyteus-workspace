export type WorkspaceExecutionLink =
  | {
      kind: 'agent'
      runId: string
    }
  | {
      kind: 'team'
      teamRunId: string
      memberAddress: string | null
    }
