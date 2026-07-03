import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { WorkspaceHistorySessionRow } from '~/stores/runHistorySessionProjection';
import type { RunTreeRow, RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

export interface WorkspaceHistorySectionState {
  selectedSessionKey: string | null;
  isRunTerminating: (runId: string) => boolean;
  isTeamTerminating: (teamRunId: string) => boolean;
  isRunDeleting: (runId: string) => boolean;
  isTeamDeleting: (teamRunId: string) => boolean;
  isRunArchiving: (runId: string) => boolean;
  isTeamArchiving: (teamRunId: string) => boolean;
  isWorkspaceRemoving: (workspaceId: string) => boolean;
  isWorkspaceHistoryLoading: (workspaceId: string) => boolean;
  workspaceHistoryError: (workspaceId: string) => string | null;
  formatRelativeTime: (isoTime: string) => string;
  isWorkspaceExpanded: (workspaceId: string) => boolean;
  toggleWorkspace: (workspaceNode: RunTreeWorkspaceNode) => Promise<void> | void;
  isSessionExpanded: (sessionKey: string) => boolean;
  toggleSession: (sessionKey: string) => void;
  getLiveTeamContext: (teamRunId: string) => AgentTeamContext | null;
  isTeamMemberExpanded: (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
  ) => boolean;
  toggleTeamMember: (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
  ) => void;
  canTerminateTeam: (status: AgentTeamStatus) => boolean;
}

export interface WorkspaceHistorySectionActions {
  onRemoveWorkspace: (workspace: RunTreeWorkspaceNode) => Promise<void> | void;
  onSelectSession: (session: WorkspaceHistorySessionRow, workspaceId?: string) => Promise<void> | void;
  onTerminateRun: (runId: string) => Promise<void> | void;
  onArchiveRun: (run: RunTreeRow) => Promise<void> | void;
  onDeleteRun: (run: RunTreeRow) => void;
  onTerminateTeam: (teamRunId: string) => Promise<void> | void;
  onArchiveTeam: (team: TeamTreeNode) => Promise<void> | void;
  onDeleteTeam: (team: TeamTreeNode) => void;
  onSelectTeamMember: (
    member: TeamMemberFocusTarget,
    workspaceId?: string,
    memberTree?: readonly TeamMemberTreeRow[],
  ) => Promise<void> | void;
}
