<template>
  <div
    class="transient-execution-row relative flex min-h-7 w-full cursor-pointer items-center rounded-md border border-dashed border-indigo-200 bg-indigo-50/40 text-sm transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
    :class="rowClasses"
    :style="rowStyle"
    data-test="workspace-team-transient-execution-row"
    data-row-kind="transient_execution"
    :data-node-kind="row.memberKind"
    :data-transient-kind="row.transientKind"
    :data-team-run-id="row.teamRunId"
    :data-member-address="row.memberAddress"
    :data-tree-depth="row.depth"
    :title="identityLabel"
    :aria-label="accessibleLabel"
    :aria-current="isSelected ? 'true' : undefined"
    :aria-selected="isSelected"
    :aria-level="row.depth + 1"
    :aria-expanded="hasChildren ? expanded : undefined"
    role="treeitem"
    tabindex="0"
    @click="activateRow"
    @keydown.enter="activateRow"
    @keydown.space.prevent="activateRow"
  >
    <WorkspaceHierarchyBranches
      :depth="row.depth"
      :continuing-ancestor-depths="continuingAncestorDepths"
      :has-following-sibling="hasFollowingSibling"
    />

    <button
      v-if="hasChildren"
      type="button"
      class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-test="workspace-team-transient-disclosure"
      :data-team-run-id="row.teamRunId"
      :data-member-address="row.memberAddress"
      :aria-expanded="expanded"
      :aria-label="disclosureLabel"
      :title="disclosureLabel"
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
      <span class="member-status inline-flex flex-shrink-0 items-center">
        <StatusDot
          v-if="row.memberKind === 'agent'"
          class="mr-1.5"
          data-test="workspace-transient-status-dot"
          :status="row.currentStatus"
          variant="transient"
        />
      </span>
      <span
        v-if="row.memberKind === 'agent_team'"
        class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[0.2rem] border border-dashed border-indigo-400 bg-white text-indigo-600"
        data-team-icon="temporary-task-team"
        aria-hidden="true"
      >
        <Icon icon="heroicons:bolt-20-solid" class="h-3 w-3" />
      </span>
      <span class="min-w-0 flex-1 truncate" :class="{ 'font-semibold': row.memberKind === 'agent_team' }">
        {{ row.displayName }}
      </span>
    </div>
    <span
      class="hierarchy-identity-tooltip pointer-events-none absolute left-2 right-2 top-full z-50 hidden break-words rounded-md bg-slate-900 px-2 py-1.5 text-left text-[0.6875rem] font-medium leading-4 text-white shadow-lg"
      role="tooltip"
    >{{ identityLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import WorkspaceHierarchyBranches from '~/components/workspace/history/WorkspaceHierarchyBranches.vue';
import { useLocalization } from '~/composables/useLocalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';

const props = withDefaults(defineProps<{
  row: RunHistoryTransientExecutionRow;
  isSelected?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  continuingAncestorDepths?: number[];
  hasFollowingSibling?: boolean;
}>(), {
  isSelected: false,
  hasChildren: false,
  expanded: false,
  continuingAncestorDepths: () => [],
  hasFollowingSibling: false,
});

const emit = defineEmits<{
  (e: 'select', row: RunHistoryTransientExecutionRow): void;
  (e: 'toggle', row: RunHistoryTransientExecutionRow): void;
}>();

const { t } = useLocalization();

const roleLabel = computed(() => t(
  props.row.memberKind === 'agent_team'
    ? 'workspace.history.hierarchy.role.temporary_task_team'
    : 'workspace.history.hierarchy.role.temporary_task_agent',
));

const status = computed(() => props.row.currentStatus || AgentStatus.Offline);
const statusLabel = computed(() => t(`workspace.history.hierarchy.status.${status.value}`));

const identityLabel = computed(() => t('workspace.history.hierarchy.identity', {
  role: roleLabel.value,
  name: props.row.displayName,
  address: props.row.memberAddress,
}));

const accessibleLabel = computed(() => t('workspace.history.hierarchy.tree_item', {
  role: roleLabel.value,
  name: props.row.displayName,
  address: props.row.memberAddress,
  level: props.row.depth + 1,
  status: statusLabel.value,
}));

const disclosureLabel = computed(() => t(
  props.expanded
    ? 'workspace.history.hierarchy.collapse'
    : 'workspace.history.hierarchy.expand',
  { name: props.row.displayName },
));

const rowStyle = computed(() => ({
  paddingLeft: `calc((${props.row.depth} + 1) * 0.875rem)`,
}));

const rowClasses = computed(() => ({
  'is-selected text-indigo-900': props.isSelected,
  'text-gray-600': !props.isSelected,
}));

const activateRow = (): void => {
  if (props.hasChildren) emit('toggle', props.row);
  emit('select', props.row);
};
</script>

<style scoped>
.transient-execution-row {
  isolation: isolate;
}

.transient-execution-row > :not(.hierarchy-identity-tooltip):not(.hierarchy-branches) {
  position: relative;
  z-index: 2;
}

.transient-execution-row.is-selected {
  border-radius: 0;
  background-color: #eef2ff;
  box-shadow: inset 2px 0 #6366f1;
}

.transient-execution-row:focus-visible > .hierarchy-identity-tooltip {
  display: block;
}

.transient-execution-row:focus-visible {
  z-index: 60;
}

@media (prefers-reduced-motion: reduce) {
  .transient-execution-row,
  .transient-execution-row * {
    transition-duration: 0.01ms !important;
  }
}
</style>
