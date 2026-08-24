<template>
  <article
    class="mb-3 overflow-hidden rounded-lg border border-violet-200 bg-white shadow-sm"
    :class="isHighlighted ? 'ring-2 ring-violet-500 ring-inset' : 'hover:border-violet-300 hover:shadow-md'"
    data-testid="system-instruction-activity-item"
  >
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      :aria-label="$t('workspace.components.progress.SystemInstructionActivityItem.aria_label', {
        title: $t('workspace.components.progress.SystemInstructionActivityItem.title'),
        source: $t(sourceTranslationKey),
        availability: $t('workspace.components.progress.SystemInstructionActivityItem.available'),
        count: characterCount,
        time: captureTime,
      })"
      @click="expanded = !expanded"
    >
      <span class="flex min-w-0 items-center gap-3">
        <Icon icon="heroicons:document-text" class="h-5 w-5 shrink-0 text-violet-600" />
        <span class="min-w-0">
          <span :id="titleId" class="block text-sm font-bold text-gray-900">
            {{ $t('workspace.components.progress.SystemInstructionActivityItem.title') }}
          </span>
          <span class="block truncate text-xs text-gray-600">{{ $t(sourceTranslationKey) }}</span>
          <span class="block truncate text-[11px] text-gray-500">
            {{ $t('workspace.components.progress.SystemInstructionActivityItem.captured_at', { time: captureTime }) }}
            · {{ $t('workspace.components.progress.SystemInstructionActivityItem.character_count', { count: characterCount }) }}
          </span>
        </span>
      </span>
      <span class="flex shrink-0 items-center gap-2">
        <span class="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-700">
          {{ $t('workspace.components.progress.SystemInstructionActivityItem.available') }}
        </span>
        <Icon :icon="expanded ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" class="h-4 w-4 text-gray-500" />
      </span>
    </button>
    <div
      v-show="expanded"
      :id="contentId"
      role="region"
      :aria-labelledby="titleId"
      class="border-t border-violet-100 px-4 pb-4 pt-3"
    >
      <p class="mb-2 text-xs text-gray-600">
        {{ $t(sourceTranslationKey) }} ·
        {{ $t('workspace.components.progress.SystemInstructionActivityItem.captured_at', { time: captureTime }) }} ·
        {{ $t('workspace.components.progress.SystemInstructionActivityItem.character_count', { count: characterCount }) }}
      </p>
      <pre tabindex="0" class="max-h-80 min-h-8 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-5 text-gray-900 select-text">{{ activity.content }}</pre>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import type { SystemInstructionActivity } from '~/types/activity/RunActivity';
import {
  countUnicodeCodePoints,
  getSystemInstructionSourceKey,
} from '~/services/activity/runActivityPresentation';

const props = defineProps<{
  activity: SystemInstructionActivity;
  runtimeKind?: string | null;
  isHighlighted?: boolean;
}>();

const expanded = ref(false);
const contentId = computed(() => `system-instruction-content-${props.activity.activityId}`);
const titleId = computed(() => `system-instruction-title-${props.activity.activityId}`);
const characterCount = computed(() => countUnicodeCodePoints(props.activity.content));
const captureTime = computed(() => props.activity.timestamp.toLocaleString(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
}));
const sourceTranslationKey = computed(() =>
  `workspace.components.progress.SystemInstructionActivityItem.source.${getSystemInstructionSourceKey(props.runtimeKind)}`,
);
</script>
