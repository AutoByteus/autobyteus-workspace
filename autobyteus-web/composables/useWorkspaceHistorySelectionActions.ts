import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (row: RunTreeRow | TeamMemberFocusTarget) => Promise<void>;
  createDraftRun: (options: {
    workspaceRootPath: string;
    agentDefinitionId: string;
  }) => Promise<void>;
}

interface SelectionStoreLike {
  selectedType: 'agent' | 'team' | null;
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
    memberRouteKey: string,
  ) => boolean;
  emitRunSelected: (payload: { type: 'agent' | 'team'; runId: string }) => void;
  emitRunCreated: (payload: { type: 'agent'; definitionId: string }) => void;
}) => {
  const flattenTeamRows = (rows: readonly TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
    rows.flatMap((row) => [row, ...flattenTeamRows(row.children)]);

  const resolveTeamTargetMember = (team: TeamTreeNode): TeamMemberTreeRow | null => {
    const focusedMemberKey = team.focusedMemberRouteKey.trim();
    const rows = flattenTeamRows(team.memberTree.length > 0 ? team.memberTree : team.members);
    if (focusedMemberKey) {
      const focusedMember = rows.find((member) =>
        member.memberRouteKey === focusedMemberKey,
      );
      if (focusedMember) {
        return focusedMember;
      }
    }

    return rows[0] ?? null;
  };

  const onSelectRun = async (run: RunTreeRow): Promise<void> => {
    try {
      await params.runHistoryStore.selectTreeRun(run);
      params.emitRunSelected({ type: 'agent', runId: run.runId });
    } catch (error) {
      console.error('Failed to open run:', error);
    }
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

    params.expandTeamMemberAncestors?.(
      workspaceId,
      team.teamRunId,
      targetMember.memberRouteKey,
    );

    try {
      await params.runHistoryStore.selectTreeRun(targetMember);
      params.selectionStore.selectRun(team.teamRunId, 'team');
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
    } catch (error) {
      console.error('Failed to open team:', error);
    }
  };

  const onSelectTeamMember = async (
    member: TeamMemberFocusTarget,
    workspaceId = '',
  ): Promise<void> => {
    try {
      params.setTeamExpanded(member.teamRunId, true);
      params.expandTeamMemberAncestors?.(
        workspaceId,
        member.teamRunId,
        member.memberRouteKey,
      );
      await params.runHistoryStore.selectTreeRun(member);
      params.emitRunSelected({ type: 'team', runId: member.teamRunId });
    } catch (error) {
      console.error('Failed to open team member run:', error);
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
