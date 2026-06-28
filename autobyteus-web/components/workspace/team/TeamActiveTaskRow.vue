<template>
  <article
    :data-test="entry.kind === 'task_team' ? 'task-team-active-task-row' : 'task-agent-active-task-row'"
    class="rounded-lg border bg-white shadow-sm transition"
    :class="isFocused(entry.node.memberRouteKey) ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'"
  >
    <div class="flex items-start gap-2 p-2">
      <button type="button" data-test="active-task-expand-toggle" class="mt-0.5 rounded px-1 text-sm text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" :aria-expanded="expanded" @click.stop="$emit('toggle')">
        {{ expanded ? '▾' : '▸' }}
      </button>
      <button type="button" data-test="active-task-open-row" class="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="select(entry.node.memberRouteKey)">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-700">
            {{ entry.kind === 'task_team' ? $t('workspace.components.workspace.team.TeamActiveTasksSection.task_team') : $t('workspace.components.workspace.team.TeamActiveTasksSection.task_agent') }}
          </span>
          <span v-if="approvals.length" data-test="active-task-approval-required" class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-amber-700">
            {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.approval_required') }}
          </span>
        </div>
        <p class="mt-1 truncate text-sm font-semibold text-slate-900" :title="`${entry.targetDisplayName} · ${entry.taskId || entry.runId || ''}`">
          {{ entry.targetDisplayName }} · {{ entry.shortTaskDisambiguator }}
        </p>
        <p class="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-medium text-slate-700">{{ entry.statusLabel }}</p>
      </button>
    </div>

    <div v-if="expanded" class="border-t border-slate-100 px-3 pb-3 pt-2">
      <dl class="space-y-2 text-xs text-slate-700">
        <div>
          <dt class="font-semibold text-slate-500">{{ $t('workspace.components.workspace.team.TeamActiveTasksSection.task') }}</dt>
          <dd data-test="active-task-description" class="mt-0.5 line-clamp-3 whitespace-pre-wrap text-slate-900">
            {{ entry.taskDescription || $t('workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable') }}
          </dd>
        </div>
        <div v-for="detail in details" :key="detail.key" class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
          <dt class="font-semibold text-slate-500">{{ $t(detail.labelKey) }}</dt>
          <dd :data-test="detail.dataTest" class="min-w-0 truncate" :class="detail.mono ? 'font-mono' : ''" :title="detail.value">
            <template v-if="detail.key === 'target'">{{ $t(targetKindKey) }} {{ detail.value }}</template>
            <template v-else>{{ detail.value }}</template>
          </dd>
        </div>
      </dl>

      <div v-if="approvals.length" class="mt-3 space-y-2">
        <div v-for="approval in approvals" :key="approval.invocationId" data-test="active-task-pending-approval" class="rounded-md border border-amber-100 bg-amber-50/70 px-2 py-2">
          <p class="truncate text-xs font-medium text-amber-900" :title="approval.toolName">{{ approval.toolName }}</p>
          <div class="mt-2 flex gap-2">
            <button type="button" data-test="active-task-deny-tool" class="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50" @click.stop="deny(approval)">
              {{ $t('workspace.components.conversation.ToolCallIndicator.deny') }}
            </button>
            <button type="button" data-test="active-task-approve-tool" class="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-green-700" @click.stop="approve(approval)">
              {{ $t('workspace.components.conversation.ToolCallIndicator.approve') }}
            </button>
          </div>
        </div>
      </div>

      <button type="button" data-test="active-task-open-conversation" class="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="select(entry.node.memberRouteKey)">
        {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.open_conversation') }}
      </button>

      <div v-if="entry.kind === 'task_team' && entry.members.length" class="mt-3">
        <p class="mb-1 text-xs font-semibold text-slate-500">{{ $t('workspace.components.workspace.team.TeamActiveTasksSection.members') }}</p>
        <div class="space-y-1">
          <button v-for="member in entry.members" :key="member.node.memberRouteKey" type="button" data-test="active-task-member-row" class="block w-full rounded px-2 py-1 text-left text-xs transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" :class="isFocused(member.node.memberRouteKey) ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700'" :style="{ paddingLeft: `${0.5 + member.depth * 0.75}rem` }" @click="select(member.node.memberRouteKey)">
            {{ member.displayName }}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import { buildActiveTaskApprovalTarget, getActiveTaskApprovals, type PendingTaskApproval } from '~/utils/teamActiveTaskApprovals';

const props = defineProps<{
  entry: ActiveTaskEntry;
  expanded: boolean;
  focusedMemberRouteKey: string;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'select-member', memberRouteKey: string): void;
}>();

const activeContextStore = useActiveContextStore();
const approvals = computed(() => getActiveTaskApprovals(props.entry));

const targetKindKey = computed(() => (
  props.entry.taskTargetKind === 'team'
    ? 'workspace.components.workspace.team.TeamActiveTasksSection.target_team'
    : 'workspace.components.workspace.team.TeamActiveTasksSection.target_member'
));

const details = computed(() => [
  {
    key: 'status',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.status',
    dataTest: 'active-task-status',
    value: props.entry.statusLabel,
  },
  {
    key: 'target',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.target',
    dataTest: 'active-task-target',
    value: props.entry.taskTargetName,
  },
  ...(props.entry.taskId ? [{
    key: 'task-id',
    labelKey: 'workspace.components.workspace.team.TeamActiveTasksSection.task_id',
    dataTest: 'active-task-id',
    value: props.entry.taskId,
    mono: true,
  }] : []),
  ...(props.entry.runId ? [{
    key: 'run-id',
    labelKey: props.entry.kind === 'task_team'
      ? 'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id'
      : 'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id',
    dataTest: 'active-task-run-id',
    value: props.entry.runId,
    mono: true,
  }] : []),
]);

const isFocused = (memberRouteKey: string): boolean => props.focusedMemberRouteKey === memberRouteKey;
const select = (memberRouteKey: string): void => emit('select-member', memberRouteKey);

const approve = (approval: PendingTaskApproval) => activeContextStore.postToolExecutionApproval(
  approval.invocationId,
  true,
  null,
  buildActiveTaskApprovalTarget(props.entry, approval),
);

const deny = (approval: PendingTaskApproval) => activeContextStore.postToolExecutionApproval(
  approval.invocationId,
  false,
  'User denied via Team Active Tasks.',
  buildActiveTaskApprovalTarget(props.entry, approval),
);
</script>
