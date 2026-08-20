<template>
  <div class="h-full overflow-y-auto p-4" data-test="delegated-task-item-detail">
    <header class="mb-4 border-b border-slate-100 pb-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <Icon :icon="itemIcon" class="h-4 w-4 shrink-0" :class="itemIconClass" aria-hidden="true" />
          <h3 class="text-base font-semibold text-slate-900" data-test="delegated-task-item-title">
            {{ itemTitle }}
          </h3>
        </div>
        <span
          v-if="item.kind === 'assignment'"
          class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
          :class="statusClass"
          data-test="delegated-task-detail-status"
        >
          <Icon :icon="statusIcon" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ statusLabel }}
        </span>
      </div>
      <p class="mt-1.5 flex min-w-0 items-center gap-1 text-sm text-slate-500" data-test="delegated-task-item-direction">
        <Icon
          :icon="item.direction.kind === 'system' ? 'heroicons:cog-6-tooth' : 'heroicons:arrow-right'"
          class="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <span class="truncate" :title="directionLabel">{{ directionLabel }}</span>
      </p>
      <time class="mt-1 block text-xs text-slate-400" :datetime="item.createdAt" data-test="delegated-task-item-time">
        {{ fullTimestamp }}
      </time>
    </header>

    <MarkdownRenderer
      :content="bodyContent"
      class="team-delegated-task-markdown text-[0.9375rem] leading-6 text-slate-700"
      :data-test="item.kind === 'assignment' ? 'delegated-task-task-body' : 'delegated-task-update-body'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  DelegatedTaskDisplayStatus,
  DelegatedTaskLifecycleItem,
  DelegatedTaskParticipant,
} from '~/utils/teamDelegatedTaskEntries';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';

const props = defineProps<{
  item: DelegatedTaskLifecycleItem;
  displayStatus: DelegatedTaskDisplayStatus;
}>();

const { t } = useLocalization();
const itemTitle = computed((): string => {
  if (props.item.kind === 'assignment') {
    return t('workspace.components.workspace.team.TeamDelegatedTasksSection.task_assigned');
  }
  if (props.item.kind === 'submission') {
    return t(props.item.revised
      ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.revised_result_submitted'
      : 'workspace.components.workspace.team.TeamDelegatedTasksSection.result_submitted', {
      ordinal: props.item.resultOrdinal,
    });
  }
  if (props.item.kind === 'review') {
    return t(props.item.decision === 'request_revision'
      ? 'workspace.components.workspace.team.TeamDelegatedTasksSection.revision_requested_for'
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
const directionLabel = computed((): string => props.item.direction.kind === 'system'
  ? t('workspace.components.workspace.team.TeamDelegatedTasksSection.system_lifecycle_event')
  : `${participantLabel(props.item.direction.from)} → ${participantLabel(props.item.direction.to)}`);
const fullTimestamp = computed((): string => {
  const date = new Date(props.item.createdAt);
  if (Number.isNaN(date.getTime())) return props.item.createdAt;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
});
const bodyContent = computed((): string => props.item.content
  ?? t('workspace.components.workspace.team.TeamDelegatedTasksSection.result_accepted_fallback'));
const statusLabel = computed((): string => {
  if (props.displayStatus === 'in_progress') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_in_progress');
  if (props.displayStatus === 'awaiting_review') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_awaiting_review');
  if (props.displayStatus === 'revision_requested') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_revision_requested');
  if (props.displayStatus === 'accepted') return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_accepted');
  return t('workspace.components.workspace.team.TeamDelegatedTasksSection.status_interrupted');
});
const statusIcon = computed((): string => {
  if (props.displayStatus === 'accepted') return 'heroicons:check-circle';
  if (props.displayStatus === 'interrupted') return 'heroicons:exclamation-triangle';
  if (props.displayStatus === 'awaiting_review') return 'heroicons:eye';
  if (props.displayStatus === 'revision_requested') return 'heroicons:arrow-path';
  return 'heroicons:play-circle';
});
const statusClass = computed((): string => {
  if (props.displayStatus === 'accepted') return 'bg-emerald-100 text-emerald-700';
  if (props.displayStatus === 'interrupted') return 'bg-rose-100 text-rose-700';
  if (props.displayStatus === 'awaiting_review') return 'bg-blue-100 text-blue-700';
  if (props.displayStatus === 'revision_requested') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
});
const itemIcon = computed((): string => {
  if (props.item.kind === 'assignment') return 'heroicons:clipboard-document-list';
  if (props.item.kind === 'submission') return 'heroicons:arrow-up-right';
  if (props.item.kind === 'interruption') return 'heroicons:exclamation-triangle';
  return props.item.decision === 'accept' ? 'heroicons:check-circle' : 'heroicons:arrow-down-left';
});
const itemIconClass = computed((): string => {
  if (props.item.kind === 'assignment') return 'text-slate-500';
  if (props.item.kind === 'submission') return 'text-blue-500';
  if (props.item.kind === 'interruption') return 'text-rose-500';
  return props.item.decision === 'accept' ? 'text-emerald-500' : 'text-amber-500';
});
</script>

<style scoped>
.team-delegated-task-markdown :deep(.markdown-body) {
  font-size: 0.9375rem;
  line-height: 1.5rem;
  color: rgb(51 65 85);
}

.team-delegated-task-markdown :deep(.markdown-body > :first-child) {
  margin-top: 0;
}
</style>
