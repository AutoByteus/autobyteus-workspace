import type { TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (row: RunTreeRow | TeamMemberTreeRow) => Promise<void>;
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
  emitRunSelected: (payload: { type: 'agent' | 'team'; runId: string }) => void;
  emitRunCreated: (payload: { type: 'agent'; definitionId: string }) => void;
}) => {
  const resolveTeamTargetMember = (team: TeamTreeNode): TeamMemberTreeRow | null => {
    const focusedMemberKey = team.focusedMemberName.trim();
    if (focusedMemberKey) {
      const focusedMember = team.members.find((member) =>
        member.memberRouteKey === focusedMemberKey || member.memberName === focusedMemberKey,
      );
      if (focusedMember) {
        return focusedMember;
      }
    }

    return team.members[0] ?? null;
  };

  const onSelectRun = async (run: RunTreeRow): Promise<void> => {
    try {
      await params.runHistoryStore.selectTreeRun(run);
      params.emitRunSelected({ type: 'agent', runId: run.runId });
    } catch (error) {
      console.error('Failed to open run:', error);
    }
  };

  const onSelectTeam = async (team: TeamTreeNode): Promise<void> => {
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

    try {
      await params.runHistoryStore.selectTreeRun(targetMember);
      params.selectionStore.selectRun(team.teamRunId, 'team');
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
    } catch (error) {
      console.error('Failed to open team:', error);
    }
  };

  const onSelectTeamMember = async (member: TeamMemberTreeRow): Promise<void> => {
    try {
      params.setTeamExpanded(member.teamRunId, true);
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
