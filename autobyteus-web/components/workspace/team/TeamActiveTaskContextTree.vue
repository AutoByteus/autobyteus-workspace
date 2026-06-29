<template>
  <div class="space-y-1 border-l border-slate-100 pl-2" data-test="team-active-task-context-tree">
    <article
      v-for="entry in entries"
      :key="entry.node.memberRouteKey"
      class="rounded-md border border-transparent bg-slate-50/50 py-1"
      :class="isEntrySelected(entry) ? 'border-indigo-100 bg-indigo-50/80' : ''"
      :data-test="entry.kind === 'task_team' ? 'left-task-team-context' : 'left-task-agent-context'"
    >
      <button
        type="button"
        data-test="left-active-task-summary-row"
        class="w-full rounded px-2 py-1 text-left text-xs font-medium leading-5 transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="isEntrySelected(entry) ? 'text-indigo-900' : 'text-slate-800'"
        :title="taskSummary(entry)"
        @click="$emit('select-task', entry.node.memberRouteKey)"
      >
        <span class="line-clamp-2 whitespace-pre-line">{{ taskSummary(entry) }}</span>
      </button>

      <button
        type="button"
        data-test="left-active-task-actor-row"
        class="flex w-full min-w-0 items-center rounded px-2 py-1 text-left text-xs transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="focusedMemberRouteKey === entry.node.memberRouteKey ? 'bg-indigo-100 text-indigo-900' : 'text-slate-700'"
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
          class="flex min-w-0 items-center rounded px-2 py-1 text-left text-xs transition-colors hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :class="focusedMemberRouteKey === member.node.memberRouteKey ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600'"
          :style="{ marginLeft: `${(member.depth + 1) * 12}px`, width: `calc(100% - ${(member.depth + 1) * 12}px)` }"
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

      <div v-if="entry.taskReferenceFiles.length" class="mt-1 space-y-0.5 px-2" data-test="left-active-task-references">
        <p class="px-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400">References</p>
        <button
          v-for="reference in entry.taskReferenceFiles"
          :key="reference.referenceId"
          type="button"
          data-test="left-active-task-reference-row"
          class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          :class="isReferenceSelected(entry, reference.referenceId) ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'"
          :title="reference.path"
          @click="$emit('select-reference', { memberRouteKey: entry.node.memberRouteKey, referenceId: reference.referenceId })"
        >
          <Icon
            :icon="referenceFileIcon(reference)"
            class="h-3.5 w-3.5 shrink-0"
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
        <summary class="cursor-pointer rounded px-1 py-1 text-[0.625rem] font-semibold uppercase tracking-wide text-slate-400 hover:bg-white/80">
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
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { ActiveTaskEntry } from '~/utils/teamActiveTaskEntries';
import type { TeamActiveTaskSelection } from '~/stores/teamActiveTaskSelectionStore';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamReferences/referenceFilePresentation';
import {
  buildActiveTaskTechnicalInput,
  buildActiveTaskTechnicalRows,
} from '~/utils/teamActiveTaskTechnicalDetails';

const props = defineProps<{
  entries: ActiveTaskEntry[];
  selection: TeamActiveTaskSelection | null;
  focusedMemberRouteKey?: string | null;
}>();

defineEmits<{
  (e: 'select-task', memberRouteKey: string): void;
  (e: 'select-reference', payload: { memberRouteKey: string; referenceId: string }): void;
  (e: 'select-member', memberRouteKey: string): void;
}>();

const effectiveSelectedMemberRouteKey = computed(() => {
  const selectedMemberRouteKey = props.selection?.memberRouteKey ?? '';
  return props.entries.some((entry) => entry.node.memberRouteKey === selectedMemberRouteKey)
    ? selectedMemberRouteKey
    : props.entries[0]?.node.memberRouteKey ?? null;
});

const effectiveSelectedReferenceId = computed(() => {
  const selectedEntry = props.entries.find((entry) => entry.node.memberRouteKey === effectiveSelectedMemberRouteKey.value) ?? null;
  const selectedReferenceId = props.selection?.referenceId ?? '';
  return selectedEntry?.taskReferenceFiles.some((reference) => reference.referenceId === selectedReferenceId)
    ? selectedReferenceId
    : null;
});

const taskSummary = (entry: ActiveTaskEntry): string => (
  entry.taskDescription || entry.taskLabel || entry.targetDisplayName || 'Task description unavailable'
);

const isEntrySelected = (entry: ActiveTaskEntry): boolean => (
  effectiveSelectedMemberRouteKey.value === entry.node.memberRouteKey
);

const isReferenceSelected = (entry: ActiveTaskEntry, referenceId: string): boolean => (
  isEntrySelected(entry) && effectiveSelectedReferenceId.value === referenceId
);

const initials = (displayName: string): string => {
  const words = displayName.trim().split(/[\s_-]+/).filter(Boolean);
  const value = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
  return value || '•';
};

const technicalRowsFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalRows(entry);
const technicalInputFor = (entry: ActiveTaskEntry) => buildActiveTaskTechnicalInput(entry);
</script>
