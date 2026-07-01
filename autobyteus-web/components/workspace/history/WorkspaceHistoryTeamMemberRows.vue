<template>
  <div class="ml-5 space-y-0.5 border-l border-gray-200/80 pl-2">
    <div
      v-for="row in visibleTeamMemberRows"
      :key="row.member.memberRouteKey"
      class="flex w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :class="row.member.memberRouteKey === session.teamRun.focusedMemberRouteKey ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
      :style="{ marginLeft: `${row.depth * 8}px` }"
      :data-test="`workspace-team-member-${session.teamRun.teamRunId}-${row.member.memberRouteKey}`"
      role="button"
      tabindex="0"
      @click="selectTeamMember(row.member)"
      @keydown.enter="selectTeamMember(row.member)"
      @keydown.space.prevent="selectTeamMember(row.member)"
    >
      <button
        v-if="row.hasChildren"
        type="button"
        class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-test="workspace-team-member-disclosure"
        :data-team-run-id="session.teamRun.teamRunId"
        :data-member-route-key="row.member.memberRouteKey"
        :aria-expanded="state.isTeamMemberExpanded(workspaceId, session.teamRun.teamRunId, row.member.memberRouteKey)"
        @click.stop="state.toggleTeamMember(workspaceId, session.teamRun.teamRunId, row.member.memberRouteKey)"
        @keydown.enter.stop
        @keydown.space.stop
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="h-3.5 w-3.5 transition-transform"
          :class="state.isTeamMemberExpanded(workspaceId, session.teamRun.teamRunId, row.member.memberRouteKey) ? 'rotate-0' : '-rotate-90'"
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
          <StatusDot class="mr-2" kind="agent" :status="row.member.currentStatus" />
          <span class="truncate">{{ teamMemberDisplayName(row.member) }}</span>
          <span
            v-if="row.member.memberKind === 'agent_team'"
            class="ml-1 rounded bg-slate-100 px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500"
          >Team</span>
        </div>

        <span class="ml-2 flex-shrink-0 text-xs text-gray-400">
          {{ state.formatRelativeTime(row.member.lastActivityAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type {
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { WorkspaceHistoryTeamSessionRow } from '~/stores/runHistorySessionProjection';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';

interface VisibleTeamMemberRow {
  member: TeamMemberTreeRow;
  depth: number;
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

const visibleTeamMemberRows = computed<VisibleTeamMemberRow[]>(() => {
  const collect = (
    members: readonly TeamMemberTreeRow[],
    depth: number,
  ): VisibleTeamMemberRow[] => members.flatMap((member) => {
    const hasChildren = member.memberKind === 'agent_team' && member.children.length > 0;
    const row: VisibleTeamMemberRow = {
      member,
      depth,
      hasChildren,
    };

    if (!hasChildren || !props.state.isTeamMemberExpanded(
      props.workspaceId,
      props.session.teamRun.teamRunId,
      member.memberRouteKey,
    )) {
      return [row];
    }

    return [
      row,
      ...collect(member.children, depth + 1),
    ];
  });

  return collect(rootTeamMembers.value, 0);
});

const teamMemberDisplayName = (member: TeamMemberTreeRow): string => (
  member.displayName || member.memberName || member.memberRouteKey || 'Member'
);

const selectTeamMember = (member: TeamMemberTreeRow): Promise<void> | void => {
  return props.actions.onSelectTeamMember(
    member,
    props.workspaceId,
    rootTeamMembers.value,
  );
};
</script>
