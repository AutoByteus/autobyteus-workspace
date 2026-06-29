<template>
  <article
    :data-test="entry.kind === 'task_team' ? 'task-team-active-task-row' : 'task-agent-active-task-row'"
    class="border-l-2 transition-colors"
    :class="selected ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'"
  >
    <button
      type="button"
      data-test="active-task-select-row"
      class="w-full px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-indigo-50"
      @click="$emit('select-task', entry.node.memberRouteKey)"
    >
      <div class="flex items-start justify-between gap-2">
        <p data-test="active-task-target" class="min-w-0 truncate text-sm font-semibold" :class="selected ? 'text-indigo-800' : 'text-slate-900'">
          {{ entry.targetDisplayName }}
        </p>
        <span v-if="displayStatusLabel" data-test="active-task-status-chip" class="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[0.68rem] font-medium text-slate-500 ring-1 ring-slate-100">
          {{ displayStatusLabel }}
        </span>
      </div>
      <p class="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-600">
        {{ entry.taskDescription || $t('workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable') }}
      </p>
    </button>

    <div v-if="selected && entry.taskReferenceFiles.length" class="space-y-1 px-3 pb-2 pl-8" data-test="active-task-reference-list">
      <button
        v-for="reference in entry.taskReferenceFiles"
        :key="reference.referenceId"
        type="button"
        data-test="active-task-reference-row"
        class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-white focus:outline-none focus-visible:bg-white"
        :class="selectedReferenceId === reference.referenceId ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'"
        :title="reference.path"
        @click="$emit('select-reference', reference.referenceId)"
      >
        <Icon
          :icon="referenceFileIcon(reference)"
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span class="truncate">{{ referenceFileName(reference.path) }}</span>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';

const props = defineProps<{
  entry: ActiveTaskEntry;
  selected: boolean;
  selectedReferenceId?: string | null;
}>();

defineEmits<{
  (e: 'select-task', memberRouteKey: string): void;
  (e: 'select-reference', referenceId: string): void;
}>();

const usefulStatusLabel = (statusLabel: string | null | undefined): string | null => {
  const normalized = statusLabel?.trim() ?? '';
  if (!normalized) return null;
  const key = normalized.toLowerCase();
  if (key === 'active' || key === 'unknown') return null;
  return normalized;
};

const displayStatusLabel = computed(() => usefulStatusLabel(props.entry.statusLabel));
</script>
