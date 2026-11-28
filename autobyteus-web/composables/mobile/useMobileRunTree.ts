import { computed, onScopeDispose, watch } from 'vue';
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts';
import { useTaskWorkerTasks } from '~/composables/projects/useTaskWorkerTasks';
import { useRouteSelectedAgentOrg } from '~/composables/runHistory/useRouteSelectedAgentOrg';
import { useRunListDisclosure } from '~/composables/useRunListDisclosure';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useRunListStore } from '~/stores/runListStore';
import { useRunStatusStore } from '~/stores/runStatusStore';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useDefinitionAvatarStore } from '~/stores/definitionAvatarStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { taskWorkerTaskLabel } from '~/utils/projects/taskText';
import type { RunListEntry } from '~/utils/runListProjection';
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows';
import { resolveTeamStatus } from '~/utils/workspaceTeamAggregateStatus';
import {
  buildMobileRunListRows,
  openAgentRunIdOf,
  treeDisplayRowsOf,
  treeRefOf,
  type MobileRowFold,
  type MobileRunTreeRow,
} from '~/utils/mobile/mobileRunListRows';

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
  const activeContext = useActiveContextStore();
  const trees = useRunTreeStore();
  const runStatus = useRunStatusStore();

  const disclosure = useRunListDisclosure({
    runHistoryStore, runListStore, selectionStore,
    selectedAgentOrg: useRouteSelectedAgentOrg(),
    hasSelectedChild: (runId) => Boolean(collaboration.selectedChild(runId)),
    defaultExpansion: PHONE_DEFAULT_EXPANSION,
  });

  const isEntryExpanded = (entry: RunListEntry) => entry.kind === 'agent' ? disclosure.isRunExpanded(entry.runId)
    : entry.kind === 'team' ? disclosure.isTeamExpanded(entry.runId) : disclosure.isAgentOrgRunExpanded(entry.runId);
  // Each shown run's tree, built on the server (SR-084): an Agent run's while it is listed with delegated work (its
  // second line and fold need it), a Team's or an Org's while it is unfolded; read when first shown and again when its
  // rows change (AR-028). Held per run: a run that stays shown keeps its hold across a list reload, so its tree is not
  // read again (CR-461-112); only the runs that came are held, and only those that left are released.
  const treeShown = (entry: RunListEntry): boolean => entry.kind === 'agent' ? entry.run.hasCollaboration === true : isEntryExpanded(entry);
  const treeHolds = new Map<string, () => void>();
  watch(() => runListStore.shownEntries.filter(treeShown).map((entry) => entry.key).sort().join('|'), () => {
    const shown = new Map(runListStore.shownEntries.filter(treeShown).map((entry) => [entry.key, entry]));
    for (const [key, entry] of shown) if (!treeHolds.has(key)) treeHolds.set(key, trees.hold(treeRefOf(entry)));
    for (const [key, release] of [...treeHolds]) {
      if (!shown.has(key)) { release(); treeHolds.delete(key); }
    }
  }, { immediate: true });
  onScopeDispose(() => { treeHolds.forEach((release) => release()); treeHolds.clear(); });

  /** A tree row folds by its run's disclosure: an Agent run's rows by key; a Team's by key; an Org's mounted team by address. */
  const isTreeRowExpanded = (entry: RunListEntry, row: RunTreeRowDto): boolean => {
    if (entry.kind === 'agent') return collaboration.isTreeRowExpanded(entry.runId, row);
    if (entry.kind === 'team') return isTeamRow(row) === disclosure.isRowExpanded(entry.runId, row.key);
    if (row.kind === 'org_team') return disclosure.isAgentOrgTeamExpanded(entry.runId, row.address ?? '');
    // A delegated team starts folded on the phone; an agent's delegated runs show beside it, as on the desktop (DEC-009):
    // its row starts unfolded and folds once toggled (the toggle flips the same stored value).
    return isTeamRow(row) ? disclosure.isAgentOrgTaskTeamExpanded(entry.runId, row.key) : !disclosure.isAgentOrgTaskTeamExpanded(entry.runId, row.key);
  };
  /** Each row's status is its own run's (SR-083, G-A4); an Org's mounted team's is its members', as the Org reports them. */
  const statusOf = (row: RunTreeRowDto, id: string): AgentStatus | string | null => {
    if (row.kind === 'team' || row.kind === 'peer_team') return runStatus.runStateOf({ kind: 'agent_team', runId: id })?.status ?? null;
    if (row.kind === 'org_team') return resolveTeamStatus(row.statusIds.map((agentRunId) => runStatus.statusOf(agentRunId)), true);
    return runStatus.statusOf(id);
  };
  const sources = { treeRows: (entry: RunListEntry) => trees.rowsOf(treeRefOf(entry)), statusOf, backgroundTasksOf: runStatus.treeRowBackgroundTasksOf, isTreeRowExpanded };

  // The listed Task workers' current Tasks (the desktop's second line; summaries only, no locating on the phone).
  const { taskOf } = useTaskWorkerTasks(() => runListStore.shownEntries.flatMap((entry) => treeDisplayRowsOf(entry, sources).map((display) => display.row)));

  const definitionAvatars = useDefinitionAvatarStore();
  const rows = computed<MobileRunTreeRow[]>(() => buildMobileRunListRows({
    entries: runListStore.shownEntries,
    ...sources,
    taskSummary: (row) => {
      const task = taskOf(row);
      return task ? taskWorkerTaskLabel(task) : null;
    },
    isRunExpanded: disclosure.isRunExpanded,
    isTeamExpanded: disclosure.isTeamExpanded,
    isAgentOrgRunExpanded: disclosure.isAgentOrgRunExpanded,
    avatarOf: definitionAvatars.avatarOf,
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

  const toggleTreeRow = (entry: RunListEntry, row: RunTreeRowDto): void => {
    if (entry.kind === 'agent') collaboration.toggleTreeRow(entry.runId, row.key);
    else if (entry.kind === 'team') disclosure.toggleTeamMember(entry.runId, row.key);
    else if (row.kind === 'org_team') disclosure.toggleAgentOrgTeam(entry.runId, row.address ?? '');
    else disclosure.toggleAgentOrgTaskTeam(entry.runId, row.key);
  };
  const toggle = (fold: MobileRowFold): void => {
    if (fold.kind === 'run') disclosure.toggleRun(fold.runId);
    else if (fold.kind === 'team') disclosure.toggleTeam(fold.teamRunId);
    else if (fold.kind === 'orgRun') disclosure.toggleAgentOrgRun(fold.rootRunId);
    else toggleTreeRow(fold.entry, fold.row);
  };

  /**
   * Opens every fold on the path to a row, never closing one (autobyteus-435 DS-006 restore): its run's fold, then each
   * row above it in its run's tree (the server's rows, by their keys). A row whose run is not listed reveals nothing.
   */
  /**
   * A tree row's key (`<listed run>/<tree row>`) names a row of its listed run's tree (SR-084), which exists once that tree
   * is read: read here when the window has none yet (a restore after a reload starts before the list's holds read it).
   */
  const ensureTreeOf = async (key: string): Promise<void> => {
    const slash = key.indexOf('/');
    const entry = slash > 0 ? runListStore.entries.find((candidate) => candidate.key === key.slice(0, slash)) : null;
    if (entry && !trees.hasTree(treeRefOf(entry))) await trees.read(treeRefOf(entry));
  };
  const revealRow = (key: string): void => {
    const slash = key.indexOf('/');
    const entry = runListStore.entries.find((candidate) => candidate.key === (slash < 0 ? key : key.slice(0, slash)));
    if (!entry) return;
    runListStore.showRun(entry.runId);
    if (entry.kind === 'team') disclosure.setTeamExpanded(entry.runId, true);
    else if (entry.kind === 'agent' ? !disclosure.isRunExpanded(entry.runId) : !disclosure.isAgentOrgRunExpanded(entry.runId)) {
      if (entry.kind === 'agent') disclosure.toggleRun(entry.runId); else disclosure.toggleAgentOrgRun(entry.runId);
    }
    if (slash < 0) return;
    const treeRows = trees.rowsOf(treeRefOf(entry));
    const byKey = new Map(treeRows.map((row) => [row.key, row]));
    for (let row = byKey.get(byKey.get(key.slice(slash + 1))?.parentKey ?? ''); row; row = byKey.get(row.parentKey ?? '')) {
      // An Agent's or a Team's own row is the listed run's (its fold is opened above); an Org's own parts fold themselves.
      if ((entry.kind === 'org' || row.parentKey !== null) && !isTreeRowExpanded(entry, row)) toggleTreeRow(entry, row);
    }
  };

  return {
    rows, openRowKey, openRow, openRowParent, toggle, revealRow, ensureTreeOf,
    /** The shared disclosure's open actions for the selection actions (Team runs and members open their ancestors). */
    setTeamExpanded: disclosure.setTeamExpanded,
    toggleTeam: disclosure.toggleTeam,
    expandTeamMemberAncestors: disclosure.expandTeamMemberAncestors,
  };
}
