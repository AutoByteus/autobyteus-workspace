import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { useLocalization } from '~/composables/useLocalization';
import { useToasts } from '~/composables/useToasts';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import {
  agentOrgRouteQuery,
  useWorkspaceHistorySubjectActions,
  type WorkspaceHistorySubjectAction,
} from '~/composables/useWorkspaceHistorySubjectActions';
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore';
import { subjectOfTarget, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { openRunTarget } from '~/composables/useRunOpening';
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows';
import { treeRefOf } from '~/utils/mobile/mobileRunListRows';
import { useMobileRunOpeningStore } from '~/stores/mobileRunOpeningStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { MobileRowOpen, MobileRunTreeRow } from '~/utils/mobile/mobileRunListRows';
import { agentOrgFirstMemberAddress } from '~/utils/agentOrgFirstMemberAddress';
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes';

type OrgOpen = Readonly<{ orgRun: AgentOrgRunHistoryItem; command: WorkspaceHistorySubjectAction }>;
/**
 * An Org's open as its shared action takes it: the Org run opens its first configured member (REQ-003a); an Org's own
 * agent or mounted team by its address; a run it delegated where the server says (a team row at its coordinator).
 */
const orgOpenOf = (open: MobileRowOpen): OrgOpen | null => {
  if (open.kind === 'orgRun') {
    return { orgRun: open.orgRun, command: { rootSubjectKind: 'agent_org', rootRunId: open.orgRun.rootRunId, action: 'select',
      memberAddress: agentOrgFirstMemberAddress(open.orgRun) ?? '' } };
  }
  if (open.kind !== 'treeRow' || open.entry.kind !== 'org') return null;
  const { row } = open;
  const rootRunId = open.entry.orgRun.rootRunId;
  if (row.kind === 'org_team' || row.openTarget?.runKind === 'agent_org') {
    return { orgRun: open.entry.orgRun, command: { rootSubjectKind: 'agent_org', rootRunId, action: 'select', memberAddress: row.address ?? '' } };
  }
  return { orgRun: open.entry.orgRun, command: { rootSubjectKind: 'agent_org', rootRunId, action: 'inspect', agentRunId: row.openTarget!.agentRunId,
    memberAddress: isTeamRow(row) ? '' : row.address ?? '' } };
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
  const delegatedRuns = useDelegatedRunsStore();
  /**
   * The run delegated on this node that a row opens (rule 2), by the server's target (SR-084): `null` for a listed run's
   * own agents and members, a peer's run and a run itself.
   */
  const delegatedRunOf = (open: MobileRowOpen): DelegatedRunSubject | null => {
    if (open.kind !== 'treeRow') return null;
    const target = open.row.openTarget;
    if (!target || target.runKind === 'agent_org' || target.nodeId) return null;
    const top = treeRefOf(open.entry);
    if (target.runKind === top.kind && target.runId === top.runId) return null;
    return subjectOfTarget(target as Parameters<typeof subjectOfTarget>[0]);
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
    const org = orgOpenOf(open);
    if (org) return (await subject.execute(org.command)).disposition === 'committed';
    if (open.kind === 'agentRun') await selection.onOpenAgentRun(open.run);
    else if (open.kind === 'team') await selection.onOpenTeamRun(open.team);
    else if (open.kind === 'treeRow' && open.entry.kind === 'agent') {
      // The one open path of a tree row (SR-084): where the server says, selected in its run's tree.
      if (openRunTarget(treeRefOf(open.entry), open.row)) await selection.onSelectRun(open.entry.run);
    } else if (open.kind === 'treeRow' && open.entry.kind === 'team' && open.row.openTarget) {
      await selection.onSelectTeamMember({ teamRunId: open.entry.runId, memberAddress: open.row.address ?? '', agentRunId: open.row.openTarget.agentRunId });
    }
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
    const org = orgOpenOf(rowOpen);
    await navigation.openRun(org ? { orgQuery: agentOrgRouteQuery(org.orgRun, org.command, org.orgRun.isActive) } : { rowKey: row.key });
    await settle(row.key, rowOpen);
  };

  /**
   * The page-start restore (autobyteus-435 DS-006): the route already names the row and its screen, and the restore
   * began the pending open, so only the shared open action runs, with no navigation.
   */
  const reopen = async (row: MobileRunTreeRow & { open: MobileRowOpen }): Promise<void> => settle(row.key, row.open);

  return { open, reopen };
}
