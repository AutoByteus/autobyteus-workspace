import { computed, watch } from 'vue';
import { useTaskWorkerTasks } from '~/composables/projects/useTaskWorkerTasks';
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
import { taskWorkerTaskLabel } from '~/utils/projects/taskText';
import {
  buildMobileRunTreeRows,
  openAgentRunIdOf,
  type MobileRowFold,
  type MobileRunTreeRow,
} from '~/utils/mobile/mobileRunTreeProjection';

/** The phone folds Org runs' delegated Teams and unfolds Org runs (REQ-002, AR-004). */
const PHONE_DEFAULT_EXPANSION = Object.freeze({ orgRuns: true, orgTaskTeams: false });

/** The rows above `isTarget`'s row in a depth-ordered tree list that contain it, nearest first. */
const ancestorsOf = <T>(rows: readonly T[], depthOf: (row: T) => number, isTarget: (row: T) => boolean): T[] => {
  const index = rows.findIndex(isTarget);
  if (index < 0) return [];
  const ancestors: T[] = [];
  let depth = depthOf(rows[index]!);
  for (let at = index - 1; at >= 0 && depth > 0; at -= 1) {
    if (depthOf(rows[at]!) >= depth) continue;
    ancestors.push(rows[at]!);
    depth = depthOf(rows[at]!);
  }
  return ancestors;
};

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

  // The listed Task workers' current Tasks (the desktop's second line; summaries only, no locating on the phone).
  const { taskOf } = useTaskWorkerTasks(() => runListStore.shownEntries.flatMap((entry) => entry.kind === 'agent'
    ? collaboration.taskRows(entry.runId).map((display) => display.row)
    : entry.kind === 'team' ? entry.team.executionRows : []));

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
    taskSummary: (row) => {
      const task = taskOf(row);
      return task ? taskWorkerTaskLabel(task) : null;
    },
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

  /**
   * Opens every fold on the path to a row, never closing one (autobyteus-435 DS-006 restore): the older runs' fold for
   * its run; a Team member's Team and each ancestor Team row (from the Team's rows in the history read); a delegated
   * row's run and each ancestor task Team (from the run's published view). A row whose run is not listed reveals nothing.
   */
  const revealRow = (key: string): void => {
    const slash = key.indexOf('/');
    const entry = runListStore.entries.find((candidate) => candidate.key === (slash < 0 ? key : key.slice(0, slash)));
    if (!entry) return;
    runListStore.showRun(entry.runId);
    if (slash < 0) return;
    const rowKey = key.slice(slash + 1);
    if (entry.kind === 'team') {
      disclosure.setTeamExpanded(entry.runId, true);
      for (const row of ancestorsOf(entry.team.executionRows, (row) => row.depth, (row) => row.rowKey === rowKey)) {
        if (!disclosure.isRowExpanded(entry.runId, row.rowKey)) disclosure.toggleTeamMember(entry.runId, row.rowKey);
      }
    } else if (entry.kind === 'agent') {
      if (!disclosure.isRunExpanded(entry.runId)) disclosure.toggleRun(entry.runId);
      const taskRows = collaboration.contextFor(entry.runId)?.listTaskRows(() => true) ?? [];
      for (const { row } of ancestorsOf(taskRows, ({ row }) => row.depth, ({ row }) => row.rowKey === rowKey)) {
        const teamRunId = row.teamRunIdForNode;
        if (teamRunId && !collaboration.isTaskTeamExpanded(entry.runId, teamRunId)) collaboration.toggleTaskTeam(entry.runId, teamRunId);
      }
    }
  };

  return {
    rows, openRowKey, openRow, openRowParent, toggle, revealRow,
    /** The shared disclosure's open actions for the selection actions (Team runs and members open their ancestors). */
    setTeamExpanded: disclosure.setTeamExpanded,
    toggleTeam: disclosure.toggleTeam,
    expandTeamMemberAncestors: disclosure.expandTeamMemberAncestors,
  };
}
