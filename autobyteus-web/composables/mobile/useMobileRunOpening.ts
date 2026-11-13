import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useLocalization } from '~/composables/useLocalization';
import { useToasts } from '~/composables/useToasts';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import {
  agentOrgRouteQuery,
  useWorkspaceHistorySubjectActions,
  type WorkspaceHistorySubjectAction,
} from '~/composables/useWorkspaceHistorySubjectActions';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import { agentRunDelegatedRunSubject, orgDelegatedRunSubject, teamDelegatedRunSubject, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
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
  const orgContexts = useAgentOrgContextsStore();
  const delegatedRuns = useDelegatedRunsStore();
  const teamContexts = useAgentTeamContextsStore();
  /**
   * The run delegated on this node that a row opens, once its shared action selected it (rule 2): a row of an Org, of an
   * agent run's view (its selected child) or of a Team. `null` for a run's own agents, a peer's run and a run itself.
   */
  const delegatedRunOf = (open: MobileRowOpen): DelegatedRunSubject | null => {
    if (open.kind === 'orgExecution') {
      const index = orgContexts.contextFor(open.orgRun.rootRunId)?.index;
      return index ? orgDelegatedRunSubject(index, open.agentRunId) : null;
    }
    if (open.kind === 'taskRow') {
      const host = collaboration.contextFor(open.hostRun.runId);
      const child = collaboration.selectedChild(open.hostRun.runId);
      return host && child ? agentRunDelegatedRunSubject(host.index, child) : null;
    }
    if (open.kind === 'teamMember') {
      const team = teamContexts.getTeamContextById(open.target.teamRunId);
      return team ? teamDelegatedRunSubject(team.view.getExecutionTree(), open.target.agentRunId) : null;
    }
    return null;
  };
  const { addToast } = useToasts();
  const { t } = useLocalization();

  /** The opens their shared action selected (its commit notification; an earlier open's intent ended at `begin`). */
  const selected = new Set<string>();
  const commitPending = (): void => {
    if (opening.pending) selected.add(opening.pending.key);
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

  /** Runs the row's kind's shared open action; `true` when it selected the row. */
  const runSharedAction = async (key: string, open: MobileRowOpen): Promise<boolean> => {
    if (isOrgOpen(open)) return (await subject.execute(orgCommandOf(open))).disposition === 'committed';
    if (open.kind === 'agentRun') await selection.onOpenAgentRun(open.run);
    else if (open.kind === 'taskRow') {
      if (collaboration.selectTaskRow(open.hostRun.runId, open.row)) await selection.onSelectRun(open.hostRun);
    } else if (open.kind === 'team') await selection.onOpenTeamRun(open.team);
    else await selection.onSelectTeamMember(open.target);
    return selected.has(key);
  };

  /**
   * Runs the row's shared open action, then settles the pending open. A selected row commits; a run delegated on this
   * node is shown as its own run (rule 2), so its open commits once that run is open, and fails when that open fails:
   * until then there is nothing to show (CR-461-053 F-34, CR-461-057, CR-461-062: one owner for every view's rows).
   * Anything else (failed, rejected, superseded by the store, stream recovery) fails the pending open.
   */
  const settle = async (key: string, rowOpen: MobileRowOpen): Promise<void> => {
    try {
      if (await runSharedAction(key, rowOpen)) {
        const own = delegatedRunOf(rowOpen);
        if (own) await delegatedRuns.whenOpen(own);
        if (!own || (!delegatedRuns.errorFor(own) && delegatedRuns.bindingOf(own))) {
          opening.commit(key);
          return;
        }
      }
    } catch (error) {
      console.warn('[mobile] Failed to open run:', error);
    } finally {
      selected.delete(key);
    }
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
