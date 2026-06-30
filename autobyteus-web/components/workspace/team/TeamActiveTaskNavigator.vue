<template>
  <div class="pb-1" data-test="team-active-task-navigator">
    <article
      v-for="entry in entries"
      :key="entry.node.memberRouteKey"
      class="border-l-2 transition-colors"
      :class="isEntrySelected(entry) ? 'border-blue-500 bg-blue-50' : 'border-transparent'"
      :data-test="entry.kind === 'task_team' ? 'team-task-detail-team-entry' : 'team-task-detail-agent-entry'"
    >
      <button
        type="button"
        data-test="team-active-task-summary-row"
        class="w-full px-3 py-2.5 text-left text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
        :title="taskSummary(entry)"
        @click="$emit('select-task', entry.node.memberRouteKey)"
      >
        <span class="flex min-w-0 items-start gap-2">
          <StatusDot
            class="mt-1.5"
            :kind="entry.kind === 'task_team' ? 'team' : 'agent'"
            :status="entry.status"
          />
          <span class="min-w-0 flex-1">
            <span class="line-clamp-2 whitespace-pre-line text-sm leading-5">{{ taskSummary(entry) }}</span>
            <span class="mt-1 block truncate text-[0.6875rem] uppercase tracking-wide text-slate-400">
              {{ entry.statusLabel }}
            </span>
          </span>
        </span>
      </button>

      <div v-if="entry.taskReferenceFiles.length" class="space-y-1 px-3 pb-2 pl-9" data-test="team-active-task-references">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">References</p>
        <button
          v-for="reference in entry.taskReferenceFiles"
          :key="reference.referenceId"
          type="button"
          data-test="team-active-task-reference-row"
          class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-white focus:outline-none focus-visible:bg-white"
          :class="isReferenceSelected(entry, reference.referenceId) ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'"
          :title="reference.path"
          @click="$emit('select-reference', { memberRouteKey: entry.node.memberRouteKey, referenceId: reference.referenceId })"
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
        data-test="team-active-task-technical-details"
      >
        <summary class="cursor-pointer rounded px-1 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:bg-blue-50">
          {{ $t('workspace.components.workspace.team.TeamActiveTasksSection.technical_details') }}
        </summary>
        <dl class="space-y-1 px-1 pb-1 text-[0.625rem] text-slate-600">
          <div v-for="detail in technicalRowsFor(entry)" :key="detail.key" class="min-w-0">
            <dt class="font-semibold text-slate-400">{{ $t(detail.labelKey) }}</dt>
            <dd :data-test="detail.dataTest" class="truncate font-mono" :title="detail.value">
              {{ detail.value }}
            </dd>
          </div>
        </dl>
        <pre v-if="technicalInputFor(entry)" data-test="active-task-technical-input" class="max-h-28 overflow-auto border-t border-slate-200 px-1 py-1 text-[0.625rem] text-slate-600">{{ technicalInputFor(entry) }}</pre>
      </details>
    </article>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';
import {
  buildActiveTaskTechnicalInput,
  buildActiveTaskTechnicalRows,
} from '~/utils/teamActiveTaskTechnicalDetails';

const props = withDefaults(defineProps<{
  entries: ActiveTaskEntry[];
  selectedTaskRouteKey?: string | null;
  selectedReferenceId?: string | null;
}>(), {
  selectedTaskRouteKey: null,
  selectedReferenceId: null,
});

defineEmits<{
  (e: 'select-task', memberRouteKey: string): void;
  (e: 'select-reference', payload: { memberRouteKey: string; referenceId: string }): void;
}>();

const taskSummary = (entry: ActiveTaskEntry): string => (
  entry.taskDescription || entry.taskLabel || entry.targetDisplayName || 'Task description unavailable'
);

const isEntrySelected = (entry: ActiveTaskEntry): boolean => (
  props.selectedTaskRouteKey === entry.node.memberRouteKey
);

const isReferenceSelected = (entry: ActiveTaskEntry, referenceId: string): boolean => (
  isEntrySelected(entry) && props.selectedReferenceId === referenceId
);

const technicalRowsFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalRows(entry);
const technicalInputFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalInput(entry);
</script>
