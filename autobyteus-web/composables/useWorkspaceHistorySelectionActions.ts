import type { WorkspaceSelectionIntent, WorkspaceSelectionOutcome } from '~/stores/agentSelectionStore';
import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import {
  getTeamStreamRecoverySelectionFeedback,
  type TeamStreamRecoverySelectionFeedback,
} from '~/stores/runHistorySelectionActions';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (
    row: RunTreeRow | TeamMemberFocusTarget,
    options: { selectionIntent: WorkspaceSelectionIntent; selectionMode?: 'desktop' | 'mobile' },
  ) => Promise<WorkspaceSelectionOutcome>;
}

interface SelectionStoreLike {
  beginSelectionIntent(): WorkspaceSelectionIntent;
  selectedType: 'agent' | 'team' | 'team_draft' | null;
  selectedRunId: string | null;
  selectRun: (runId: string, type: 'agent' | 'team') => void;
  selectRunWithoutShellNavigation: (runId: string, type: 'agent' | 'team') => void;
}

/** Which shell opens runs: the desktop navigates its shell; the phone (`/mobile`) only selects, its route is its own. */
export type WorkspaceHistoryShell = 'desktop' | 'mobile';

export const useWorkspaceHistorySelectionActions = (params: {
  runHistoryStore: RunHistorySelectionStoreLike;
  selectionStore: SelectionStoreLike;
  setTeamExpanded: (teamRunId: string, expanded: boolean) => void;
  toggleTeam: (teamRunId: string) => void;
  expandTeamMemberAncestors?: (
    workspaceId: string,
    teamRunId: string,
    agentRunId: string,
  ) => boolean;
  emitRunSelected: (payload: { type: 'agent' | 'team'; runId: string }) => void;
  presentTeamStreamRecoveryFeedback: (feedback: TeamStreamRecoverySelectionFeedback) => void;
  shell?: WorkspaceHistoryShell;
}) => {
  const mobile = params.shell === 'mobile';
  const selectionMode = mobile ? { selectionMode: 'mobile' as const } : {};
  const selectTeamRun = (teamRunId: string): void => {
    if (mobile) params.selectionStore.selectRunWithoutShellNavigation(teamRunId, 'team');
    else params.selectionStore.selectRun(teamRunId, 'team');
  };

  const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
    rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

  const resolveTeamTargetMember = (team: TeamTreeNode): TeamMemberTreeRow | null => {
    const focusedAgentRunId = team.focusedAgentRunId;
    const rows = flattenTeamRows(team.rootTeam.children.length > 0 ? team.rootTeam.children : team.members);
    if (focusedAgentRunId) {
      const focusedMember = rows.find((member) => member.agentRunId === focusedAgentRunId);
      if (focusedMember) {
        return focusedMember;
      }
    }

    return rows.find((row) => row.agentRunId) ?? null;
  };

  const onSelectRun = async (run: RunTreeRow): Promise<void> => {
    const intent = params.selectionStore.beginSelectionIntent();
    try {
      const result = await params.runHistoryStore.selectTreeRun(run, { selectionIntent: intent, ...selectionMode });
      if (result.disposition !== 'committed' || !intent.isCurrent()) return;
      params.emitRunSelected({ type: 'agent', runId: run.runId });
    } catch (error) {
      if (intent.isCurrent()) console.error('Failed to open run:', error);
    }
  };

  /** The run row: the run's own agent again, not a delegated child under it (autobyteus-277 AR-006). */
  const onOpenAgentRun = (run: RunTreeRow): Promise<void> => {
    useAgentRunCollaborationStore().selectChild(run.runId, null);
    return onSelectRun(run);
  };

  const presentRecoveryFeedback = (error: unknown): boolean => {
    const feedback = getTeamStreamRecoverySelectionFeedback(error);
    if (!feedback) return false;
    params.presentTeamStreamRecoveryFeedback(feedback);
    return true;
  };

  const isSelectedTeam = (team: TeamTreeNode): boolean =>
    params.selectionStore.selectedType === 'team'
    && params.selectionStore.selectedRunId === team.teamRunId;

  /** Expands a Team run that is not selected yet and opens its focused (else first) member. */
  const openTeam = async (team: TeamTreeNode, workspaceId: string, intent: WorkspaceSelectionIntent): Promise<void> => {
    params.setTeamExpanded(team.teamRunId, true);
    const targetMember = resolveTeamTargetMember(team);
    if (!targetMember) {
      selectTeamRun(team.teamRunId);
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
      return;
    }

    if (!targetMember.agentRunId) return;
    params.expandTeamMemberAncestors?.(workspaceId, team.teamRunId, targetMember.agentRunId);

    try {
      const result = await params.runHistoryStore.selectTreeRun({
        teamRunId: targetMember.teamRunId,
        memberAddress: targetMember.memberAddress,
        agentRunId: targetMember.agentRunId,
      }, { selectionIntent: intent, ...selectionMode });
      if (result.disposition !== 'committed' || !intent.isCurrent()) return;
      selectTeamRun(team.teamRunId);
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
    } catch (error) {
      if (intent.isCurrent() && !presentRecoveryFeedback(error)) console.error('Failed to open team:', error);
    }
  };

  /** The Team run row: an already-selected Team run toggles its tree; otherwise it opens. */
  const onSelectTeam = async (team: TeamTreeNode, workspaceId = ''): Promise<void> => {
    const intent = params.selectionStore.beginSelectionIntent();
    if (!isSelectedTeam(team)) return openTeam(team, workspaceId, intent);
    params.toggleTeam(team.teamRunId);
    params.emitRunSelected({ type: 'team', runId: team.teamRunId });
  };

  /** Opens the Team run without collapsing it: an already-selected one only navigates to it (REQ-012). */
  const onOpenTeamRun = async (team: TeamTreeNode, workspaceId = ''): Promise<void> => {
    const intent = params.selectionStore.beginSelectionIntent();
    if (!isSelectedTeam(team)) return openTeam(team, workspaceId, intent);
    params.emitRunSelected({ type: 'team', runId: team.teamRunId });
  };

  const onSelectTeamMember = async (
    member: TeamMemberFocusTarget,
    workspaceId = '',
  ): Promise<void> => {
    const intent = params.selectionStore.beginSelectionIntent();
    try {
      params.setTeamExpanded(member.teamRunId, true);
      params.expandTeamMemberAncestors?.(workspaceId, member.teamRunId, member.agentRunId);
      const result = await params.runHistoryStore.selectTreeRun(member, { selectionIntent: intent, ...selectionMode });
      if (result.disposition !== 'committed' || !intent.isCurrent()) return;
      params.emitRunSelected({ type: 'team', runId: member.teamRunId });
    } catch (error) {
      if (intent.isCurrent() && !presentRecoveryFeedback(error)) console.error('Failed to open team member run:', error);
    }
  };

  return {
    onSelectRun,
    onOpenAgentRun,
    onSelectTeam,
    onOpenTeamRun,
    onSelectTeamMember,
  };
};
