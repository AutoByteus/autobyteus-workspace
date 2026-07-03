<template>
  <div class="pb-1" data-test="team-delegated-task-navigator">
    <article
      v-for="entry in entries"
      :key="entry.entryKey"
      class="border-l-2 transition-colors"
      :class="isEntrySelected(entry) ? 'border-blue-500 bg-blue-50' : 'border-transparent'"
      :data-test="entry.kind === 'task_team' ? 'team-delegated-task-team-entry' : 'team-delegated-task-agent-entry'"
    >
      <button
        type="button"
        data-test="team-delegated-task-summary-row"
        class="w-full px-3 py-2.5 text-left text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
        :title="taskSummary(entry)"
        @click="$emit('select-task', entry.entryKey)"
      >
        <span class="line-clamp-2 whitespace-pre-line text-sm leading-5">{{ taskSummary(entry) }}</span>
      </button>

      <div v-if="entry.taskReferenceFiles.length" class="space-y-1 px-3 pb-2" data-test="team-delegated-task-references">
        <button
          v-for="reference in entry.taskReferenceFiles"
          :key="reference.referenceId"
          type="button"
          data-test="team-delegated-task-reference-row"
          class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-white focus:outline-none focus-visible:bg-white"
          :class="isReferenceSelected(entry, reference.referenceId) ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'"
          :title="reference.path"
          @click="$emit('select-reference', { entryKey: entry.entryKey, referenceId: reference.referenceId })"
        >
          <Icon
            :icon="referenceFileIcon(reference)"
            class="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span class="truncate">{{ referenceFileName(reference.path) }}</span>
        </button>
      </div>

      <details
        v-if="technicalRowsFor(entry).length || technicalInputFor(entry)"
        class="mt-1 px-2"
        data-test="team-delegated-task-technical-details"
      >
        <summary class="cursor-pointer rounded px-1 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:bg-blue-50">
          {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details') }}
        </summary>
        <dl class="space-y-1 px-1 pb-1 text-[0.625rem] text-slate-600">
          <div v-for="detail in technicalRowsFor(entry)" :key="detail.key" class="min-w-0">
            <dt class="font-semibold text-slate-400">{{ $t(detail.labelKey) }}</dt>
            <dd :data-test="detail.dataTest" class="truncate font-mono" :title="detail.value">
              {{ detail.value }}
            </dd>
          </div>
        </dl>
        <pre v-if="technicalInputFor(entry)" data-test="delegated-task-technical-input" class="max-h-28 overflow-auto border-t border-slate-200 px-1 py-1 text-[0.625rem] text-slate-600">{{ technicalInputFor(entry) }}</pre>
      </details>
    </article>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { DelegatedTaskEntry } from '~/utils/teamDelegatedTaskEntries';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';
import {
  buildDelegatedTaskTechnicalInput,
  buildDelegatedTaskTechnicalRows,
} from '~/utils/teamDelegatedTaskTechnicalDetails';

const props = withDefaults(defineProps<{
  entries: DelegatedTaskEntry[];
  selectedEntryKey?: string | null;
  selectedReferenceId?: string | null;
}>(), {
  selectedEntryKey: null,
  selectedReferenceId: null,
});

defineEmits<{
  (e: 'select-task', entryKey: string): void;
  (e: 'select-reference', payload: { entryKey: string; referenceId: string }): void;
}>();

const taskSummary = (entry: DelegatedTaskEntry): string => (
  entry.taskDescription || entry.taskLabel || entry.targetDisplayName || 'Task description unavailable'
);

const isEntrySelected = (entry: DelegatedTaskEntry): boolean => (
  props.selectedEntryKey === entry.entryKey
);

const isReferenceSelected = (entry: DelegatedTaskEntry, referenceId: string): boolean => (
  isEntrySelected(entry) && props.selectedReferenceId === referenceId
);

const technicalRowsFor = (entry: DelegatedTaskEntry) => buildDelegatedTaskTechnicalRows(entry);
const technicalInputFor = (entry: DelegatedTaskEntry) => buildDelegatedTaskTechnicalInput(entry);
</script>
