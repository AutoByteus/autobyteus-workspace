<template>
  <button
    type="button"
    class="flex w-full items-center justify-between rounded-md border border-dashed border-indigo-100 bg-indigo-50/40 px-2 py-1 text-left text-sm transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
    :class="focused ? 'text-indigo-900 ring-1 ring-indigo-200' : 'text-gray-600'"
    :style="rowStyle"
    data-test="workspace-team-transient-execution-row"
    data-row-kind="transient_execution"
    :data-transient-kind="row.transientKind"
    :data-team-run-id="row.teamRunId"
    :data-member-route-key="row.memberRouteKey"
    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title')"
    :aria-label="ariaLabel"
    @click="$emit('select', row)"
  >
    <div class="flex min-w-0 items-center">
      <StatusDot
        class="mr-1.5"
        :kind="row.memberKind === 'agent_team' ? 'team' : 'agent'"
        :status="row.currentStatus"
      />
      <span
        class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-indigo-300 bg-white/80 text-[0.5625rem] font-semibold text-indigo-600"
        aria-hidden="true"
      >
        {{ initials }}
      </span>
      <span class="truncate">{{ row.displayName }}</span>
      <span class="sr-only">
        {{ $t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title') }}
      </span>
    </div>

    <span class="ml-2 h-2 w-2 flex-shrink-0 rounded-full border border-dashed border-indigo-300" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { WorkspaceTransientExecutionDisplayRow } from '~/utils/workspaceTeamExecutionDisplayRows';

const props = withDefaults(defineProps<{
  row: WorkspaceTransientExecutionDisplayRow;
  focused?: boolean;
}>(), {
  focused: false,
});

defineEmits<{
  (e: 'select', row: WorkspaceTransientExecutionDisplayRow): void;
}>();

const rowStyle = computed(() => ({
  marginLeft: `${props.row.depth * 12}px`,
}));

const initials = computed(() => {
  const words = props.row.displayName.trim().split(/[\s_-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || '•';
});

const ariaLabel = computed(() => `${props.row.displayName}. ${props.row.memberRouteKey}`);
</script>
