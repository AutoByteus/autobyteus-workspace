<template>
  <div class="ml-5 space-y-0.5 border-l border-gray-200/80 pl-2">
    <template
      v-for="displayRow in visibleTeamExecutionRows"
      :key="`${displayRow.row.kind}:${displayRow.row.memberRouteKey}`"
    >
      <div
        v-if="displayRow.row.kind === 'stable_member'"
        class="flex w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="displayRow.row.memberRouteKey === focusedTeamMemberRouteKey ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
        :style="teamExecutionRowStyle(displayRow.row)"
        :data-test="`workspace-team-member-${session.teamRun.teamRunId}-${displayRow.row.memberRouteKey}`"
        data-row-kind="stable_member"
        role="button"
        tabindex="0"
        @click="selectTeamDisplayRow(displayRow.row)"
        @keydown.enter="selectTeamDisplayRow(displayRow.row)"
        @keydown.space.prevent="selectTeamDisplayRow(displayRow.row)"
      >
        <button
          v-if="displayRow.hasChildren"
          type="button"
          class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-test="workspace-team-member-disclosure"
          :data-team-run-id="session.teamRun.teamRunId"
          :data-member-route-key="displayRow.row.memberRouteKey"
          :aria-expanded="isTeamDisplayRowExpanded(displayRow.row)"
          @click.stop="toggleTeamDisplayRow(displayRow.row)"
          @keydown.enter.stop
          @keydown.space.stop
        >
          <Icon
            icon="heroicons:chevron-down-20-solid"
            class="h-3.5 w-3.5 transition-transform"
            :class="isTeamDisplayRowExpanded(displayRow.row) ? 'rotate-0' : '-rotate-90'"
            aria-hidden="true"
          />
        </button>
        <span
          v-else
          class="ml-2 mr-1 h-3.5 w-3.5 flex-shrink-0"
          aria-hidden="true"
        />

        <div class="flex min-w-0 flex-1 items-center justify-between py-1 pr-2">
          <div class="flex min-w-0 items-center">
            <StatusDot class="mr-2" kind="agent" :status="displayRow.row.row.currentStatus" />
            <span class="truncate">{{ displayRow.row.displayName }}</span>
            <span
              v-if="displayRow.row.row.memberKind === 'agent_team'"
              class="ml-1 rounded bg-slate-100 px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500"
            >Team</span>
          </div>

          <span class="ml-2 flex-shrink-0 text-xs text-gray-400">
            {{ state.formatRelativeTime(displayRow.row.row.lastActivityAt) }}
          </span>
        </div>
      </div>
      <WorkspaceTransientExecutionRow
        v-else
        :row="displayRow.row"
        :focused="displayRow.row.memberRouteKey === focusedTeamMemberRouteKey"
        :has-children="displayRow.hasChildren"
        :expanded="isTeamDisplayRowExpanded(displayRow.row)"
        @select="selectTeamDisplayRow"
        @toggle="toggleTeamDisplayRow"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue';
import type {
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { WorkspaceHistoryTeamSessionRow } from '~/stores/runHistorySessionProjection';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';
import {
  buildWorkspaceTeamExecutionDisplayRows,
  type WorkspaceStableMemberDisplayRow,
  type WorkspaceTeamExecutionDisplayRow,
} from '~/utils/workspaceTeamExecutionDisplayRows';

interface VisibleTeamExecutionRow {
  row: WorkspaceTeamExecutionDisplayRow;
  hasChildren: boolean;
}

const props = defineProps<{
  workspaceId: string;
  session: WorkspaceHistoryTeamSessionRow;
  state: WorkspaceHistorySectionState;
  actions: WorkspaceHistorySectionActions;
}>();

const rootTeamMembers = computed<readonly TeamMemberTreeRow[]>(() => (
  props.session.teamRun.memberTree.length > 0
    ? props.session.teamRun.memberTree
    : props.session.teamRun.members
));

const teamExecutionRows = computed<WorkspaceTeamExecutionDisplayRow[]>(() =>
  buildWorkspaceTeamExecutionDisplayRows({
    team: props.session.teamRun,
    teamContext: props.state.getLiveTeamContext(props.session.teamRun.teamRunId),
  }),
);

const stableRowHasChildren = (
  row: WorkspaceTeamExecutionDisplayRow,
): row is WorkspaceStableMemberDisplayRow => (
  row.kind === 'stable_member'
  && row.row.memberKind === 'agent_team'
  && row.row.children.length > 0
);

const transientRowHasChildren = (
  row: WorkspaceTeamExecutionDisplayRow,
  index: number,
  rows: readonly WorkspaceTeamExecutionDisplayRow[],
): boolean => row.kind === 'transient_execution'
  && row.transientKind === 'task_team'
  && (rows[index + 1]?.depth ?? -1) > row.depth;

const teamDisplayRowHasChildren = (
  row: WorkspaceTeamExecutionDisplayRow,
  index: number,
  rows: readonly WorkspaceTeamExecutionDisplayRow[],
): boolean => stableRowHasChildren(row) || transientRowHasChildren(row, index, rows);

const isTeamDisplayRowExpanded = (row: WorkspaceTeamExecutionDisplayRow): boolean =>
  props.state.isTeamMemberExpanded(
    props.workspaceId,
    props.session.teamRun.teamRunId,
    row.memberRouteKey,
  );

const toggleTeamDisplayRow = (row: WorkspaceTeamExecutionDisplayRow): void =>
  props.state.toggleTeamMember(
    props.workspaceId,
    props.session.teamRun.teamRunId,
    row.memberRouteKey,
  );

const visibleTeamExecutionRows = computed<VisibleTeamExecutionRow[]>(() => {
  const visibleRows: VisibleTeamExecutionRow[] = [];
  let collapsedDepth: number | null = null;

  for (const [index, row] of teamExecutionRows.value.entries()) {
    if (collapsedDepth !== null) {
      if (row.depth > collapsedDepth) {
        continue;
      }
      collapsedDepth = null;
    }

    const hasChildren = teamDisplayRowHasChildren(row, index, teamExecutionRows.value);
    visibleRows.push({ row, hasChildren });

    if (hasChildren && !isTeamDisplayRowExpanded(row)) {
      collapsedDepth = row.depth;
    }
  }

  return visibleRows;
});

const focusedTeamMemberRouteKey = computed(() => (
  props.state.getLiveTeamContext(props.session.teamRun.teamRunId)?.focusedMemberRouteKey
  || props.session.teamRun.focusedMemberRouteKey
));

const teamExecutionRowStyle = (row: WorkspaceTeamExecutionDisplayRow): Record<string, string> => ({
  marginLeft: `${row.depth * 8}px`,
});

const selectTeamDisplayRow = (row: WorkspaceTeamExecutionDisplayRow): Promise<void> | void =>
  props.actions.onSelectTeamMember(
    row,
    props.workspaceId,
    rootTeamMembers.value,
  );
</script>
