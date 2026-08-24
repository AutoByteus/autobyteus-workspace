import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow, RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

export interface WorkspaceHistorySectionState {
  selectedRunId: string | null;
  isTeamRunSelected: (teamRunId: string) => boolean;
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
  isAgentExpanded: (workspaceId: string, agentDefinitionId: string) => boolean;
  toggleAgent: (workspaceId: string, agentDefinitionId: string) => void;
  isTeamDefinitionExpanded: (workspaceId: string, groupKey: string) => boolean;
  toggleTeamDefinition: (workspaceId: string, groupKey: string) => void;
  isTeamExpanded: (teamRunId: string) => boolean;
  isTeamMemberExpanded: (
    workspaceId: string,
    teamRunId: string,
    memberAddress: string,
  ) => boolean;
  toggleTeamMember: (
    workspaceId: string,
    teamRunId: string,
    memberAddress: string,
  ) => void;
}

export interface WorkspaceHistoryAvatarBindings {
  showAgentAvatar: (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ) => boolean;
  onAgentAvatarError: (
    workspaceRootPath: string,
    agentDefinitionId: string,
    avatarUrl?: string | null,
  ) => void;
  getAgentInitials: (agentName: string) => string;
  showTeamAvatar: (team: TeamTreeNode) => boolean;
  getTeamAvatarUrl: (team: TeamTreeNode) => string;
  onTeamAvatarError: (team: TeamTreeNode) => void;
  getTeamInitials: (teamName: string) => string;
  showTeamMemberAvatar: (member: TeamMemberTreeRow) => boolean;
  getTeamMemberAvatarUrl: (member: TeamMemberTreeRow) => string;
  onTeamMemberAvatarError: (member: TeamMemberTreeRow) => void;
  getTeamMemberDisplayName: (member: TeamMemberTreeRow) => string;
  getTeamMemberInitials: (member: TeamMemberTreeRow) => string;
}

export interface WorkspaceHistorySectionActions {
  onRemoveWorkspace: (workspace: RunTreeWorkspaceNode) => Promise<void> | void;
  onCreateRun: (workspaceRootPath: string, agentDefinitionId: string) => Promise<void> | void;
  onSelectRun: (run: RunTreeRow) => Promise<void> | void;
  onTerminateRun: (runId: string) => Promise<void> | void;
  onArchiveRun: (run: RunTreeRow) => Promise<void> | void;
  onDeleteRun: (run: RunTreeRow) => void;
  onTerminateTeam: (teamRunId: string) => Promise<void> | void;
  onArchiveTeam: (team: TeamTreeNode) => Promise<void> | void;
  onDeleteTeam: (team: TeamTreeNode) => void;
  onSelectTeam: (team: TeamTreeNode, workspaceId?: string) => Promise<void> | void;
  onSelectTeamMember: (
    member: TeamMemberFocusTarget,
    workspaceId?: string,
  ) => Promise<void> | void;
}
