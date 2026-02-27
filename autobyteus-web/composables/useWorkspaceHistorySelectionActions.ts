import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (row: RunTreeRow | TeamMemberTreeRow) => Promise<void>;
  createDraftRun: (options: {
    workspaceRootPath: string;
    agentDefinitionId: string;
  }) => Promise<void>;
}

interface SelectionStoreLike {
  selectRun: (runId: string, type: 'agent' | 'team') => void;
}

export const useWorkspaceHistorySelectionActions = (params: {
  runHistoryStore: RunHistorySelectionStoreLike;
  selectionStore: SelectionStoreLike;
  toggleTeam: (teamRunId: string) => void;
  emitRunSelected: (payload: { type: 'agent' | 'team'; runId: string }) => void;
  emitRunCreated: (payload: { type: 'agent'; definitionId: string }) => void;
}) => {
  const onSelectRun = async (run: RunTreeRow): Promise<void> => {
    try {
      await params.runHistoryStore.selectTreeRun(run);
      params.emitRunSelected({ type: 'agent', runId: run.runId });
    } catch (error) {
      console.error('Failed to open run:', error);
    }
  };

  const onSelectTeam = (teamRunId: string): void => {
    params.toggleTeam(teamRunId);
    params.selectionStore.selectRun(teamRunId, 'team');
    params.emitRunSelected({ type: 'team', runId: teamRunId });
  };

  const onSelectTeamMember = async (member: TeamMemberTreeRow): Promise<void> => {
    try {
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
