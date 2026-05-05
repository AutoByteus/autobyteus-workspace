<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-900">{{ $t('workspace.components.workspace.team.TeamOverviewPanel.team') }}</h3>
      <span v-if="teamName" class="text-xs text-gray-500">{{ teamName }}</span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <section class="max-h-[34%] min-h-[8rem] overflow-hidden border-b border-gray-200">
        <div class="border-b border-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-600">
          {{ $t('workspace.components.workspace.team.TeamOverviewPanel.task_plan') }}
        </div>
        <div class="h-[calc(100%-2rem)] overflow-auto">
          <TaskPlanDisplay
            :tasks="activeTeamContext?.taskPlan ?? null"
            :statuses="activeTeamContext?.taskStatuses ?? null"
          />
        </div>
      </section>

      <section class="min-h-0 flex-1 overflow-hidden">
        <TeamCommunicationPanel
          :team-run-id="activeTeamContext?.teamRunId || ''"
          :focused-member-run-id="focusedMemberContext?.state.runId || ''"
          :focused-member-name="focusedMemberName"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import TaskPlanDisplay from '~/components/workspace/team/TaskPlanDisplay.vue';
import TeamCommunicationPanel from '~/components/workspace/team/TeamCommunicationPanel.vue';

const teamContextsStore = useAgentTeamContextsStore();
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedMemberContext = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberName = computed(() => activeTeamContext.value?.focusedMemberName || null);
const teamName = computed(() => activeTeamContext.value?.config.teamDefinitionName);
</script>
