<template>
  <div
    class="team-execution-tree ml-3 space-y-0.5"
    role="tree"
    :aria-label="t('workspace.history.hierarchy.tree_label', { name: treeLabel })"
    data-test="workspace-team-execution-tree"
  >
    <template v-for="displayRow in visibleRows" :key="displayRow.row.rowKey">
      <WorkspaceStableExecutionRow
        v-if="displayRow.row.kind === 'stable_member'"
        :row="displayRow.row"
        :avatars="avatars"
        :aggregate-status="nestedTeamStatus(displayRow.row)"
        :age="formatRelativeTime(team.lastActivityAt)"
        :is-selected="isSelected(displayRow.row)"
        :has-children="displayRow.hasChildren"
        :expanded="isRowExpanded(displayRow.row.rowKey)"
        :continuing-ancestor-depths="displayRow.continuingAncestorDepths"
        :has-following-sibling="displayRow.hasFollowingSibling"
        @activate="activateStableRow"
        @toggle="$emit('toggle', $event)"
      />
      <WorkspaceTransientExecutionRow
        v-else
        :row="displayRow.row"
        :is-selected="isSelected(displayRow.row)"
        :has-children="displayRow.hasChildren"
        :expanded="isRowExpanded(displayRow.row.rowKey)"
        :continuing-ancestor-depths="displayRow.continuingAncestorDepths"
        :has-following-sibling="displayRow.hasFollowingSibling"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WorkspaceStableExecutionRow from '~/components/workspace/history/WorkspaceStableExecutionRow.vue';
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue';
import { aggregateNestedTeamAgentStatus } from '~/components/workspace/history/workspaceHistoryNestedTeamStatus';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useLocalization } from '~/composables/useLocalization';
import type { WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts';
import type {
  RunHistoryStableExecutionRow,
  RunHistoryTeamExecutionRow,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';

interface VisibleTeamExecutionRow {
  row: RunHistoryTeamExecutionRow;
  hasChildren: boolean;
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
}>();

const { t } = useLocalization();

const visibleRows = computed<VisibleTeamExecutionRow[]>(() => {
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
    continuingAncestorDepths: Array.from(
      { length: entry.row.depth },
      (_, depth) => depth,
    ).filter((depth) => hasFollowingSiblingAtDepth(index, depth)),
    hasFollowingSibling: hasFollowingSiblingAtDepth(index, entry.row.depth),
  }));
});

const isSelected = (row: RunHistoryTeamExecutionRow): boolean =>
  props.isTeamSelected
  && row.agentRunId !== null
  && row.agentRunId === props.team.focusedAgentRunId;

const nestedTeamStatus = (row: RunHistoryStableExecutionRow): AgentStatus =>
  row.memberKind === 'agent_team'
    ? aggregateNestedTeamAgentStatus(props.team.executionRows, row)
    : AgentStatus.Offline;

const activateStableRow = (row: RunHistoryStableExecutionRow): void => {
  if (row.hasChildren) emit('toggle', row);
  if (row.agentRunId) emit('select', row);
};
</script>
