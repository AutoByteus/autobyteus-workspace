import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import {
  getTeamStreamRecoverySelectionFeedback,
  type TeamStreamRecoverySelectionFeedback,
} from '~/stores/runHistorySelectionActions';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (row: RunTreeRow | TeamMemberFocusTarget) => Promise<void>;
  createDraftRun: (options: {
    workspaceRootPath: string;
    agentDefinitionId: string;
  }) => Promise<void>;
}

interface SelectionStoreLike {
  selectedType: 'agent' | 'team' | 'team_draft' | null;
  selectedRunId: string | null;
  selectRun: (runId: string, type: 'agent' | 'team') => void;
}

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
  emitRunCreated: (payload: { type: 'agent'; definitionId: string }) => void;
  presentTeamStreamRecoveryFeedback: (feedback: TeamStreamRecoverySelectionFeedback) => void;
}) => {
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
    try {
      await params.runHistoryStore.selectTreeRun(run);
      params.emitRunSelected({ type: 'agent', runId: run.runId });
    } catch (error) {
      console.error('Failed to open run:', error);
    }
  };

  const presentRecoveryFeedback = (error: unknown): boolean => {
    const feedback = getTeamStreamRecoverySelectionFeedback(error);
    if (!feedback) return false;
    params.presentTeamStreamRecoveryFeedback(feedback);
    return true;
  };

  const onSelectTeam = async (team: TeamTreeNode, workspaceId = ''): Promise<void> => {
    const isAlreadySelectedTeam =
      params.selectionStore.selectedType === 'team'
      && params.selectionStore.selectedRunId === team.teamRunId;

    if (isAlreadySelectedTeam) {
      params.toggleTeam(team.teamRunId);
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
      return;
    }

    params.setTeamExpanded(team.teamRunId, true);
    const targetMember = resolveTeamTargetMember(team);
    if (!targetMember) {
      params.selectionStore.selectRun(team.teamRunId, 'team');
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
      return;
    }

    if (!targetMember.agentRunId) return;
    params.expandTeamMemberAncestors?.(workspaceId, team.teamRunId, targetMember.agentRunId);

    try {
      await params.runHistoryStore.selectTreeRun({
        teamRunId: targetMember.teamRunId,
        memberAddress: targetMember.memberAddress,
        agentRunId: targetMember.agentRunId,
      });
      params.selectionStore.selectRun(team.teamRunId, 'team');
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
    } catch (error) {
      if (!presentRecoveryFeedback(error)) console.error('Failed to open team:', error);
    }
  };

  const onSelectTeamMember = async (
    member: TeamMemberFocusTarget,
    workspaceId = '',
  ): Promise<void> => {
    try {
      params.setTeamExpanded(member.teamRunId, true);
      params.expandTeamMemberAncestors?.(workspaceId, member.teamRunId, member.agentRunId);
      await params.runHistoryStore.selectTreeRun(member);
      params.emitRunSelected({ type: 'team', runId: member.teamRunId });
    } catch (error) {
      if (!presentRecoveryFeedback(error)) console.error('Failed to open team member run:', error);
    }
  };

  const onCreateRun = async (
    workspaceRootPath: string,
    agentDefinitionId: string,
  ): Promise<void> => {
    try {
      await params.runHistoryStore.createDraftRun({ workspaceRootPath, agentDefinitionId });
      params.emitRunCreated({ type: 'agent', definitionId: agentDefinitionId });
    } catch (error) {
      console.error('Failed to create draft run:', error);
    }
  };

  return {
    onSelectRun,
    onSelectTeam,
    onSelectTeamMember,
    onCreateRun,
  };
};
