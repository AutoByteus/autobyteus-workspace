<template>
  <article
    v-if="dispatchKind === 'tool' && activity.kind === 'tool'"
    class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
    data-testid="mobile-run-activity-row"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="line-clamp-1 break-words font-semibold text-slate-900">{{ activity.toolName }}</p>
        <p class="mt-1 line-clamp-2 break-words text-sm text-slate-600">{{ activity.contextText || activity.type }}</p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="toolStatusClass">
        {{ activity.status }}
      </span>
    </div>
    <p v-if="activity.error" class="mt-2 line-clamp-2 text-sm text-red-700">{{ activity.error }}</p>
    <details v-if="activity.logs.length" class="mt-2 text-xs text-slate-500">
      <summary class="cursor-pointer font-semibold text-blue-700">Show details</summary>
      <p class="mt-2 line-clamp-6 whitespace-pre-wrap">{{ activity.logs.join('\n') }}</p>
    </details>
  </article>

  <article
    v-else-if="dispatchKind === 'compaction' && activity.kind === 'compaction'"
    class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
    data-testid="mobile-run-activity-row"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="line-clamp-1 break-words font-semibold text-slate-900">Memory compaction</p>
        <p class="mt-1 line-clamp-2 break-words text-sm text-slate-600">{{ compactionSummary }}</p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="compactionStatusClass">
        {{ activity.phase }}
      </span>
    </div>
    <p v-if="activity.errorMessage" class="mt-2 line-clamp-2 text-sm text-red-700">{{ activity.errorMessage }}</p>
  </article>

  <SystemInstructionActivityItem
    v-else-if="dispatchKind === 'system_instruction' && activity.kind === 'system_instruction'"
    :activity="activity"
    :runtime-kind="runtimeKind"
    data-testid="mobile-run-activity-row"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RunActivity } from '~/types/activity/RunActivity';
import SystemInstructionActivityItem from '~/components/progress/SystemInstructionActivityItem.vue';
import { getRunActivityDispatchKind } from '~/services/activity/runActivityPresentation';

const props = defineProps<{
  activity: RunActivity;
  runtimeKind?: string | null;
}>();

const dispatchKind = computed(() => getRunActivityDispatchKind(props.activity));

const toolStatusClass = computed(() => {
  if (props.activity.kind !== 'tool') return '';
  if (props.activity.status === 'success') return 'bg-emerald-100 text-emerald-700';
  if (props.activity.status === 'error' || props.activity.status === 'denied' || props.activity.status === 'interrupted') return 'bg-red-100 text-red-700';
  if (props.activity.status === 'awaiting-approval') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
});

const compactionSummary = computed(() => {
  if (props.activity.kind !== 'compaction') return '';
  return [
    props.activity.message,
    props.activity.provider,
    props.activity.turnId ? `turn ${props.activity.turnId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' · ');
});

const compactionStatusClass = computed(() => {
  if (props.activity.kind !== 'compaction') return '';
  if (props.activity.phase === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (props.activity.phase === 'failed') return 'bg-red-100 text-red-700';
  if (props.activity.phase === 'started') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
});
</script>
