<template>
  <div
    v-if="activeExecutionEntries.length"
    data-test="team-active-task-executions-bar"
    class="border-b border-indigo-100 bg-indigo-50/60 px-4 py-3"
  >
    <div class="mb-2 flex items-center justify-between gap-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {{ $t('workspace.components.workspace.team.TeamActiveTaskExecutionsBar.active_task_executions') }}
      </p>
      <span class="text-xs text-indigo-500">{{ activeExecutionEntries.length }}</span>
    </div>

    <div class="flex gap-3 overflow-x-auto pb-1">
      <div
        v-for="entry in activeExecutionEntries"
        :key="entry.node.memberRouteKey"
        role="button"
        tabindex="0"
        :data-test="entry.kind === 'task_team' ? 'task-team-entity-card' : 'task-agent-entity-card'"
        class="min-w-[18rem] max-w-[28rem] rounded-lg border border-indigo-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="entry.node.memberRouteKey === teamContext.focusedMemberRouteKey ? 'ring-2 ring-indigo-300' : ''"
        @click="$emit('select-member', entry.node.memberRouteKey)"
        @keydown.enter.prevent="$emit('select-member', entry.node.memberRouteKey)"
        @keydown.space.prevent="$emit('select-member', entry.node.memberRouteKey)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-indigo-600">
                {{ entry.kind === 'task_team'
                  ? $t('workspace.components.workspace.team.TeamActiveTaskExecutionsBar.task_team_badge')
                  : $t('workspace.components.workspace.team.TeamActiveTaskExecutionsBar.task_agent_badge') }}
              </span>
              <span
                v-if="entry.pendingApprovals.length"
                data-test="task-agent-approval-required"
                class="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-amber-700"
              >
                {{ $t('workspace.components.workspace.team.TeamActiveTaskExecutionsBar.approval_required') }}
              </span>
            </div>
            <p class="mt-1 truncate text-sm font-semibold text-slate-900" :title="entry.displayName">
              {{ entry.displayName }}
            </p>
            <p class="mt-0.5 truncate font-mono text-[0.68rem] text-slate-500" :title="entry.runId">
              {{ entry.runId }}
            </p>
            <p v-if="entry.statusLabel" class="mt-1 truncate text-xs text-indigo-600" :title="entry.statusLabel">
              {{ entry.statusLabel }}
            </p>
          </div>
          <AgentStatusDisplay :status="entry.status" variant="compact" />
        </div>

        <div v-if="entry.pendingApprovals.length" class="mt-3 space-y-2">
          <div
            v-for="approval in entry.pendingApprovals"
            :key="approval.invocationId"
            data-test="task-agent-pending-approval"
            class="rounded-md border border-amber-100 bg-amber-50/70 px-2 py-2"
          >
            <p class="truncate text-xs font-medium text-amber-900" :title="approval.toolName">
              {{ approval.toolName }}
            </p>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                data-test="task-agent-deny-tool"
                class="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                @click.stop="deny(entry, approval)"
              >
                {{ $t('workspace.components.conversation.ToolCallIndicator.deny') }}
              </button>
              <button
                type="button"
                data-test="task-agent-approve-tool"
                class="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-green-700"
                @click.stop="approve(entry, approval)"
              >
                {{ $t('workspace.components.conversation.ToolCallIndicator.approve') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AIResponseSegment, ToolApprovalTarget, ToolInvocationLifecycle } from '~/types/segments';
import { flattenActiveExecutionMemberNodesForDisplay } from '~/utils/teamActiveExecutionMembers';

const props = defineProps<{
  teamContext: AgentTeamContext;
}>();

defineEmits<{
  (e: 'select-member', memberRouteKey: string): void;
}>();

interface PendingApproval {
  invocationId: string;
  toolName: string;
  approvalTarget: ToolApprovalTarget | null;
}

interface ActiveExecutionEntry {
  kind: 'task_agent' | 'task_team';
  node: TeamMemberNode;
  context: AgentContext | null;
  displayName: string;
  runId: string;
  status: AgentStatus;
  statusLabel: string | null;
  pendingApprovals: PendingApproval[];
}

const activeContextStore = useActiveContextStore();

const isToolLifecycleSegment = (segment: AIResponseSegment): segment is AIResponseSegment & ToolInvocationLifecycle => (
  'invocationId' in segment &&
  typeof segment.invocationId === 'string' &&
  'status' in segment &&
  segment.status === 'awaiting-approval'
);

const findPendingApprovals = (context: AgentContext | null): PendingApproval[] => {
  if (!context) return [];
  return context.state.conversation.messages.flatMap((message) => {
    if (message.type !== 'ai') return [];
    return message.segments
      .filter(isToolLifecycleSegment)
      .map((segment) => ({
        invocationId: segment.invocationId,
        toolName: segment.toolName,
        approvalTarget: segment.approvalTarget ?? null,
      }));
  });
};

const activeExecutionEntries = computed<ActiveExecutionEntry[]>(() => (
  flattenActiveExecutionMemberNodesForDisplay(props.teamContext)
    .filter((entry) => entry.node.isTaskAgentInstance || entry.node.isTaskTeamInstance)
    .map((entry) => {
      const { node } = entry;
      const context = props.teamContext.leafAgentContextsByRouteKey.get(node.memberRouteKey) ?? null;
      const isTaskTeam = Boolean(node.isTaskTeamInstance);
      const runId = isTaskTeam
        ? node.taskTeamRunId || node.memberRunId || node.memberRouteKey
        : node.taskAgentRunId || node.memberRunId || node.memberRouteKey;
      return {
        kind: isTaskTeam ? 'task_team' : 'task_agent',
        node,
        context,
        displayName: node.displayName || node.memberName || runId,
        runId,
        status: context?.state.currentStatus ?? node.currentStatus ?? AgentStatus.Initializing,
        statusLabel: isTaskTeam ? (node.taskExecutionStatus ?? null) : null,
        pendingApprovals: isTaskTeam ? [] : findPendingApprovals(context),
      };
    })
));

const buildApprovalTarget = (
  entry: ActiveExecutionEntry,
  approval: PendingApproval,
): ToolApprovalTarget => ({
  memberRouteKey: entry.node.logicalMemberRouteKey ?? approval.approvalTarget?.memberRouteKey ?? null,
  memberPath: approval.approvalTarget?.memberPath ?? null,
  sourceRouteKey: entry.node.logicalMemberRouteKey ?? approval.approvalTarget?.sourceRouteKey ?? null,
  sourcePath: approval.approvalTarget?.sourcePath ?? null,
  taskAgentRunId: entry.node.taskAgentRunId ?? entry.node.memberRunId ?? entry.node.memberRouteKey,
  taskTeamRunId: entry.node.parentTaskTeamRunId ?? approval.approvalTarget?.taskTeamRunId ?? null,
  teamRouteKey: approval.approvalTarget?.teamRouteKey ?? null,
  teamPath: approval.approvalTarget?.teamPath ?? null,
  taskTeamRelativeMemberRouteKey: entry.node.taskTeamRelativeMemberRouteKey ?? approval.approvalTarget?.taskTeamRelativeMemberRouteKey ?? null,
  taskTeamRelativeMemberPath: entry.node.taskTeamRelativeMemberPath ?? approval.approvalTarget?.taskTeamRelativeMemberPath ?? null,
});

const approve = (entry: ActiveExecutionEntry, approval: PendingApproval) => (
  activeContextStore.postToolExecutionApproval(
    approval.invocationId,
    true,
    null,
    buildApprovalTarget(entry, approval),
  )
);

const deny = (entry: ActiveExecutionEntry, approval: PendingApproval) => (
  activeContextStore.postToolExecutionApproval(
    approval.invocationId,
    false,
    'User denied via active task execution bar.',
    buildApprovalTarget(entry, approval),
  )
);
</script>
