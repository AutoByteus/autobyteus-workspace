import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { RunTreeRow } from '~/utils/runTreeProjection';

export interface WorkspaceHistorySectionState {
  selectedRunId: string | null;
  activeStatusClass: string;
  isRunTerminating: (runId: string) => boolean;
  isTeamTerminating: (teamRunId: string) => boolean;
  isRunDeleting: (runId: string) => boolean;
  isTeamDeleting: (teamRunId: string) => boolean;
  isRunArchiving: (runId: string) => boolean;
  isTeamArchiving: (teamRunId: string) => boolean;
  formatRelativeTime: (isoTime: string) => string;
  isWorkspaceExpanded: (workspaceRootPath: string) => boolean;
  toggleWorkspace: (workspaceRootPath: string) => void;
  isAgentExpanded: (workspaceRootPath: string, agentDefinitionId: string) => boolean;
  toggleAgent: (workspaceRootPath: string, agentDefinitionId: string) => void;
  isTeamExpanded: (teamRunId: string) => boolean;
  teamStatusClass: (status: AgentTeamStatus) => string;
  canTerminateTeam: (status: AgentTeamStatus) => boolean;
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
  onCreateRun: (workspaceRootPath: string, agentDefinitionId: string) => Promise<void> | void;
  onSelectRun: (run: RunTreeRow) => Promise<void> | void;
  onTerminateRun: (runId: string) => Promise<void> | void;
  onArchiveRun: (run: RunTreeRow) => Promise<void> | void;
  onDeleteRun: (run: RunTreeRow) => void;
  onSelectTeam: (team: TeamTreeNode) => Promise<void> | void;
  onTerminateTeam: (teamRunId: string) => Promise<void> | void;
  onArchiveTeam: (team: TeamTreeNode) => Promise<void> | void;
  onDeleteTeam: (team: TeamTreeNode) => void;
  onSelectTeamMember: (member: TeamMemberTreeRow) => Promise<void> | void;
}
