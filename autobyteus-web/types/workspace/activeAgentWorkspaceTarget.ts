import type { AgentContext } from '~/types/agent/AgentContext'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { ContextFilePath } from '~/types/conversation'
import type { ToolApprovalTarget } from '~/types/segments'
import type { EventMonitorActiveTraceBrowseSubject } from '~/services/eventMonitor/eventMonitorActiveTracePageService'
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
  workspaceRootPath: string | null
  browse: EventMonitorActiveTraceBrowseSubject
}>

export type ActiveAgentWorkspaceTarget =
  | (WorkspaceTargetCore & Readonly<{ kind: 'standalone_agent' }>)
  /** A standalone run with task children: its Team tab lists messages with them. */
  | (WorkspaceTargetCore & Readonly<{
      kind: 'standalone_agent'
      collaborationMessages: CollaborationMessagesContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'standalone_team_member'
      team: TeamWorkspaceContextView
      collaborationMessages: CollaborationMessagesContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_direct_agent'
      root: Readonly<{ orgRunId: string }>
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_team_member'
      root: Readonly<{ orgRunId: string }>
      team: TeamWorkspaceContextView
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
    }>)

  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_task_agent'
      root: Readonly<{ orgRunId: string }>
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
    }>)
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_org_task_team_member'
      root: Readonly<{ orgRunId: string }>
      team: TeamWorkspaceContextView
      address: AgentTeamAddress
      collaborationMessages: CollaborationMessagesContextView
    }>)
  /** A task Agent brought into a standalone run (directly under the run). */
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_run_task_agent'
      host: Readonly<{ hostRunId: string }>
      address: AgentTeamAddress
      agentRunId: string
      collaborationMessages: CollaborationMessagesContextView
    }>)
  /** A member of a task Team brought into a standalone run. */
  | (WorkspaceTargetCore & Readonly<{
      kind: 'agent_run_task_team_member'
      host: Readonly<{ hostRunId: string }>
      address: AgentTeamAddress
      agentRunId: string
      collaborationMessages: CollaborationMessagesContextView
    }>)
