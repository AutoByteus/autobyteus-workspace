<template>
  <section data-test="team-delegated-tasks-section" class="flex min-h-0 flex-col overflow-hidden bg-white">
    <button
      type="button"
      data-test="team-delegated-tasks-header"
      class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transform text-gray-500 transition-transform duration-300"
          :class="collapsed ? '-rotate-90' : ''"
          data-test="team-delegated-tasks-disclosure"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="text-xs font-bold leading-none tracking-wider text-gray-900">
          {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.tasks') }}
        </span>
      </div>
      <span class="text-xs font-medium text-gray-600">
        {{ delegatedTaskEntries.length }} {{ delegatedTaskEntries.length === 1 ? $t('workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular') : $t('workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural') }}
      </span>
    </button>

    <div v-show="!collapsed" data-test="team-delegated-tasks-body" class="min-h-0 flex-1 overflow-hidden">
      <div v-if="delegatedTaskEntries.length === 0" class="flex h-full flex-1 items-center justify-center bg-white p-6 text-center">
        <div data-test="team-delegated-tasks-empty" class="max-w-[260px] px-4 py-8">
          <Icon icon="heroicons:clipboard-document-list" class="mx-auto h-9 w-9 text-gray-300" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-gray-700">
            {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.empty') }}
          </p>
          <p class="mt-1 text-xs leading-5 text-gray-500">
            {{ $t('workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail') }}
          </p>
        </div>
      </div>

      <div v-else class="flex h-full min-h-0 overflow-hidden" data-test="team-delegated-tasks-split">
        <aside
          class="min-h-0 shrink-0 overflow-y-auto border-r border-slate-200 pb-2"
          :style="{ width: `${leftPaneWidth}px` }"
          data-test="team-delegated-tasks-navigator"
        >
          <TeamDelegatedTaskNavigator
            :entries="delegatedTaskEntries"
            :selected-entry-key="selectedEntryKey"
            :selected-reference-id="selectedReferenceId"
            @select-task="selectTask"
            @select-reference="selectReference"
          />
        </aside>

        <div
          class="w-1 shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-blue-200"
          role="separator"
          aria-orientation="vertical"
          data-test="team-delegated-tasks-resize-handle"
          @mousedown="startResize"
        />

        <TeamDelegatedTaskDetailPane
          :selected-entry="selectedEntry"
          :selected-reference="selectedReference"
          :reference-refresh-signal="referenceRefreshSignal"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { ConversationTargetAddress } from '~/types/agent/ConversationTargetAddress';
import { useHorizontalSplitResize } from '~/composables/useHorizontalSplitResize';
import { deriveDelegatedTaskEntries, type DelegatedTaskEntry } from '~/utils/teamDelegatedTaskEntries';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';
import TeamDelegatedTaskDetailPane from '~/components/workspace/team/TeamDelegatedTaskDetailPane.vue';
import TeamDelegatedTaskNavigator from '~/components/workspace/team/TeamDelegatedTaskNavigator.vue';

const props = withDefaults(defineProps<{
  teamContext: AgentTeamContext;
  focusedAddress?: ConversationTargetAddress | null;
  collapsed?: boolean;
}>(), {
  focusedAddress: undefined,
  collapsed: false,
});

defineEmits<{
  (e: 'toggle'): void;
}>();

const selectedEntryKey = ref<string | null>(null);
const selectedReferenceId = ref<string | null>(null);
const referenceRefreshSignal = ref(0);
const { paneWidth: leftPaneWidth, startResize } = useHorizontalSplitResize({
  initialWidth: 248,
  minWidth: 168,
  maxWidth: 360,
});

const taskDelegationStore = useTaskDelegationStore();
const delegatedTaskEntries = computed<DelegatedTaskEntry[]>(() => deriveDelegatedTaskEntries(
  props.teamContext,
  taskDelegationStore.getRecordsForTeam(props.teamContext.teamRunId),
  props.focusedAddress,
));
const selectedEntry = computed(() => (
  delegatedTaskEntries.value.find((entry) => entry.entryKey === selectedEntryKey.value) ?? null
));
const selectedReference = computed(() => (
  selectedEntry.value?.taskReferenceFiles.find((reference) => reference.referenceId === selectedReferenceId.value) ?? null
));
const delegatedTaskSelectionSignature = computed(() => delegatedTaskEntries.value
  .map((entry) => `${entry.entryKey}:${entry.taskReferenceFiles.map((reference) => reference.referenceId).join(',')}`)
  .join('\n'));

watch(() => props.teamContext.teamRunId, () => {
  selectedEntryKey.value = null;
  selectedReferenceId.value = null;
  referenceRefreshSignal.value = 0;
});

watch(
  () => [props.teamContext.teamRunId, delegatedTaskSelectionSignature.value],
  () => {
    if (!delegatedTaskEntries.value.length) {
      selectedEntryKey.value = null;
      selectedReferenceId.value = null;
      return;
    }

    if (!selectedEntry.value) {
      selectedEntryKey.value = delegatedTaskEntries.value[0].entryKey;
      selectedReferenceId.value = null;
      return;
    }

    if (selectedReferenceId.value && !selectedReference.value) {
      selectedReferenceId.value = null;
    }
  },
  { immediate: true },
);

const selectTask = (entryKey: string): void => {
  if (!delegatedTaskEntries.value.some((entry) => entry.entryKey === entryKey)) {
    return;
  }
  selectedEntryKey.value = entryKey;
  selectedReferenceId.value = null;
};

const selectReference = (payload: { entryKey: string; referenceId: string }): void => {
  const entry = delegatedTaskEntries.value.find((candidate) => candidate.entryKey === payload.entryKey);
  if (!entry || !entry.taskReferenceFiles.some((reference) => reference.referenceId === payload.referenceId)) {
    return;
  }

  if (selectedEntryKey.value === payload.entryKey && selectedReferenceId.value === payload.referenceId) {
    referenceRefreshSignal.value += 1;
  }

  selectedEntryKey.value = payload.entryKey;
  selectedReferenceId.value = payload.referenceId;
};

</script>
