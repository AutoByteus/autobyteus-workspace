<template>
  <div class="flex justify-center px-2 py-3" data-testid="compaction-status-row">
    <div class="w-full max-w-2xl rounded-2xl border px-4 py-3 text-sm shadow-sm" :class="rowClasses">
      <div class="flex items-start gap-3">
        <Icon
          :icon="presentation.icon"
          class="mt-0.5 h-5 w-5 shrink-0"
          :class="iconClasses"
          data-testid="compaction-status-icon"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold">{{ activity.message }}</span>
            <span class="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide" :class="chipClasses">
              {{ presentation.label }}
            </span>
          </div>
          <div v-if="secondaryText" class="mt-1 text-xs opacity-80">{{ secondaryText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { CompactionActivity } from '~/types/activity/RunActivity';
import {
  getCompactionPhasePresentation,
  getCompactionSecondaryText,
} from '~/utils/compactionActivityPresentation';

const props = defineProps<{
  activity: CompactionActivity;
}>();

const presentation = computed(() => getCompactionPhasePresentation(props.activity.phase));

const toneClasses = {
  amber: {
    row: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-600',
    chip: 'border-amber-200 bg-amber-100 text-amber-700',
  },
  blue: {
    row: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-600',
    chip: 'border-blue-200 bg-blue-100 text-blue-700',
  },
  emerald: {
    row: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
    chip: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  },
  red: {
    row: 'border-red-200 bg-red-50 text-red-900',
    icon: 'text-red-600',
    chip: 'border-red-200 bg-red-100 text-red-700',
  },
};

const currentTone = computed(() => toneClasses[presentation.value.tone]);
const rowClasses = computed(() => currentTone.value.row);
const iconClasses = computed(() => [
  currentTone.value.icon,
  presentation.value.isCompacting ? 'motion-safe:animate-spin' : '',
]);
const chipClasses = computed(() => currentTone.value.chip);

const secondaryText = computed(() => getCompactionSecondaryText(props.activity));
</script>
