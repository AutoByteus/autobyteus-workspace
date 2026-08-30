<template>
  <div
    class="workspace-team-execution-row relative flex min-h-7 w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :class="rowClasses"
    :style="rowStyle"
    :data-test="`workspace-team-member-${row.teamRunId}-${row.memberAddress}`"
    data-row-kind="stable_member"
    :data-node-kind="row.memberKind"
    :data-tree-depth="row.depth"
    :data-team-run-id="row.teamRunId"
    :data-member-address="row.memberAddress"
    :aria-current="isSelected ? 'true' : undefined"
    :aria-selected="isSelected"
    :aria-level="row.depth + 1"
    :aria-expanded="hasChildren ? expanded : undefined"
    :aria-label="accessibleLabel"
    :title="identityLabel"
    role="treeitem"
    tabindex="0"
    @click="$emit('activate', row)"
    @keydown.enter="$emit('activate', row)"
    @keydown.space.prevent="$emit('activate', row)"
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
      data-test="workspace-team-member-disclosure"
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

    <div class="flex min-w-0 flex-1 items-center justify-between py-1 pr-2">
      <div class="flex min-w-0 flex-1 items-center">
        <span class="member-status inline-flex flex-shrink-0 items-center">
          <StatusDot
            v-if="row.memberKind === 'agent'"
            class="mr-1.5"
            :status="row.row.currentStatus"
          />
          <NestedTeamAggregateStatusDot
            v-else
            class="mr-1.5"
            :status="aggregateStatus"
          />
        </span>
        <span
          v-if="row.memberKind === 'agent_team'"
          class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center text-slate-500"
          data-team-icon="user-group-solid"
          aria-hidden="true"
        >
          <Icon icon="heroicons:user-group-20-solid" class="h-4 w-4" />
        </span>
        <span
          v-else
          class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600"
          data-test="workspace-team-member-avatar"
        >
          <img
            v-if="avatars.showTeamMemberAvatar(row.row)"
            :src="avatars.getTeamMemberAvatarUrl(row.row)"
            :alt="`${avatars.getTeamMemberDisplayName(row.row)} avatar`"
            class="h-full w-full object-cover"
            @error="avatars.onTeamMemberAvatarError(row.row)"
          >
          <span v-else>{{ avatars.getTeamMemberInitials(row.row) }}</span>
        </span>
        <span class="min-w-0 flex-1 truncate">{{ displayName }}</span>
      </div>

      <span class="member-age ml-2 flex-shrink-0 text-xs text-gray-400">
        {{ age }}
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
import NestedTeamAggregateStatusDot from '~/components/workspace/history/NestedTeamAggregateStatusDot.vue';
import WorkspaceHierarchyBranches from '~/components/workspace/history/WorkspaceHierarchyBranches.vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import { useLocalization } from '~/composables/useLocalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { RunHistoryStableExecutionRow } from '~/stores/runHistoryTypes';

const props = defineProps<{
  row: RunHistoryStableExecutionRow;
  avatars: WorkspaceHistoryAvatarBindings;
  aggregateStatus: AgentStatus;
  age: string;
  isSelected: boolean;
  hasChildren: boolean;
  expanded: boolean;
  continuingAncestorDepths: number[];
  hasFollowingSibling: boolean;
}>();

defineEmits<{
  (e: 'activate', row: RunHistoryStableExecutionRow): void;
  (e: 'toggle', row: RunHistoryStableExecutionRow): void;
}>();

const { t } = useLocalization();

const displayName = computed(() =>
  props.row.displayName || props.avatars.getTeamMemberDisplayName(props.row.row));

const roleLabel = computed(() => t(
  props.row.memberKind === 'agent_team'
    ? 'workspace.history.hierarchy.role.agent_team'
    : 'workspace.history.hierarchy.role.agent',
));

const status = computed(() => props.row.memberKind === 'agent_team'
  ? props.aggregateStatus
  : props.row.row.currentStatus ?? AgentStatus.Offline);

const statusLabel = computed(() => t(`workspace.history.hierarchy.status.${status.value}`));

const identityLabel = computed(() => t('workspace.history.hierarchy.identity', {
  role: roleLabel.value,
  name: displayName.value,
  address: props.row.memberAddress,
}));

const accessibleLabel = computed(() => t('workspace.history.hierarchy.tree_item', {
  role: roleLabel.value,
  name: displayName.value,
  address: props.row.memberAddress,
  level: props.row.depth + 1,
  status: statusLabel.value,
}));

const disclosureLabel = computed(() => t(
  props.expanded
    ? 'workspace.history.hierarchy.collapse'
    : 'workspace.history.hierarchy.expand',
  { name: displayName.value },
));

const rowStyle = computed(() => ({
  paddingLeft: `calc((${props.row.depth} + 1) * 0.875rem)`,
}));

const rowClasses = computed(() => ({
  'is-selected text-indigo-900': props.isSelected,
  'text-gray-600 hover:bg-gray-50': !props.isSelected,
  'font-semibold': props.row.memberKind === 'agent_team',
}));
</script>

<style scoped>
.workspace-team-execution-row {
  isolation: isolate;
}

.workspace-team-execution-row > :not(.hierarchy-identity-tooltip):not(.hierarchy-branches) {
  position: relative;
  z-index: 2;
}

.workspace-team-execution-row.is-selected {
  border-radius: 0;
  background-color: #eef2ff;
  box-shadow: inset 2px 0 #6366f1;
}

.workspace-team-execution-row:focus-visible > .hierarchy-identity-tooltip {
  display: block;
}

.workspace-team-execution-row:focus-visible {
  z-index: 60;
}

@container workspace-history-panel (max-width: 320px) {
  .member-age {
    max-width: 0;
    margin-left: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 120ms ease, opacity 120ms ease, margin 120ms ease;
  }

  .workspace-team-execution-row:hover .member-age,
  .workspace-team-execution-row:focus-visible .member-age,
  .workspace-team-execution-row:focus-within .member-age {
    max-width: 4rem;
    margin-left: 0.5rem;
    opacity: 1;
  }
}

@container workspace-history-panel (max-width: 280px) {
  .workspace-team-execution-row[data-tree-depth='2'] .member-status {
    max-width: 0;
    margin: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 120ms ease, opacity 120ms ease, margin 120ms ease;
  }

  .workspace-team-execution-row[data-tree-depth='2']:hover .member-status,
  .workspace-team-execution-row[data-tree-depth='2']:focus .member-status,
  .workspace-team-execution-row[data-tree-depth='2']:focus-within .member-status {
    max-width: 2rem;
    margin-right: 0.375rem;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-team-execution-row,
  .workspace-team-execution-row * {
    transition-duration: 0.01ms !important;
  }
}
</style>
