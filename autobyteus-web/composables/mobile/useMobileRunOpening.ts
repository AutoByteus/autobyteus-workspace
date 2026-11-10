import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useLocalization } from '~/composables/useLocalization';
import { useToasts } from '~/composables/useToasts';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import {
  agentOrgRouteQuery,
  useWorkspaceHistorySubjectActions,
  type WorkspaceHistorySubjectAction,
} from '~/composables/useWorkspaceHistorySubjectActions';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { MobileRowOpen, MobileRunTreeRow } from '~/utils/mobile/mobileRunTreeProjection';
import { agentOrgFirstMemberAddress } from '~/utils/agentOrgHistoryRows';

type OrgOpen = Extract<MobileRowOpen, { kind: 'orgRun' | 'orgMember' | 'orgExecution' }>;
const isOrgOpen = (open: MobileRowOpen): open is OrgOpen =>
  open.kind === 'orgRun' || open.kind === 'orgMember' || open.kind === 'orgExecution';
const orgCommandOf = (open: OrgOpen): WorkspaceHistorySubjectAction => {
  const rootRunId = open.orgRun.rootRunId;
  // An Org run opens its first configured member (REQ-003a); the row has an open only when there is one.
  if (open.kind === 'orgRun') return { rootSubjectKind: 'agent_org', rootRunId, action: 'select', memberAddress: agentOrgFirstMemberAddress(open.orgRun) ?? '' };
  if (open.kind === 'orgMember') return { rootSubjectKind: 'agent_org', rootRunId, action: 'select', memberAddress: open.address };
  return { rootSubjectKind: 'agent_org', rootRunId, action: 'inspect', agentRunId: open.agentRunId, memberAddress: open.address };
};

/**
 * A tap on a tree row (autobyteus-277 DS-003, AR-001), in this order: mark the open pending, push the run screen
 * (it shows "Opening…"), run the kind's shared open action in the phone shell, then commit or fail the pending open.
 * The open rules stay in the shared actions; this owns only the sequence.
 */
export function useMobileRunOpening(disclosure: {
  setTeamExpanded: (teamRunId: string, expanded: boolean) => void;
  toggleTeam: (teamRunId: string) => void;
  expandTeamMemberAncestors: (teamRunId: string, agentRunId: string) => boolean;
}) {
  const opening = useMobileRunOpeningStore();
  const navigation = useMobileNavigation();
  const collaboration = useAgentRunCollaborationStore();
  const { addToast } = useToasts();
  const { t } = useLocalization();

  /** The shared actions' commit notification: the pending open committed (an earlier open's intent ended at `begin`). */
  const commitPending = (): void => {
    if (opening.pending) opening.commit(opening.pending.key);
  };

  const selection = useWorkspaceHistorySelectionActions({
    runHistoryStore: useRunHistoryStore(),
    selectionStore: useAgentSelectionStore(),
    setTeamExpanded: disclosure.setTeamExpanded,
    toggleTeam: disclosure.toggleTeam,
    expandTeamMemberAncestors: (_workspaceId, teamRunId, agentRunId) => disclosure.expandTeamMemberAncestors(teamRunId, agentRunId),
    emitRunSelected: commitPending,
    // The desktop's toast and copy (E-31); the open then fails, as it did not commit.
    presentTeamStreamRecoveryFeedback: (feedback) => addToast(t(feedback === 'wait'
      ? 'workspace.components.workspace.history.RunSectionPanel.stream_recovery_wait'
      : 'workspace.components.workspace.history.RunSectionPanel.stream_recovery_retry'), 'info'),
    shell: 'mobile',
  });
  const subject = useWorkspaceHistorySubjectActions({ shell: 'mobile' });

  const runSharedAction = async (key: string, open: MobileRowOpen): Promise<void> => {
    if (isOrgOpen(open)) {
      const outcome = await subject.execute(orgCommandOf(open));
      if (outcome.disposition === 'committed') opening.commit(key);
      return;
    }
    if (open.kind === 'agentRun') return selection.onOpenAgentRun(open.run);
    if (open.kind === 'taskRow') {
      if (collaboration.selectTaskRow(open.hostRun.runId, open.row)) await selection.onSelectRun(open.hostRun);
      return;
    }
    if (open.kind === 'team') return selection.onOpenTeamRun(open.team);
    return selection.onSelectTeamMember(open.target);
  };

  /** Runs the row's shared open action, then settles the pending open: committed by the action, else it fails. */
  const settle = async (key: string, rowOpen: MobileRowOpen): Promise<void> => {
    try {
      await runSharedAction(key, rowOpen);
    } catch (error) {
      console.warn('[mobile] Failed to open run:', error);
    }
    // Not committed (failed, rejected, superseded by the store, stream recovery): the pending open fails.
    opening.fail(key);
  };

  const open = async (row: MobileRunTreeRow): Promise<void> => {
    if (!row.open) return;
    const rowOpen = row.open;
    opening.begin(row.key);
    // An Org subject is named by its Org keys; an agent run or a Team subject by its row (autobyteus-435 DS-006).
    await navigation.openRun(isOrgOpen(rowOpen)
      ? { orgQuery: agentOrgRouteQuery(rowOpen.orgRun, orgCommandOf(rowOpen), rowOpen.orgRun.isActive) }
      : { rowKey: row.key });
    await settle(row.key, rowOpen);
  };

  /**
   * The page-start restore (autobyteus-435 DS-006): the route already names the row and its screen, and the restore
   * began the pending open, so only the shared open action runs, with no navigation.
   */
  const reopen = async (row: MobileRunTreeRow & { open: MobileRowOpen }): Promise<void> => settle(row.key, row.open);

  return { open, reopen };
}
