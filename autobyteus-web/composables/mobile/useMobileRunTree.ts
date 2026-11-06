import { computed, watch } from 'vue';
import { useRouteSelectedAgentOrg } from '~/composables/runHistory/useRouteSelectedAgentOrg';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useRemoteRunsStore } from '~/stores/remoteRunsStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useRunListStore } from '~/stores/runListStore';
import { projectAgentOrgHistoryRows } from '~/utils/agentOrgHistoryRows';
import {
  buildMobileRunTreeRows,
  openAgentRunIdOf,
  type MobileRowFold,
  type MobileRunTreeRow,
} from '~/utils/mobile/mobileRunTreeProjection';

/** The phone folds Org runs' delegated Teams and unfolds Org runs (REQ-002, AR-004). */
const PHONE_DEFAULT_EXPANSION = Object.freeze({ orgRuns: true, orgTaskTeams: false });

/**
 * The phone's run list rows (autobyteus-277 DS-002): the run list store's shown runs, each with the rows of its kind's
 * owner (the collaboration store, the Team rows, the Org rows) and one shared disclosure instance. It asks the
 * collaboration store for the stored views of listed Agent runs, and answers which row is open: the row of the open
 * target's agent.
 */
export function useMobileRunTree() {
  const runHistoryStore = useRunHistoryStore();
  const runListStore = useRunListStore();
  const selectionStore = useAgentSelectionStore();
  const collaboration = useAgentRunCollaborationStore();
  const orgContexts = useAgentOrgContextsStore();
  const remoteRuns = useRemoteRunsStore();
  const activeContext = useActiveContextStore();

  const disclosure = useRunListDisclosure({
    runHistoryStore, runListStore, selectionStore,
    selectedAgentOrg: useRouteSelectedAgentOrg(),
    hasSelectedChild: (runId) => Boolean(collaboration.selectedChild(runId)),
    defaultExpansion: PHONE_DEFAULT_EXPANSION,
  });

  // A listed Agent run's delegated work comes from its stored view, read once (a live run's stream keeps it current).
  watch(() => runListStore.shownEntries.flatMap((entry) => entry.kind === 'agent' && entry.run.hasCollaboration ? [entry.runId] : []),
    (runIds) => runIds.forEach((runId) => collaboration.ensureStoredView(runId, true)), { immediate: true });

  const rows = computed<MobileRunTreeRow[]>(() => buildMobileRunTreeRows({
    entries: runListStore.shownEntries,
    taskRows: (hostRunId) => collaboration.taskRows(hostRunId),
    orgRows: (orgRun) => projectAgentOrgHistoryRows({
      run: orgRun,
      context: orgContexts.contextFor(orgRun.rootRunId),
      isTeamExpanded: (address) => disclosure.isAgentOrgTeamExpanded(orgRun.rootRunId, address),
      isTaskTeamExpanded: (teamRunId) => disclosure.isAgentOrgTaskTeamExpanded(orgRun.rootRunId, teamRunId),
    }),
    remoteReachable: (runId) => remoteRuns.run(runId)?.reachable !== false,
    remoteTitle: (runId) => remoteRuns.run(runId)?.title ?? null,
    isRunExpanded: disclosure.isRunExpanded,
    isTeamExpanded: disclosure.isTeamExpanded,
    isTeamRowExpanded: disclosure.isRowExpanded,
    isAgentOrgRunExpanded: disclosure.isAgentOrgRunExpanded,
    isAgentOrgTeamExpanded: disclosure.isAgentOrgTeamExpanded,
    isTaskTeamExpanded: (hostRunId, teamRunId) => collaboration.isTaskTeamExpanded(hostRunId, teamRunId),
    isAgentOrgTaskTeamExpanded: disclosure.isAgentOrgTaskTeamExpanded,
  }));

  /** The open target's agent; its row is the open row. */
  const openAgentRunId = computed(() => activeContext.activeWorkspaceTarget?.context.state.runId ?? null);
  const openRowKey = computed(() => {
    const runId = openAgentRunId.value;
    return runId ? rows.value.find((row) => openAgentRunIdOf(row) === runId)?.key ?? null : null;
  });
  /** The open row's parent (the run screen's "in <parent>"); none for a top-level run. */
  const openRowParent = computed<MobileRunTreeRow | null>(() => {
    const index = rows.value.findIndex((row) => row.key === openRowKey.value);
    if (index < 0) return null;
    const depth = rows.value[index]!.depth;
    for (let at = index - 1; at >= 0; at -= 1) if (rows.value[at]!.depth < depth) return rows.value[at]!;
    return null;
  });
  const openRow = computed(() => rows.value.find((row) => row.key === openRowKey.value) ?? null);

  const toggle = (fold: MobileRowFold): void => {
    if (fold.kind === 'run') disclosure.toggleRun(fold.runId);
    else if (fold.kind === 'team') disclosure.toggleTeam(fold.teamRunId);
    else if (fold.kind === 'teamRow') disclosure.toggleTeamMember(fold.teamRunId, fold.rowKey);
    else if (fold.kind === 'taskTeam') collaboration.toggleTaskTeam(fold.hostRunId, fold.teamRunId);
    else if (fold.kind === 'orgRun') disclosure.toggleAgentOrgRun(fold.rootRunId);
    else if (fold.kind === 'orgTeam') disclosure.toggleAgentOrgTeam(fold.rootRunId, fold.address);
    else disclosure.toggleAgentOrgTaskTeam(fold.rootRunId, fold.teamRunId);
  };

  return {
    rows, openRowKey, openRow, openRowParent, toggle,
    /** The shared disclosure's open actions for the selection actions (Team runs and members open their ancestors). */
    setTeamExpanded: disclosure.setTeamExpanded,
    toggleTeam: disclosure.toggleTeam,
    expandTeamMemberAncestors: disclosure.expandTeamMemberAncestors,
  };
}
