<template>
  <div class="border-l border-slate-200 pl-2" data-test="team-delegated-task-lifecycle-item">
    <button
      type="button"
      data-test="team-delegated-task-lifecycle-row"
      class="w-full rounded px-2 py-2 text-left transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      :class="isSelected ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'"
      :aria-pressed="isSelected"
      :aria-label="accessibleLabel"
      :title="accessibleLabel"
      @click="$emit('select-item', { entryKey, itemKey: item.itemKey })"
    >
      <div class="flex items-start gap-2">
        <Icon
          :icon="itemIcon"
          class="mt-0.5 h-4 w-4 shrink-0"
          :class="itemIconClass"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <span class="line-clamp-2 text-xs font-semibold leading-4" data-test="team-delegated-task-lifecycle-label">
            {{ itemLabel }}
          </span>
          <div class="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-slate-500">
            <p class="min-w-0 truncate" data-test="team-delegated-task-lifecycle-direction">
              {{ directionLabel }}
            </p>
            <time class="shrink-0 text-[0.6875rem] text-slate-400" :datetime="item.createdAt">
              {{ compactTimestamp }}
            </time>
          </div>
          <p class="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-4 text-slate-600" data-test="team-delegated-task-lifecycle-preview">
            {{ previewContent }}
          </p>
        </div>
      </div>
    </button>

    <div v-if="item.referenceFiles.length" class="space-y-1 pb-2 pl-6 pr-2" data-test="team-delegated-task-update-references">
      <button
        v-for="reference in item.referenceFiles"
        :key="reference.referenceId"
        type="button"
        data-test="team-delegated-task-reference-row"
        class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        :class="isReferenceSelected(reference.referenceId) ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'"
        :aria-pressed="isReferenceSelected(reference.referenceId)"
        :aria-label="reference.path"
        :title="reference.path"
        @click="$emit('select-reference', { entryKey, itemKey: item.itemKey, referenceId: reference.referenceId })"
      >
        <Icon :icon="referenceFileIcon(reference)" class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ referenceFileName(reference.path) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  DelegatedTaskItemLocator,
  DelegatedTaskLifecycleItem,
  DelegatedTaskParticipant,
  DelegatedTaskReferenceLocator,
} from '~/utils/teamDelegatedTaskEntries';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';

const props = withDefaults(defineProps<{
  entryKey: string;
  item: Exclude<DelegatedTaskLifecycleItem, { kind: 'assignment' }>;
  selectedItemKey?: string | null;
  selectedReferenceId?: string | null;
}>(), {
  selectedItemKey: null,
  selectedReferenceId: null,
});

defineEmits<{
  (e: 'select-item', payload: DelegatedTaskItemLocator): void;
  (e: 'select-reference', payload: DelegatedTaskReferenceLocator): void;
}>();

const { t } = useLocalization();

const itemLabel = computed((): string => {
  if (props.item.kind === 'submission') {
    return t(props.item.revised
      ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.revised_result_submitted'
      : 'workspace.components.workspace.team.TeamDelegatedTasksSection.result_submitted', {
      ordinal: props.item.resultOrdinal,
    });
  }
  if (props.item.kind === 'review') {
    return t(props.item.decision === 'request_revision'
      ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested'
      : 'workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted', {
      ordinal: props.item.reviewedResultOrdinal,
    });
  }
  return t('workspace.components.workspace.team.TeamDelegatedTasksSection.task_interrupted');
});

const participantLabel = (participant: DelegatedTaskParticipant): string => {
  if (participant.kind === 'named') return participant.label;
  return t(participant.kind === 'delegator_fallback'
    ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_delegator'
    : 'workspace.components.workspace.team.TeamDelegatedTasksSection.task_assignee');
};

const directionLabel = computed((): string => {
  if (props.item.direction.kind === 'system') {
    return t('workspace.components.workspace.team.TeamDelegatedTasksSection.system_lifecycle_event');
  }
  return `${participantLabel(props.item.direction.from)} → ${participantLabel(props.item.direction.to)}`;
});

const compactTimestamp = computed((): string => {
  const date = new Date(props.item.createdAt);
  if (Number.isNaN(date.getTime())) return props.item.createdAt;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

const previewContent = computed((): string => props.item.content
  ?? t('workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted_fallback'));
const accessibleLabel = computed(() => [
  itemLabel.value,
  directionLabel.value,
  compactTimestamp.value,
  previewContent.value,
].join('. '));
const isSelected = computed(() => props.selectedItemKey === props.item.itemKey && !props.selectedReferenceId);
const isReferenceSelected = (referenceId: string): boolean => (
  props.selectedItemKey === props.item.itemKey && props.selectedReferenceId === referenceId
);
const itemIcon = computed((): string => {
  if (props.item.kind === 'submission') return 'heroicons:arrow-up-right';
  if (props.item.kind === 'interruption') return 'heroicons:exclamation-triangle';
  return props.item.decision === 'accept' ? 'heroicons:check-circle' : 'heroicons:arrow-down-left';
});
const itemIconClass = computed((): string => {
  if (props.item.kind === 'submission') return 'text-blue-500';
  if (props.item.kind === 'interruption') return 'text-rose-500';
  return props.item.decision === 'accept' ? 'text-emerald-500' : 'text-amber-500';
});
</script>
