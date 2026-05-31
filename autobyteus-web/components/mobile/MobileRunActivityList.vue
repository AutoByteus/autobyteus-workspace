<template>
  <section class="space-y-2" data-testid="mobile-run-activity-list">
    <article v-if="!runId" class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
      Select a run to see run activity history.
    </article>
    <article v-else-if="!activities.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No run activity has been recorded for this run yet.
    </article>
    <template v-else>
      <article
        v-for="activity in activities.slice(0, 10)"
        :key="activity.activityId"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        data-testid="mobile-run-activity-row"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="line-clamp-1 break-words font-semibold text-slate-900">{{ titleFor(activity) }}</p>
            <p class="mt-1 line-clamp-2 break-words text-sm text-slate-600">{{ summaryFor(activity) }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(activity)">
            {{ statusLabel(activity) }}
          </span>
        </div>
        <p v-if="activity.kind === 'tool' && activity.error" class="mt-2 line-clamp-2 text-sm text-red-700">{{ activity.error }}</p>
        <p v-if="activity.kind === 'compaction' && activity.errorMessage" class="mt-2 line-clamp-2 text-sm text-red-700">{{ activity.errorMessage }}</p>
        <details v-if="activity.kind === 'tool' && activity.logs.length" class="mt-2 text-xs text-slate-500">
          <summary class="cursor-pointer font-semibold text-blue-700">Show details</summary>
          <p class="mt-2 line-clamp-6 whitespace-pre-wrap">{{ activity.logs.join('\n') }}</p>
        </details>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useMobileFocusedRunIdentity } from '~/composables/mobile/useMobileFocusedRunIdentity';
import { useAgentActivityStore, type RunActivity } from '~/stores/agentActivityStore';
import type { MobileWorkContext } from '~/types/mobileWork';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const activityStore = useAgentActivityStore();
const { focusedRunId: runId } = useMobileFocusedRunIdentity(toRef(props, 'context'));
const activities = computed(() => {
  return runId.value ? activityStore.getActivities(runId.value) : [];
});

function titleFor(activity: RunActivity): string {
  return activity.kind === 'tool' ? activity.toolName : 'Memory compaction';
}

function summaryFor(activity: RunActivity): string {
  if (activity.kind === 'tool') {
    return activity.contextText || activity.type;
  }
  const details = [activity.message];
  if (activity.provider) details.push(activity.provider);
  if (activity.turnId) details.push(`turn ${activity.turnId}`);
  return details.join(' · ');
}

function statusLabel(activity: RunActivity): string {
  return activity.kind === 'tool' ? activity.status : activity.phase;
}

function statusClass(activity: RunActivity): string {
  if (activity.kind === 'compaction') {
    if (activity.phase === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (activity.phase === 'failed') return 'bg-red-100 text-red-700';
    if (activity.phase === 'started') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  }
  if (activity.status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (activity.status === 'error' || activity.status === 'denied' || activity.status === 'interrupted') return 'bg-red-100 text-red-700';
  if (activity.status === 'awaiting-approval') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}
</script>
