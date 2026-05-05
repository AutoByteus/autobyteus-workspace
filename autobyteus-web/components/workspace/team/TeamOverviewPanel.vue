<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <section
      class="flex flex-col border-b border-gray-200 transition-all duration-300 ease-in-out"
      :class="taskPlanSectionClass"
      data-test="team-task-plan-section"
    >
      <button
        type="button"
        class="flex flex-shrink-0 cursor-pointer select-none items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-50"
        :aria-expanded="isTaskPlanExpanded ? 'true' : 'false'"
        data-test="team-task-plan-toggle"
        @click="toggleSection('taskPlan')"
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
            :class="isTaskPlanExpanded ? '' : '-rotate-90'"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
            {{ $t('workspace.components.workspace.team.TeamOverviewPanel.task_plan') }}
          </h3>
        </div>
        <span class="text-xs font-medium text-gray-600">{{ taskCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.tasks') }}</span>
      </button>

      <div v-show="isTaskPlanExpanded" class="min-h-0 overflow-hidden" :class="taskCount > 0 ? 'flex-1' : 'flex-none'">
        <TaskPlanDisplay
          v-if="taskCount > 0"
          :tasks="activeTeamContext?.taskPlan ?? null"
          :statuses="activeTeamContext?.taskStatuses ?? null"
        />
        <div v-else class="px-4 py-3 text-xs text-gray-500" data-test="team-task-plan-compact-empty">
          {{ $t('workspace.components.workspace.team.TaskPlanDisplay.no_task_plan_yet') }}
        </div>
      </div>
    </section>

    <section
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="isMessagesExpanded ? 'min-h-0 flex-1' : 'flex-none'"
      data-test="team-messages-section"
    >
      <button
        type="button"
        class="flex flex-shrink-0 cursor-pointer select-none items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:bg-gray-50"
        :aria-expanded="isMessagesExpanded ? 'true' : 'false'"
        data-test="team-messages-toggle"
        @click="toggleSection('messages')"
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
            :class="isMessagesExpanded ? '' : '-rotate-90'"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <h3 class="text-xs font-bold leading-none tracking-wider text-gray-900">
            {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages') }}
          </h3>
        </div>
        <span class="text-xs font-medium text-gray-600">{{ messageCount }} {{ $t('workspace.components.workspace.team.TeamOverviewPanel.messages_count') }}</span>
      </button>

      <TeamCommunicationPanel
        v-show="isMessagesExpanded"
        :team-run-id="activeTeamContext?.teamRunId || ''"
        :focused-member-run-id="focusedMemberContext?.state.runId || ''"
        :focused-member-name="focusedMemberName"
        class="min-h-0 flex-1"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import TaskPlanDisplay from '~/components/workspace/team/TaskPlanDisplay.vue';
import TeamCommunicationPanel from '~/components/workspace/team/TeamCommunicationPanel.vue';

const teamContextsStore = useAgentTeamContextsStore();
const teamCommunicationStore = useTeamCommunicationStore();
const expandedSection = ref<'taskPlan' | 'messages' | null>('messages');
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedMemberContext = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberName = computed(() => activeTeamContext.value?.focusedMemberName || null);
const taskCount = computed(() => activeTeamContext.value?.taskPlan?.length ?? 0);
const messageCount = computed(() => {
  const teamRunId = activeTeamContext.value?.teamRunId || '';
  const memberRunId = focusedMemberContext.value?.state.runId || '';
  return teamCommunicationStore.getPerspectiveForMember(teamRunId, memberRunId).messages.length;
});
const isTaskPlanExpanded = computed(() => expandedSection.value === 'taskPlan');
const isMessagesExpanded = computed(() => expandedSection.value === 'messages');
const taskPlanSectionClass = computed(() => (
  isTaskPlanExpanded.value && taskCount.value > 0 ? 'min-h-0 flex-1' : 'flex-none'
));

const toggleSection = (section: 'taskPlan' | 'messages') => {
  expandedSection.value = expandedSection.value === section ? null : section;
};
</script>
