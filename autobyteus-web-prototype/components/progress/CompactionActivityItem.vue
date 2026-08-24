<template>
  <div class="mb-3 rounded-lg border bg-white shadow-sm" :class="containerClasses" data-testid="compaction-activity-item">
    <div class="flex items-center justify-between gap-3 px-4 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <Icon
          :icon="presentation.icon"
          class="h-5 w-5 shrink-0"
          :class="iconClasses"
          data-testid="compaction-activity-icon"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-bold text-gray-800">{{ $t('workspace.components.progress.CompactionActivityItem.memory_compaction') }}</span>
            <span class="font-mono text-xs text-gray-600">#{{ shortId }}</span>
          </div>
          <p class="mt-0.5 line-clamp-2 text-xs text-gray-600">{{ activity.message }}</p>
        </div>
      </div>
      <span class="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm" :class="statusChipClasses">
        {{ presentation.label }}
      </span>
    </div>

    <div v-if="detailRows.length" class="border-t border-gray-100 px-4 pb-4 pt-3 text-xs text-gray-600">
      <dl class="grid gap-2">
        <div v-for="row in detailRows" :key="row.label" class="flex items-start justify-between gap-3">
          <dt class="shrink-0 font-semibold text-gray-500">{{ row.label }}</dt>
          <dd class="min-w-0 break-words text-right font-mono text-gray-700">{{ row.value }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import { getCompactionPhasePresentation } from '~/utils/compactionActivityPresentation';

const props = defineProps<{
  activity: CompactionActivity;
  isHighlighted?: boolean;
}>();

const presentation = computed(() => getCompactionPhasePresentation(props.activity.phase));
const shortId = computed(() => props.activity.activityId.slice(-6));

const toneClasses = {
  amber: {
    icon: 'text-amber-500',
    chip: 'bg-amber-100 text-amber-700 border-amber-200',
    border: 'border-amber-200 hover:border-amber-300',
    highlight: 'ring-2 ring-amber-500 ring-inset bg-amber-50/60 border-transparent',
  },
  blue: {
    icon: 'text-blue-500',
    chip: 'bg-blue-100 text-blue-700 border-blue-200',
    border: 'border-blue-200 hover:border-blue-300',
    highlight: 'ring-2 ring-blue-500 ring-inset bg-blue-50/60 border-transparent',
  },
  emerald: {
    icon: 'text-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200 hover:border-emerald-300',
    highlight: 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/60 border-transparent',
  },
  red: {
    icon: 'text-red-500',
    chip: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-red-200 hover:border-red-300',
    highlight: 'ring-2 ring-red-500 ring-inset bg-red-50/60 border-transparent',
  },
};

const currentTone = computed(() => toneClasses[presentation.value.tone]);
const isCompacting = computed(() => props.activity.phase === 'started');
const iconClasses = computed(() => [
  currentTone.value.icon,
  isCompacting.value ? 'motion-safe:animate-spin' : '',
]);
const statusChipClasses = computed(() => currentTone.value.chip);
const containerClasses = computed(() => props.isHighlighted ? currentTone.value.highlight : `hover:shadow-md ${currentTone.value.border}`);

const formatNumber = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : null;

const detailRows = computed(() => {
  const rows: Array<{ label: string; value: string }> = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };

  add('Turn', props.activity.turnId ?? null);
  add('Task', props.activity.compactionTaskId ?? null);
  add('Provider', props.activity.provider ?? null);
  add('Boundary', props.activity.boundaryKey ?? null);
  add('Source', props.activity.sourceSurface ?? null);
  add('Run', props.activity.compactionRunId ?? null);
  add('Agent', props.activity.compactionAgentName ?? null);
  add('Raw traces', formatNumber(props.activity.rawTraceCount));
  add('Compacted blocks', formatNumber(props.activity.compactedBlockCount));
  add('Facts', formatNumber(props.activity.semanticFactCount));
  add('Error', props.activity.errorMessage ?? null);

  return rows;
});
</script>
