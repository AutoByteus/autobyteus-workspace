import type { TeamMemberFocusTarget, TeamMemberTreeRow, TeamTreeNode } from '~/stores/runHistoryTypes';
import { toWorkspaceHistorySessionKey, type WorkspaceHistorySessionRow } from '~/stores/runHistorySessionProjection';
import type { RunTreeRow } from '~/utils/runTreeProjection';

interface RunHistorySelectionStoreLike {
  selectTreeRun: (row: RunTreeRow | TeamMemberFocusTarget) => Promise<void>;
}

interface SelectionStoreLike {
  selectedType: 'agent' | 'team' | null;
  selectedRunId: string | null;
  selectRun: (runId: string, type: 'agent' | 'team') => void;
}

export const useWorkspaceHistorySelectionActions = (params: {
  runHistoryStore: RunHistorySelectionStoreLike;
  selectionStore: SelectionStoreLike;
  setSessionExpanded: (sessionKey: string, expanded: boolean) => void;
  toggleSession: (sessionKey: string) => void;
  expandTeamMemberAncestors?: (
    workspaceId: string,
    teamRunId: string,
    memberRouteKey: string,
    memberTree: readonly TeamMemberTreeRow[],
  ) => boolean;
  emitRunSelected: (payload: { type: 'agent' | 'team'; runId: string }) => void;
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

  const rootTeamMembers = (team: TeamTreeNode): readonly TeamMemberTreeRow[] =>
    team.memberTree.length > 0 ? team.memberTree : team.members;

  const onSelectTeam = async (team: TeamTreeNode, workspaceId = ''): Promise<void> => {
    const teamSessionKey = toWorkspaceHistorySessionKey('team', team.teamRunId);
    const isAlreadySelectedTeam =
      params.selectionStore.selectedType === 'team'
      && params.selectionStore.selectedRunId === team.teamRunId;

    if (isAlreadySelectedTeam) {
      params.toggleSession(teamSessionKey);
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
      return;
    }

    params.setSessionExpanded(teamSessionKey, true);
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
      rootTeamMembers(team),
    );

    try {
      await params.runHistoryStore.selectTreeRun(targetMember);
      params.selectionStore.selectRun(team.teamRunId, 'team');
      params.emitRunSelected({ type: 'team', runId: team.teamRunId });
    } catch (error) {
      console.error('Failed to open team:', error);
    }
  };

  const onSelectSession = async (
    session: WorkspaceHistorySessionRow,
    workspaceId = '',
  ): Promise<void> => {
    if (session.kind === 'agent') {
      await onSelectRun(session.agentRun);
      return;
    }

    await onSelectTeam(session.teamRun, workspaceId);
  };

  const onSelectTeamMember = async (
    member: TeamMemberFocusTarget,
    workspaceId = '',
    memberTree: readonly TeamMemberTreeRow[] = [],
  ): Promise<void> => {
    try {
      params.setSessionExpanded(toWorkspaceHistorySessionKey('team', member.teamRunId), true);
      params.expandTeamMemberAncestors?.(
        workspaceId,
        member.teamRunId,
        member.memberRouteKey,
        memberTree,
      );
      await params.runHistoryStore.selectTreeRun(member);
      params.emitRunSelected({ type: 'team', runId: member.teamRunId });
    } catch (error) {
      console.error('Failed to open team member run:', error);
    }
  };

  return {
    onSelectRun,
    onSelectTeam,
    onSelectSession,
    onSelectTeamMember,
  };
};
