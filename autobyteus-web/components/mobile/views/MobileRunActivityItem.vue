<template>
  <!-- A tool call (autobyteus-590 D-5): its name, the shared summary of its current arguments, its status (never by color
       alone: a success is its check icon, any other status its icon and word); the whole row opens its details. -->
  <button
    v-if="dispatchKind === 'tool' && activity.kind === 'tool'"
    type="button"
    class="block min-h-[2.75rem] w-full border-b border-slate-100 px-4 py-3 text-left active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
    data-testid="mobile-run-activity-row"
    :data-status="activity.status"
    @click="emit('open', activity.activityId)"
  >
    <span class="flex items-start justify-between gap-3">
      <span class="min-w-0">
        <span class="line-clamp-1 break-words text-[0.9375rem] font-semibold text-slate-900" data-testid="mobile-run-activity-name">{{ activity.toolName }}</span>
        <span
          v-if="summary"
          class="mt-1 line-clamp-2 break-words text-sm text-slate-600"
          :class="summary.kind === 'command' ? 'font-mono text-[0.8125rem]' : ''"
          :title="summary.title"
          data-testid="mobile-run-activity-summary"
        >{{ summary.text }}</span>
      </span>
      <Icon
        v-if="activity.status === 'success'"
        :icon="toolStatus.icon"
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="TONE[toolStatus.tone].icon"
        role="img"
        :aria-label="toolStatus.label"
        data-testid="mobile-run-activity-status"
      />
      <span
        v-else
        class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        :class="TONE[toolStatus.tone].chip"
        data-testid="mobile-run-activity-status"
      >
        <Icon :icon="toolStatus.icon" class="h-3.5 w-3.5" aria-hidden="true" />{{ toolStatus.label }}
      </span>
    </span>
    <span v-if="activity.error" class="mt-2 line-clamp-2 break-words text-sm text-red-700" data-testid="mobile-run-activity-error">{{ activity.error }}</span>
  </button>

  <button
    v-else-if="dispatchKind === 'compaction' && activity.kind === 'compaction'"
    type="button"
    class="block min-h-[2.75rem] w-full border-b border-slate-100 px-4 py-3 text-left active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
    data-testid="mobile-run-activity-row"
    :data-status="activity.phase"
    @click="emit('open', activity.activityId)"
  >
    <span class="flex items-start justify-between gap-3">
      <span class="min-w-0">
        <span class="line-clamp-1 break-words text-[0.9375rem] font-semibold text-slate-900" data-testid="mobile-run-activity-name">{{ $t('workspace.components.progress.CompactionActivityItem.memory_compaction') }}</span>
        <span class="mt-1 line-clamp-2 break-words text-sm text-slate-600">{{ compactionSummary }}</span>
      </span>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="compactionStatusClass">
        {{ activity.phase }}
      </span>
    </span>
    <span v-if="activity.errorMessage" class="mt-2 line-clamp-2 break-words text-sm text-red-700" data-testid="mobile-run-activity-error">{{ activity.errorMessage }}</span>
  </button>

  <SystemInstructionActivityItem
    v-else-if="dispatchKind === 'system_instruction' && activity.kind === 'system_instruction'"
    :activity="activity"
    :runtime-kind="runtimeKind"
    data-testid="mobile-run-activity-row"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { RunActivity } from '~/types/activity/RunActivity';
import { toolActivityStatusPresentation, type ToolActivityTone } from '~/utils/activity/toolActivityPresentation';
import { getToolDisplaySummary } from '~/utils/toolDisplaySummary';
import SystemInstructionActivityItem from '~/components/progress/SystemInstructionActivityItem.vue';
import { getRunActivityDispatchKind } from '~/services/activity/runActivityPresentation';

const props = defineProps<{
  activity: RunActivity;
  runtimeKind?: string | null;
}>();

const emit = defineEmits<{ (event: 'open', activityId: string): void }>();

const dispatchKind = computed(() => getRunActivityDispatchKind(props.activity));

/** The phone's classes for each tone of the shared status (the desktop's colors). */
const TONE: Record<ToolActivityTone, { icon: string; chip: string }> = {
  green: { icon: 'text-green-600', chip: 'bg-green-100 text-green-700' },
  red: { icon: 'text-red-600', chip: 'bg-red-100 text-red-700' },
  cyan: { icon: 'text-cyan-600', chip: 'bg-cyan-100 text-cyan-700' },
  slate: { icon: 'text-slate-500', chip: 'bg-slate-100 text-slate-700' },
  blue: { icon: 'text-blue-600', chip: 'bg-blue-100 text-blue-700' },
  amber: { icon: 'text-amber-600', chip: 'bg-amber-100 text-amber-800' },
  gray: { icon: 'text-gray-500', chip: 'bg-gray-100 text-gray-600' },
  neutral: { icon: 'text-gray-500', chip: 'bg-gray-100 text-gray-600' },
};

const toolStatus = computed(() => toolActivityStatusPresentation(props.activity.kind === 'tool' ? props.activity.status : 'interrupted'));
/** The shared summary of the call's current arguments, read at render: arguments that arrive later show (D-2). */
const summary = computed(() => (props.activity.kind === 'tool'
  ? getToolDisplaySummary(props.activity.toolName, props.activity.arguments, { preferCompactPath: true })
  : null));

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
