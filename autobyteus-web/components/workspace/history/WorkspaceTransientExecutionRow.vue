<template>
  <div
    class="flex w-full cursor-pointer items-center rounded-md bg-indigo-50/40 text-sm transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
    :class="isSelected ? 'text-indigo-900 ring-1 ring-indigo-200' : 'text-gray-600'"
    :style="rowStyle"
    data-test="workspace-team-transient-execution-row"
    data-row-kind="transient_execution"
    :data-transient-kind="row.transientKind"
    :data-team-run-id="row.teamRunId"
    :data-member-address="row.memberAddress"
    :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.temporary_execution_title')"
    :aria-label="ariaLabel"
    :aria-current="isSelected ? 'true' : undefined"
    role="button"
    tabindex="0"
    @click="activateRow"
    @keydown.enter="activateRow"
    @keydown.space.prevent="activateRow"
  >
    <button
      v-if="hasChildren"
      type="button"
      class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-test="workspace-team-transient-disclosure"
      :data-team-run-id="row.teamRunId"
      :data-member-address="row.memberAddress"
      :aria-expanded="expanded"
      @click.stop="$emit('toggle', row)"
      @keydown.enter.stop
      @keydown.space.stop
    >
      <Icon
        icon="heroicons:chevron-down-20-solid"
        class="h-3.5 w-3.5 transition-transform"
        :class="expanded ? 'rotate-0' : '-rotate-90'"
        aria-hidden="true"
      />
    </button>
    <span
      v-else
      class="ml-2 mr-1 h-3.5 w-3.5 flex-shrink-0"
      aria-hidden="true"
    />

    <div class="flex min-w-0 flex-1 items-center py-1 pr-2">
      <StatusDot
        v-if="row.memberKind === 'agent'"
        class="mr-1.5"
        data-test="workspace-transient-status-dot"
        :status="row.currentStatus"
        variant="transient"
      />
      <span class="truncate">{{ row.displayName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';

const props = withDefaults(defineProps<{
  row: RunHistoryTransientExecutionRow;
  isSelected?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
}>(), {
  isSelected: false,
  hasChildren: false,
  expanded: false,
});

const emit = defineEmits<{
  (e: 'select', row: RunHistoryTransientExecutionRow): void;
  (e: 'toggle', row: RunHistoryTransientExecutionRow): void;
}>();

const rowStyle = computed(() => ({
  marginLeft: `${props.row.depth * 12}px`,
}));

const ariaLabel = computed(() => `${props.row.displayName}. ${props.row.memberAddress}`);

const activateRow = (): void => {
  if (props.hasChildren) {
    emit('toggle', props.row);
  }
  emit('select', props.row);
};
</script>
