import type { CollaborationTasksContextView } from './collaborationTasksContextView'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ContextFilePath } from '~/types/conversation'
import type { ToolApprovalTarget } from '~/types/segments'
import type { EventMonitorActiveTraceBrowseSubject } from '~/services/eventMonitor/eventMonitorActiveTracePageService'
import type { CollaborationTaskHeadingPresentation } from '~/types/workspace/collaborationTaskPresentation'
import type { CollaborationMessagesContextView } from './collaborationMessagesContextView'

export interface AgentInteractionPort {
  send(content: string, contextPaths: readonly ContextFilePath[]): Promise<void>
  interrupt(): Promise<void>
  decideTool(
    invocationId: string,
    approved: boolean,
    reason: string | null,
    target?: ToolApprovalTarget | null,
  ): Promise<void>
}

export interface TeamWorkspaceContextView {
  readonly rootKind: 'agent_team' | 'agent_org'
  readonly rootRunId: string
  readonly teamRunId: string
  readonly teamAddress: AgentTeamAddress
  readonly teamDefinitionName: string
  readonly coordinatorAddress: AgentTeamAddress
  readonly focusedMemberAddress: AgentTeamAddress
  readonly focusedAgentRunId: string
  readonly focusedAgentContext: AgentContext
  focusedTaskPresentation(): CollaborationTaskHeadingPresentation | null
  isFocusedProjectionAuthoritative(): boolean
  listMembers(): readonly Readonly<{
    address: AgentTeamAddress
    agentRunId: string
    context: AgentContext
    coordinator: boolean
  }>[]
}

export type WorkspaceAccess = Readonly<{ access: 'live'; interaction: AgentInteractionPort }>
  | Readonly<{ access: 'continuable'; continuation: Pick<AgentInteractionPort, 'send'> }>
  | Readonly<{ access: 'read_only' }>

type WorkspaceTargetCore = WorkspaceAccess & Readonly<{
  context: AgentContext
  browse: EventMonitorActiveTraceBrowseSubject
}>

export type ActiveAgentWorkspaceTarget =
  | (WorkspaceTargetCore & Readonly<{ kind: 'standalone_agent' }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'standalone_team_member'
      team: TeamWorkspaceContextView
      collaborationMessages: CollaborationMessagesContextView
      collaborationTasks: CollaborationTasksContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_direct_agent'
      root: Readonly<{ orgRunId: string }>
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
      collaborationTasks: CollaborationTasksContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_team_member'
      root: Readonly<{ orgRunId: string }>
      team: TeamWorkspaceContextView
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
      collaborationTasks: CollaborationTasksContextView
    }>)

  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_task_agent'
      root: Readonly<{ orgRunId: string }>
      address: AgentTeamAddress
      task: CollaborationTaskHeadingPresentation
      collaborationMessages: CollaborationMessagesContextView
      collaborationTasks: CollaborationTasksContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_task_team_member'
      root: Readonly<{ orgRunId: string }>
      team: TeamWorkspaceContextView
      address: AgentTeamAddress
      task: CollaborationTaskHeadingPresentation
      collaborationMessages: CollaborationMessagesContextView
      collaborationTasks: CollaborationTasksContextView
    }>)
