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
        class="w-full px-3 py-2.5 text-left text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        :class="isItemSelected(rootItem(entry)) ? 'bg-blue-50' : ''"
        :title="rootAccessibleLabel(entry)"
        :aria-label="rootAccessibleLabel(entry)"
        :aria-pressed="isItemSelected(rootItem(entry))"
        @click="$emit('select-item', { entryKey: entry.entryKey, itemKey: rootItem(entry).itemKey })"
      >
        <span class="line-clamp-2 whitespace-pre-line text-sm leading-5 text-slate-700">{{ rootItem(entry).content }}</span>
        <div class="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
            :class="statusClass(entry.displayStatus)"
            data-test="team-delegated-task-status"
          >
            <Icon :icon="statusIcon(entry.displayStatus)" class="h-3.5 w-3.5" aria-hidden="true" />
            {{ statusLabel(entry.displayStatus) }}
          </span>
          <span class="text-[0.6875rem] text-slate-400">
            {{ updatedLabel(entry.lastActivityAt) }}
          </span>
        </div>
        <span class="mt-1 block truncate text-xs text-slate-500" data-test="team-delegated-task-root-direction">
          {{ directionLabel(rootItem(entry).direction) }}
        </span>
      </button>

      <div v-if="rootItem(entry).referenceFiles.length" class="space-y-1 px-3 pb-2" data-test="team-delegated-task-references">
        <button
          v-for="reference in rootItem(entry).referenceFiles"
          :key="reference.referenceId"
          type="button"
          data-test="team-delegated-task-reference-row"
          class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
          :class="isReferenceSelected(rootItem(entry), reference.referenceId) ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'"
          :aria-pressed="isReferenceSelected(rootItem(entry), reference.referenceId)"
          :aria-label="reference.path"
          :title="reference.path"
          @click="$emit('select-reference', { entryKey: entry.entryKey, itemKey: rootItem(entry).itemKey, referenceId: reference.referenceId })"
        >
          <Icon :icon="referenceFileIcon(reference)" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ referenceFileName(reference.path) }}</span>
        </button>
      </div>

      <div v-if="updateItems(entry).length" class="space-y-0.5 px-2 pb-2 pl-4" data-test="team-delegated-task-lifecycle-list">
        <TeamDelegatedTaskLifecycleRow
          v-for="item in updateItems(entry)"
          :key="item.itemKey"
          :entry-key="entry.entryKey"
          :item="item"
          :selected-item-key="selectedItemKey"
          :selected-reference-id="selectedReferenceId"
          @select-item="$emit('select-item', $event)"
          @select-reference="$emit('select-reference', $event)"
        />
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  DelegatedTaskDirection,
  DelegatedTaskDisplayStatus,
  DelegatedTaskEntry,
  DelegatedTaskItemLocator,
  DelegatedTaskLifecycleItem,
  DelegatedTaskParticipant,
  DelegatedTaskReferenceLocator,
} from '~/utils/teamDelegatedTaskEntries';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';
import TeamDelegatedTaskLifecycleRow from './TeamDelegatedTaskLifecycleRow.vue';

const props = withDefaults(defineProps<{
  entries: readonly DelegatedTaskEntry[];
  selectedEntryKey?: string | null;
  selectedItemKey?: string | null;
  selectedReferenceId?: string | null;
}>(), {
  selectedEntryKey: null,
  selectedItemKey: null,
  selectedReferenceId: null,
});

defineEmits<{
  (e: 'select-item', payload: DelegatedTaskItemLocator): void;
  (e: 'select-reference', payload: DelegatedTaskReferenceLocator): void;
}>();

const { t } = useLocalization();
const rootItem = (entry: DelegatedTaskEntry): Extract<DelegatedTaskLifecycleItem, { kind: 'assignment' }> => {
  const item = entry.lifecycleItems[0];
  if (item.kind !== 'assignment') throw new Error(`Task '${entry.taskId}' has no assignment root item.`);
  return item;
};
const updateItems = (entry: DelegatedTaskEntry): Exclude<DelegatedTaskLifecycleItem, { kind: 'assignment' }>[] => (
  entry.lifecycleItems.slice(1) as Exclude<DelegatedTaskLifecycleItem, { kind: 'assignment' }>[]
);
const participantLabel = (participant: DelegatedTaskParticipant): string => {
  if (participant.kind === 'named') return participant.label;
  return t(participant.kind === 'delegator_fallback'
    ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_delegator'
    : 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_assignee');
};
const directionLabel = (direction: DelegatedTaskDirection): string => direction.kind === 'system'
  ? t('workspace.components.workspace.team.TeamDelegatedTasksSection.system_lifecycle_event')
  : `${participantLabel(direction.from)} → ${participantLabel(direction.to)}`;
const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const updatedLabel = (value: string): string => t(
  'workspace.components.workspace.team.TeamDelegatedTasksSection.updated_at',
  { time: formatTimestamp(value) },
);
const statusLabel = (status: DelegatedTaskDisplayStatus): string => {
  if (status === 'in_progress') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_in_progress');
  if (status === 'awaiting_review') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_awaiting_review');
  if (status === 'revision_requested') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_revision_requested');
  if (status === 'accepted') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_accepted');
  return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_interrupted');
};
const statusIcon = (status: DelegatedTaskDisplayStatus): string => {
  if (status === 'accepted') return 'heroicons:check-circle';
  if (status === 'interrupted') return 'heroicons:exclamation-triangle';
  if (status === 'awaiting_review') return 'heroicons:eye';
  if (status === 'revision_requested') return 'heroicons:arrow-path';
  return 'heroicons:play-circle';
};
const statusClass = (status: DelegatedTaskDisplayStatus): string => {
  if (status === 'accepted') return 'bg-emerald-100 text-emerald-700';
  if (status === 'interrupted') return 'bg-rose-100 text-rose-700';
  if (status === 'awaiting_review') return 'bg-blue-100 text-blue-700';
  if (status === 'revision_requested') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};
const isEntrySelected = (entry: DelegatedTaskEntry): boolean => props.selectedEntryKey === entry.entryKey;
const isItemSelected = (item: DelegatedTaskLifecycleItem): boolean => (
  props.selectedItemKey === item.itemKey && !props.selectedReferenceId
);
const isReferenceSelected = (item: DelegatedTaskLifecycleItem, referenceId: string): boolean => (
  props.selectedItemKey === item.itemKey && props.selectedReferenceId === referenceId
);
const rootAccessibleLabel = (entry: DelegatedTaskEntry): string => [
  rootItem(entry).content,
  statusLabel(entry.displayStatus),
  directionLabel(rootItem(entry).direction),
  updatedLabel(entry.lastActivityAt),
].join('. ');
</script>
