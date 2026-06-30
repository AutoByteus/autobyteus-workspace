<template>
  <div class="pb-1" data-test="team-active-task-navigator">
    <article
      v-for="entry in entries"
      :key="entry.node.memberRouteKey"
      class="border-l-2 transition-colors"
      :class="isEntrySelected(entry) ? 'border-blue-500 bg-blue-50' : 'border-transparent'"
      :data-test="entry.kind === 'task_team' ? 'left-task-team-context' : 'left-task-agent-context'"
    >
      <button
        type="button"
        data-test="left-active-task-summary-row"
        class="w-full px-3 py-2.5 text-left text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
        :title="taskSummary(entry)"
        @click="$emit('select-task', entry.node.memberRouteKey)"
      >
        <span class="line-clamp-2 whitespace-pre-line text-sm leading-5">{{ taskSummary(entry) }}</span>
      </button>

      <button
        type="button"
        data-test="left-active-task-actor-row"
        class="flex w-full min-w-0 items-center rounded px-3 py-1 text-left text-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
        :class="focusedMemberRouteKey === entry.node.memberRouteKey ? 'bg-blue-100 text-blue-900' : 'text-gray-700'"
        :title="entry.targetDisplayName"
        @click="$emit('select-member', entry.node.memberRouteKey)"
      >
        <StatusDot class="mr-1.5" kind="agent" :status="entry.status" />
        <span class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[0.5625rem] font-semibold uppercase text-slate-600">
          {{ initials(entry.targetDisplayName) }}
        </span>
        <span class="truncate font-medium">{{ entry.targetDisplayName }}</span>
        <span
          v-if="entry.kind === 'task_team'"
          class="ml-1 rounded bg-slate-100 px-1 text-[0.5625rem] font-semibold uppercase tracking-wide text-slate-500"
        >Team</span>
      </button>

      <div v-if="entry.kind === 'task_team' && entry.members.length" class="space-y-0.5" data-test="left-active-task-members">
        <button
          v-for="member in entry.members"
          :key="member.node.memberRouteKey"
          type="button"
          data-test="left-active-task-member-row"
          class="flex min-w-0 items-center rounded px-3 py-1 text-left text-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
          :class="focusedMemberRouteKey === member.node.memberRouteKey ? 'bg-blue-100 text-blue-900' : 'text-gray-600'"
          :style="memberRowStyle(member.depth)"
          :title="member.displayName"
          @click="$emit('select-member', member.node.memberRouteKey)"
        >
          <StatusDot class="mr-1.5" kind="agent" :status="member.node.currentStatus" />
          <span class="mr-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[0.5625rem] font-semibold uppercase text-slate-600">
            {{ initials(member.displayName) }}
          </span>
          <span class="truncate">{{ member.displayName }}</span>
          <span
            v-if="member.node.memberKind === 'agent_team'"
            class="ml-1 rounded bg-slate-100 px-1 text-[0.5625rem] font-semibold uppercase tracking-wide text-slate-500"
          >Team</span>
        </button>
      </div>

      <div v-if="entry.taskReferenceFiles.length" class="space-y-1 px-3 pb-2 pl-9" data-test="left-active-task-references">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">References</p>
        <button
          v-for="reference in entry.taskReferenceFiles"
          :key="reference.referenceId"
          type="button"
          data-test="left-active-task-reference-row"
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
        data-test="left-active-task-technical-details"
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
  focusedMemberRouteKey?: string | null;
}>(), {
  selectedTaskRouteKey: null,
  selectedReferenceId: null,
  focusedMemberRouteKey: null,
});

defineEmits<{
  (e: 'select-task', memberRouteKey: string): void;
  (e: 'select-reference', payload: { memberRouteKey: string; referenceId: string }): void;
  (e: 'select-member', memberRouteKey: string): void;
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

const initials = (displayName: string): string => {
  const words = displayName.trim().split(/[\s_-]+/).filter(Boolean);
  const value = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
  return value || '•';
};

const memberRowStyle = (depth: number): Record<string, string> => {
  const indent = (depth + 1) * 12;
  return {
    marginLeft: `${indent}px`,
    width: `calc(100% - ${indent}px)`,
  };
};

const technicalRowsFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalRows(entry);
const technicalInputFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalInput(entry);
</script>
