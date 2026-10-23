<template>
  <div
    class="transient-execution-row relative flex min-h-7 w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    :class="rowClasses"
    :style="rowStyle"
    data-test="workspace-team-transient-execution-row"
    data-row-kind="transient_execution"
    :data-node-kind="row.memberKind"
    :data-transient-kind="row.transientKind"
    :data-team-run-id="row.teamRunId"
    :data-member-address="row.memberAddress"
    :data-agent-run-id="row.agentRunId ?? undefined"
    :data-tree-depth="row.depth"
    :title="identityLabel"
    :aria-label="accessibleLabel"
    :aria-current="isSelected ? 'true' : undefined"
    :aria-selected="isSelected"
    :aria-busy="inspectionAttempt?.state === 'loading' ? 'true' : undefined"
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
      :anchor="task ? 'name-line' : 'center'"
    />

    <button
      v-if="hasChildren"
      type="button"
      class="ml-2 mr-1 inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      data-test="workspace-team-transient-disclosure"
      :data-team-run-id="row.teamRunId"
      :data-member-address="row.memberAddress"
      :class="task ? 'mt-[0.4375rem] self-start' : ''"
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

    <div class="flex min-w-0 flex-1 items-start py-1 pr-2" :class="remote ? 'flex-wrap' : ''">
      <!-- Status and icon sit in a box as tall as the name line, so they stay centered on it. -->
      <span class="member-status inline-flex h-5 flex-shrink-0 items-center">
        <StatusDot
          v-if="row.memberKind === 'agent'"
          class="mr-1.5"
          data-test="workspace-transient-status-dot"
          :status="row.currentStatus"
        />
        <TeamAggregateStatusDot
          v-else
          class="mr-1.5"
          :status="teamStatus"
        />
      </span>
      <!-- autobyteus-278: a run another node runs carries its node, left of its icon and name. -->
      <span v-if="remote" class="mr-1.5 inline-flex h-5 min-w-0 flex-shrink items-center" data-test="workspace-remote-run-node">
        <RemoteNodeChip :node-name="remote.nodeName" />
      </span>
      <span class="mr-1.5 inline-flex h-5 flex-shrink-0 items-center" aria-hidden="true">
        <!-- Teams share the people-group identity, in the tree's slate. -->
        <span
          v-if="row.memberKind === 'agent_team'"
          class="inline-flex h-4 w-4 items-center justify-center text-slate-500"
          data-team-icon="temporary-task-team"
        >
          <Icon icon="heroicons:user-group-20-solid" class="h-4 w-4" />
        </span>
        <!-- A task Agent shows the same solid status dot and initials as a member. -->
        <span
          v-else
          class="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600"
          data-test="workspace-task-agent-avatar"
        >{{ initials }}</span>
      </span>
      <!-- No visible "Started by" line; the starter stays in the accessible label. -->
      <span class="min-w-0 flex-1" :class="{ 'font-semibold': row.memberKind === 'agent_team' }">
        <span class="block truncate">{{ row.displayName }}</span>
        <TaskWorkerTaskSummary v-if="task && !remote" :task="task" :selected="isSelected" @locate="emit('locate-task', task)" />
        <span
          v-if="inspectionAttempt?.state === 'loading'"
          class="mt-0.5 block text-[0.6875rem] font-medium text-indigo-700"
          role="status"
        >{{ t('workspace.task_monitor.loading') }}</span>
        <span
          v-else-if="inspectionAttempt?.state === 'error'"
          class="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-medium text-red-700"
          role="alert"
        >
          <span>{{ t('workspace.task_monitor.load_error') }}</span>
          <button
            type="button"
            class="rounded px-1 py-0.5 underline focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
            :aria-label="t('workspace.task_monitor.retry_accessible')"
            @click.stop="emit('select', row)"
          >{{ t('workspace.task_monitor.retry') }}</button>
        </span>
      </span>
      <!-- autobyteus-278: the run's title and any error start under the node's name in the chip. -->
      <div v-if="remote" class="mt-0.5 w-full basis-full pl-9" data-test="workspace-remote-run-lines">
        <TaskWorkerTaskSummary v-if="task" class="!mt-0" :task="task" :selected="isSelected" @locate="emit('locate-task', task)" />
        <span
          v-if="!task && remoteInfo?.reachable !== false && remoteInfo?.title && !remoteInfo?.checking"
          class="block truncate text-[0.6875rem] font-normal leading-4"
          :class="isSelected ? 'text-indigo-700' : 'text-gray-500'"
          data-test="workspace-remote-run-title"
          :title="remoteInfo.title"
        >{{ remoteInfo.title }}</span>
        <span
          v-if="remoteInfo?.checking"
          class="block text-[0.6875rem] font-medium text-indigo-700"
          role="status"
          data-test="workspace-remote-run-checking"
        >{{ t('remote.row.checking', { node: remote.nodeName }) }}</span>
        <span
          v-else-if="remoteInfo?.reachable === false || stopError"
          class="flex items-center gap-1 text-[0.6875rem] font-medium text-red-700"
          role="alert"
          data-test="workspace-remote-run-error"
        >
          <span>{{ stopError ? t('remote.row.stopFailed', { node: remote.nodeName }) : t('remote.row.unreachable', { node: remote.nodeName }) }}</span>
          <button
            v-if="!stopError"
            type="button"
            class="rounded px-1 py-0.5 underline focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
            :aria-label="t('remote.row.retryAria', { node: remote.nodeName })"
            data-test="workspace-remote-run-retry"
            @click.stop="retryRemote"
          >{{ t('remote.row.retry') }}</button>
        </span>
      </div>
    </div>
    <!-- SR-007: a running copy has the same stop icon as a running run. -->
    <DelegatedStopButton
      v-if="stopRoot && stopReference"
      class="mr-1 self-center"
      :root="stopRoot"
      :reference="stopReference"
      :name="row.displayName"
      @started="stopError = false"
      @failed="stopError = true"
    />
    <span
      class="hierarchy-identity-tooltip pointer-events-none absolute left-2 right-2 top-full z-50 hidden break-words rounded-md bg-slate-900 px-2 py-1.5 text-left text-[0.6875rem] font-medium leading-4 text-white shadow-lg"
      role="tooltip"
    >{{ identityLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import TeamAggregateStatusDot from '~/components/workspace/history/TeamAggregateStatusDot.vue';
import WorkspaceHierarchyBranches from '~/components/workspace/history/WorkspaceHierarchyBranches.vue';
import TaskWorkerTaskSummary from '~/components/workspace/history/TaskWorkerTaskSummary.vue';
import DelegatedStopButton from '~/components/workspace/history/DelegatedStopButton.vue';
import RemoteNodeChip from '~/components/workspace/remote/RemoteNodeChip.vue';
import { useRemoteRunsStore } from '~/stores/remoteRunsStore';
import type { DelegatedReference, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient';
import { useLocalization } from '~/composables/useLocalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';
import type { TaskWorkerTask } from '~/types/project';
import { taskSummaryLabel } from '~/utils/projects/taskSummary';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

const props = withDefaults(defineProps<{
  row: RunHistoryTransientExecutionRow;
  /** The Team status of a Team row; agent rows show their own status. */
  teamStatus?: TeamStatus;
  isSelected?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  continuingAncestorDepths?: number[];
  hasFollowingSibling?: boolean;
  /** The Task worker's current Task: shown as a summary line under the name (delegated-copy-task-locator). */
  task?: TaskWorkerTask | null;
  /** The run this copy belongs to, when its rows offer the per-copy stop icon (SR-007). */
  stopRoot?: DelegatedRoot | null;
}>(), {
  teamStatus: AgentStatus.Offline,
  stopRoot: null,
  isSelected: false,
  hasChildren: false,
  expanded: false,
  continuingAncestorDepths: () => [],
  hasFollowingSibling: false,
  task: null,
});

const emit = defineEmits<{
  (e: 'select', row: RunHistoryTransientExecutionRow): void;
  (e: 'toggle', row: RunHistoryTransientExecutionRow): void;
  (e: 'locate-task', task: TaskWorkerTask): void;
}>();

const { t } = useLocalization();
const runHistoryStore = useRunHistoryStore();

const roleLabel = computed(() => t(
  props.row.memberKind === 'agent_team'
    ? 'workspace.history.hierarchy.role.temporary_task_team'
    : 'workspace.history.hierarchy.role.temporary_task_agent',
));

// autobyteus-278: the node that runs this copy; a member of a remote Team shows no chip of its own.
const remoteRuns = useRemoteRunsStore();
const remote = computed(() => props.row.transientKind === 'task_team_child' ? null : props.row.remote ?? null);
const remoteInfo = computed(() => remote.value ? remoteRuns.run(remote.value.runId) : null);
const stopError = ref(false);
/** Retry asks the node again ("Checking {node}…"); focus stays on the row. */
const retryRemote = (): void => {
  stopError.value = false;
  if (remote.value) remoteRuns.retry(remote.value.runId);
};

const status = computed(() => props.row.memberKind === 'agent_team'
  ? props.teamStatus
  : props.row.currentStatus || AgentStatus.Offline);
const statusLabel = computed(() => t(`workspace.history.hierarchy.status.${status.value}`));
const startedByLabel = computed(() => props.row.delegatedBy
  ? t('workspace.members.started_by', { name: props.row.delegatedBy })
  : '');
const initials = computed(() => props.row.displayName.split(/\s+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI');
const inspectionAttempt = computed(() => props.row.agentRunId
  ? runHistoryStore.getTeamMemberInspectionAttempt(props.row.teamRunId, props.row.agentRunId)
  : null);

const identityLabel = computed(() => {
  const base = t('workspace.history.hierarchy.identity', {
    role: roleLabel.value,
    name: props.row.displayName,
    address: props.row.memberAddress,
  });
  return remote.value ? `${base} · ${t('remote.row.accessible', { node: remote.value.nodeName })}` : base;
});

const accessibleLabel = computed(() => {
  const label = t('workspace.history.hierarchy.tree_item', {
    role: roleLabel.value,
    name: props.row.displayName,
    address: props.row.memberAddress,
    level: props.row.depth + 1,
    status: startedByLabel.value ? `${statusLabel.value}, ${startedByLabel.value}` : statusLabel.value,
  });
  const withNode = remote.value ? `${label}, ${t('remote.row.accessible', { node: remote.value.nodeName })}` : label;
  return props.task
    ? `${withNode}, ${t('workspace.history.copyTask.accessible', { title: taskSummaryLabel(props.task.description) })}`
    : withNode;
});

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
  'text-gray-600 hover:bg-gray-50': !props.isSelected,
}));

/** A copy itself (an Agent or a whole Team), never one member of a Team copy. */
const stopReference = computed<DelegatedReference | null>(() => {
  if (props.row.transientKind === 'task_agent' && props.row.agentRunId) return { agentRunId: props.row.agentRunId };
  if (props.row.transientKind === 'task_team' && props.row.teamRunIdForNode) return { teamRunId: props.row.teamRunIdForNode };
  return null;
});

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
