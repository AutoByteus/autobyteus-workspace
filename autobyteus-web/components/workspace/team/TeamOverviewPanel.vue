<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
      <h3 class="text-sm font-semibold text-gray-900">Task Plan</h3>
      <span v-if="teamName" class="text-xs text-gray-500">{{ teamName }}</span>
    </div>

    <!-- Task Plan Display -->
    <div class="flex-grow overflow-auto min-h-0">
      <TaskPlanDisplay 
        :tasks="activeTeamContext?.taskPlan ?? null" 
        :statuses="activeTeamContext?.taskStatuses ?? null" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import TaskPlanDisplay from '~/components/workspace/team/TaskPlanDisplay.vue';

const teamContextsStore = useAgentTeamContextsStore();
const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const teamName = computed(() => activeTeamContext.value?.config.teamDefinitionName);
</script>
