import type { RunHistoryWorkspaceGroup, AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import type { TaskRootStatus, TaskRootView } from '~/types/project'

/** What a root line shows: the worker's own status (DEC-006), or the one Task-specific state. */
export type TaskRootState = TaskRootStatus | 'failed'

/** Literal translation keys, so the localization audit resolves every label (no runtime-built keys). */
export const TASK_ROOT_STATE_LABEL_KEYS: Readonly<Record<TaskRootState, string>> = {
  running: 'projects.root.status.running',
  initializing: 'projects.root.status.initializing',
  idle: 'projects.root.status.idle',
  error: 'projects.root.status.error',
  offline: 'projects.root.status.offline',
  failed: 'projects.root.status.failed',
}
export const TASK_ROOT_KIND_LABEL_KEYS: Readonly<Record<TaskRootView['kind'], string>> = {
  agent: 'projects.root.kind.agent',
  team: 'projects.root.kind.team',
}

export interface TaskRootPresentation {
  /** The display name from the delegated address; null for assignments recorded before it was kept (show the kind). */
  name: string | null
  state: TaskRootState
  /** Closed by DONE: muted name, no chevron. */
  muted: boolean
  /** Opens its conversation: started, not closed, and the run whose view lists its row is in the left panel (SR-080). */
  openable: boolean
  /** The start error of a root that could not start. */
  error: string | null
}

/**
 * The one root-line rule (AR-002): `failed` → Couldn't start; closed → Offline (muted); otherwise
 * the worker's own status (Initializing while starting). Openable only when started, not closed,
 * and the run whose view lists its row (its tree's top, SR-080) is in the left panel; otherwise no chevron and not focusable.
 */
export const presentTaskRoot = (root: TaskRootView, topListed: boolean): TaskRootPresentation => ({
  name: root.displayName,
  state: root.start === 'failed' ? 'failed' : root.closed ? 'offline' : root.status,
  muted: root.closed,
  openable: root.start === 'started' && !root.closed && topListed,
  error: root.start === 'failed' ? root.startError?.message ?? null : null,
})

/**
 * Whether the run whose view lists a root's row, the top of its tree (SR-080), is listed in the left panel's run history:
 * then its row can be opened as clicking it does. A root with no known top is not.
 */
export const isTaskRootTopRunListed = (history: Readonly<{
  workspaceGroups: readonly RunHistoryWorkspaceGroup[]
  agentOrgHistory: readonly AgentOrgRunHistoryItem[]
}>, host: TaskRootView['topRun']): boolean => {
  if (!host) return false
  if (host.kind === 'agent_org') return history.agentOrgHistory.some((run) => run.rootRunId === host.runId)
  return history.workspaceGroups.some((group) => host.kind === 'agent'
    ? group.agentDefinitions.some((definition) => definition.runs.some((run) => run.runId === host.runId))
    : group.teamDefinitions.some((definition) => definition.runs.some((run) => run.teamRunId === host.runId)))
}
