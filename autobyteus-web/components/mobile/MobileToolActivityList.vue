<template>
  <section class="space-y-2" data-testid="mobile-tool-activity-list">
    <article v-if="!runId" class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
      Select a run to see run and tool history.
    </article>
    <article v-else-if="!activities.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No tool activity has been recorded for this run yet.
    </article>
    <template v-else>
      <article
        v-for="activity in activities.slice(0, 10)"
        :key="activity.invocationId"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        data-testid="mobile-tool-activity-row"
      >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="line-clamp-1 break-words font-semibold text-slate-900">{{ activity.toolName }}</p>
          <p class="mt-1 line-clamp-2 break-words text-sm text-slate-600">{{ activity.contextText || activity.type }}</p>
        </div>
        <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(activity.status)">
          {{ activity.status }}
        </span>
      </div>
      <p v-if="activity.error" class="mt-2 line-clamp-2 text-sm text-red-700">{{ activity.error }}</p>
      <details v-if="activity.logs.length" class="mt-2 text-xs text-slate-500">
        <summary class="cursor-pointer font-semibold text-blue-700">Show details</summary>
        <p class="mt-2 line-clamp-6 whitespace-pre-wrap">{{ activity.logs.join('\n') }}</p>
      </details>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import type { ToolInvocationStatus } from '~/types/segments';

const props = defineProps<{
  context: MobileWorkContext | null;
  filter?: 'all' | 'errors' | 'approvals';
}>();

const activeContextStore = useActiveContextStore();
const activityStore = useAgentActivityStore();
const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const runId = computed(() => {
  if (props.context?.kind === 'agent-run') {
    if (selectionStore.selectedType !== 'agent' || selectionStore.selectedRunId !== props.context.runId) return '';
    return activeContextStore.activeAgentContext?.state.runId === props.context.runId ? props.context.runId : '';
  }
  if (props.context?.kind === 'team-run') {
    if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return '';
    const team = teamContextsStore.getTeamContextById(props.context.teamRunId);
    if (!team || team.focusedMemberRouteKey !== props.context.focusedMemberRouteKey) return '';
    return activeContextStore.activeAgentContext?.state.runId || '';
  }
  return '';
});
const activities = computed(() => {
  const rows = runId.value ? activityStore.getActivities(runId.value) : [];
  if (props.filter === 'errors') {
    return rows.filter((activity) => activity.status === 'error' || activity.status === 'denied');
  }
  if (props.filter === 'approvals') {
    return rows.filter((activity) => activity.status === 'awaiting-approval');
  }
  return rows;
});

function statusClass(status: ToolInvocationStatus): string {
  if (status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (status === 'error' || status === 'denied') return 'bg-red-100 text-red-700';
  if (status === 'awaiting-approval') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}
</script>
