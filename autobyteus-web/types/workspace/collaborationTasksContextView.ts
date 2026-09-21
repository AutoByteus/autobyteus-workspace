import type { DelegatedTaskEntry } from './collaborationTaskPresentation'

export interface CollaborationTasksContextView {
  readonly rootKind: 'agent_team' | 'agent_org'
  readonly rootRunId: string
  readonly focusedAgentRunId: string
  listDelegatedTaskEntries(): readonly DelegatedTaskEntry[]
  taskReferenceContentPath(taskId: string, referenceId: string): string
}
