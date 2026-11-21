<template>
  <!-- Rows of a DONE Task leave with motion. -->
  <TransitionGroup
    tag="div"
    name="tree-row"
    class="team-execution-tree ml-3 space-y-0.5"
    role="tree"
    :aria-label="t('workspace.history.hierarchy.tree_label', { name: treeLabel })"
    data-test="workspace-team-execution-tree"
    @before-leave="onBeforeLeave"
    @after-leave="onLeaveSettled"
    @leave-cancelled="onLeaveSettled"
  >
    <template v-for="displayRow in visibleRows" :key="displayRow.row.rowKey">
      <WorkspaceStableExecutionRow
        v-if="displayRow.row.kind === 'stable_member'"
        :row="displayRow.row"
        :avatars="avatars"
        :age="formatRelativeTime(team.lastActivityAt)"
        :is-selected="isSelected(displayRow.row)"
        :has-children="displayRow.hasChildren"
        :expanded="displayRow.expanded"
        :continuing-ancestor-depths="displayRow.continuingAncestorDepths"
        :has-following-sibling="displayRow.hasFollowingSibling"
        @activate="activateStableRow"
        @toggle="$emit('toggle', $event)"
      />
      <WorkspaceDelegatedRunRow
        v-else
        :row="displayRow.row"
        :team-status="displayRow.teamStatus ?? teamStatusOf(displayRow.row)"
        :is-selected="isSelected(displayRow.row)"
        :has-children="displayRow.hasChildren"
        :expanded="displayRow.expanded"
        :continuing-ancestor-depths="displayRow.continuingAncestorDepths"
        :has-following-sibling="displayRow.hasFollowingSibling"
        :task="taskOf(displayRow.row)"
        :stop-root="{ rootKind: 'AGENT_TEAM', rootRunId: team.teamRunId }"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @locate-task="(task: TaskWorkerTask) => locate(task, () => emit('open-run'))"
      />
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRunTreeStore } from '~/stores/runTreeStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunStatusStore } from '~/stores/runStatusStore';
import { isTeamRow, runTreeDisplayRows } from '~/utils/runTree/runTreeDisplayRows';
import WorkspaceStableExecutionRow from '~/components/workspace/history/WorkspaceStableExecutionRow.vue';
import WorkspaceDelegatedRunRow from '~/components/workspace/history/WorkspaceDelegatedRunRow.vue';
import { useLeavingTreeRows } from '~/components/workspace/history/useLeavingTreeRows';
import { teamBranchStatus } from '~/components/workspace/history/workspaceHistoryTeamBranchStatus';
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus';
import { useLocalization } from '~/composables/useLocalization';
import { useTaskWorkerTasks } from '~/composables/projects/useTaskWorkerTasks';
import type { TaskWorkerTask } from '~/types/project';
import type { WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';

interface VisibleTeamExecutionRow {
  row: RunHistoryTeamExecutionRow;
  hasChildren: boolean;
  expanded: boolean;
  /** A delegated team row's own status (its run's, SR-086 G-A4); null for the Team's own rows. */
  teamStatus: TeamStatus | null;
  continuingAncestorDepths: number[];
  hasFollowingSibling: boolean;
}

const props = defineProps<{
  team: TeamTreeNode;
  treeLabel: string;
  avatars: WorkspaceHistoryAvatarBindings;
  isTeamSelected: boolean;
  isRowExpanded: (rowKey: string) => boolean;
  formatRelativeTime: (isoTime: string) => string;
}>();

const emit = defineEmits<{
  (e: 'select', row: RunHistoryTeamExecutionRow): void;
  (e: 'toggle', row: RunHistoryTeamExecutionRow): void;
  /** Open this Team run without collapsing it (a Task summary located from a page without a right panel, REQ-012). */
  (e: 'open-run'): void;
}>();

const { t } = useLocalization();
// The Team run row (its open button) directly precedes this tree.
const { onBeforeLeave, onLeaveSettled } = useLeavingTreeRows(
  (tree) => tree.previousElementSibling?.querySelector<HTMLElement>('button') ?? null);

// The Team run's tree, built on the server (autobyteus-461 SR-084): its open view's stream feeds it, else it is read while
// the Team is expanded, and read again when its rows change. Its own members show as the Team's own rows.
const trees = useRunTreeStore();
const runStatus = useRunStatusStore();
const treeRef = computed(() => ({ kind: 'agent_team' as const, runId: props.team.teamRunId }));
watch(() => props.team.teamRunId, (_id, _previous, onCleanup) => onCleanup(trees.hold(treeRef.value)), { immediate: true });

const ownRowsByAgentRunId = computed(() => new Map(props.team.executionRows.flatMap((row) => row.agentRunId ? [[row.agentRunId, row] as const] : [])));

/** The server's rows under the Team run's own row; a team row starts collapsed, any other row expanded (`isRowExpanded` names the toggled ones). */
const treeRows = computed<VisibleTeamExecutionRow[]>(() => {
  const rootKey = `team:${props.team.teamRunId}`;
  return runTreeDisplayRows({
    rows: trees.rowsOf(treeRef.value), rootKey, topRunId: props.team.teamRunId,
    isExpanded: (row) => isTeamRow(row) === props.isRowExpanded(row.key),
    statusOf: (row, id) => row.kind === 'team' || row.kind === 'peer_team'
      ? runStatus.runStateOf({ kind: 'agent_team', runId: id })?.status ?? null
      : runStatus.statusOf(id),
  }).map((display) => {
    const own = display.tree.kind === 'team_member' && display.tree.parentKey === rootKey && display.tree.openTarget
      ? ownRowsByAgentRunId.value.get(display.tree.openTarget.agentRunId) : undefined;
    const row: RunHistoryTeamExecutionRow = own
      ? { ...own, rowKey: display.tree.key, depth: display.row.depth, hasChildren: display.row.hasChildren, ...(display.tree.leaving ? { leaving: true } : {}) }
      : display.row;
    return { row, hasChildren: display.row.hasChildren, expanded: isTeamRow(display.tree) === props.isRowExpanded(display.tree.key),
      teamStatus: own ? null : display.teamStatus, continuingAncestorDepths: display.continuingAncestorDepths, hasFollowingSibling: display.hasFollowingSibling };
  });
});

const visibleRows = computed<VisibleTeamExecutionRow[]>(() => trees.hasTree(treeRef.value) ? treeRows.value : ownRows.value);

/** Until the tree answers: the Team's own members, from its own history. */
const ownRows = computed<VisibleTeamExecutionRow[]>(() => {
  const uncollapsedRows: Array<Pick<VisibleTeamExecutionRow, 'row' | 'hasChildren'>> = [];
  let collapsedDepth: number | null = null;

  for (const row of props.team.executionRows) {
    if (collapsedDepth !== null) {
      if (row.depth > collapsedDepth) continue;
      collapsedDepth = null;
    }

    uncollapsedRows.push({ row, hasChildren: row.hasChildren });
    if (row.hasChildren && !props.isRowExpanded(row.rowKey)) collapsedDepth = row.depth;
  }

  const hasFollowingSiblingAtDepth = (index: number, depth: number): boolean => {
    for (let nextIndex = index + 1; nextIndex < uncollapsedRows.length; nextIndex += 1) {
      const nextDepth = uncollapsedRows[nextIndex].row.depth;
      if (nextDepth < depth) return false;
      if (nextDepth === depth) return true;
    }
    return false;
  };

  return uncollapsedRows.map((entry, index) => ({
    ...entry,
    expanded: props.isRowExpanded(entry.row.rowKey),
    teamStatus: null,
    continuingAncestorDepths: Array.from(
      { length: entry.row.depth },
      (_, depth) => depth,
    ).filter((depth) => hasFollowingSiblingAtDepth(index, depth)),
    hasFollowingSibling: hasFollowingSiblingAtDepth(index, entry.row.depth),
  }));
});

// Task workers show their current Task's summary; it locates the Task in Projects.
const { taskOf, locate } = useTaskWorkerTasks(() => visibleRows.value.map((displayRow) => displayRow.row));

/** The selected row: a run the Team delegated, when one is selected under it (SR-084); else its focused member. */
const teamContexts = useAgentTeamContextsStore();
const isSelected = (row: RunHistoryTeamExecutionRow): boolean => {
  if (!props.isTeamSelected) return false;
  // The row that shows the opened agent (CR-461-108): a delegated Team opened at its coordinator selects the coordinator's row.
  const delegated = teamContexts.selectedTreeRowOf(props.team.teamRunId);
  return row.agentRunId !== null && row.agentRunId === (delegated ? delegated.target.agentRunId : props.team.focusedAgentRunId);
};

/** Derived from the current rows on every render, so member status patches and collapse stay current. */
const teamStatusOf = (row: RunHistoryTeamExecutionRow): TeamStatus =>
  teamBranchStatus(props.team.executionRows, row, props.team.isActive);

/** A member opens itself; a team row also toggles. A member's delegated rows fold with its disclosure button only. */
const activateStableRow = (row: RunHistoryStableExecutionRow): void => {
  if (row.hasChildren && row.memberKind === 'agent_team') emit('toggle', row);
  if (row.agentRunId) emit('select', row);
};
</script>

<style scoped src="./treeRowLeave.css"></style>
