import type {
  AgentOrgRunHistoryItem,
  TeamMemberFocusTarget,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext';
import type { WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore';
import type { RunTreeRow } from '~/utils/runTreeProjection';

/**
 * What the Runs view's rows and nested trees read: selection, pending operations and disclosure, by run identity only
 * (workspace-tree-vs-chooser DS-003, from autobyteus-378). The Workspaces and Projects trees keep their own,
 * folder-keyed contract (`workspaceHistorySectionContracts.ts`).
 */
export interface RunListSectionState {
  selectedRunId: string | null;
  isTeamRunSelected: (teamRunId: string) => boolean;
  isRunTerminating: (runId: string) => boolean;
  isTeamTerminating: (teamRunId: string) => boolean;
  isRunDeleting: (runId: string) => boolean;
  isTeamDeleting: (teamRunId: string) => boolean;
  isRunArchiving: (runId: string) => boolean;
  isTeamArchiving: (teamRunId: string) => boolean;
  formatRelativeTime: (isoTime: string) => string;
  /** An Agent run's delegated work is shown. */
  isRunExpanded: (runId: string) => boolean;
  toggleRun: (runId: string) => void;
  isTeamExpanded: (teamRunId: string) => boolean;
  isTeamMemberExpanded: (teamRunId: string, rowKey: string) => boolean;
  toggleTeamMember: (teamRunId: string, rowKey: string) => void;
  isAgentOrgRunExpanded: (rootRunId: string) => boolean;
  toggleAgentOrgRun: (rootRunId: string) => void;
  isAgentOrgTeamExpanded: (rootRunId: string, address: string) => boolean;
  toggleAgentOrgTeam: (rootRunId: string, address: string) => void;
  isAgentOrgTaskTeamExpanded: (rootRunId: string, teamRunId: string) => boolean;
  toggleAgentOrgTaskTeam: (rootRunId: string, teamRunId: string) => void;
  isAgentOrgRunSelected: (rootRunId: string) => boolean;
  isAgentOrgMemberSelected: (rootRunId: string, address: string, agentRunId?: string) => boolean;
  isAgentOrgTerminating: (rootRunId: string) => boolean;
  isAgentOrgDeleting: (rootRunId: string) => boolean;
  isAgentOrgArchiving: (rootRunId: string) => boolean;
  agentOrgTerminationError: (rootRunId: string) => string | null;
  agentOrgContextFor: (rootRunId: string) => AgentOrgExecutionContext | null;
}

export interface RunListSectionActions {
  onSelectRun: (run: RunTreeRow) => Promise<void> | void;
  onTerminateRun: (runId: string) => Promise<void> | void;
  onArchiveRun: (run: RunTreeRow) => Promise<void> | void;
  onDeleteRun: (run: RunTreeRow) => void;
  onTerminateTeam: (teamRunId: string) => Promise<void> | void;
  onArchiveTeam: (team: TeamTreeNode) => Promise<void> | void;
  onDeleteTeam: (team: TeamTreeNode) => void;
  onSelectTeam: (team: TeamTreeNode) => Promise<void> | void;
  /** Opens the Team run like `onSelectTeam`, but never collapses an already-selected one. */
  onOpenTeamRun: (team: TeamTreeNode) => Promise<void> | void;
  onSelectTeamMember: (member: TeamMemberFocusTarget) => Promise<void> | void;
  onOpenAgentOrgRun: (run: AgentOrgRunHistoryItem) => Promise<void | WorkspaceSelectionOutcome> | void;
  onSelectAgentOrgMember: (run: AgentOrgRunHistoryItem, address: string) => Promise<void | WorkspaceSelectionOutcome> | void;
  onInspectAgentOrgExecution: (run: AgentOrgRunHistoryItem, agentRunId: string, address: string) => Promise<void | WorkspaceSelectionOutcome> | void;
  onTerminateAgentOrg: (run: AgentOrgRunHistoryItem) => Promise<void | WorkspaceSelectionOutcome> | void;
  onArchiveAgentOrg: (run: AgentOrgRunHistoryItem) => Promise<void> | void;
  onDeleteAgentOrg: (run: AgentOrgRunHistoryItem) => void;
}
