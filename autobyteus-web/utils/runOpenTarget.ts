import type { RowOpenTarget } from '~/stores/runHistoryTypes'

type SnakeOpenTarget = Readonly<{ run_kind: 'agent' | 'agent_team'; run_id: string; agent_run_id: string; node_id?: string }>

/** A row's open target as the Team and peer streams send it (snake case), for the web's rows (SR-083); null stays null. */
export const fromSnakeOpenTarget = (target: SnakeOpenTarget | null | undefined): RowOpenTarget | null | undefined => target
  ? Object.freeze({ runKind: target.run_kind, runId: target.run_id, agentRunId: target.agent_run_id, ...(target.node_id ? { nodeId: target.node_id } : {}) })
  : target

/** A delegated Team's member row opens that Team on itself (SR-083). */
export const memberOpenTarget = (teamRunId: string, agentRunId: string, nodeId?: string): RowOpenTarget =>
  Object.freeze({ runKind: 'agent_team', runId: teamRunId, agentRunId, ...(nodeId ? { nodeId } : {}) })
