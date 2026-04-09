<template>
  <div>
    <!-- Team Run Header -->
    <div 
      class="flex items-center justify-between py-1.5 pl-2 pr-2 rounded cursor-pointer group transition-colors"
      :class="isSelected 
        ? 'bg-indigo-50 text-indigo-900' 
        : 'hover:bg-gray-50 text-gray-600'"
      @click="handleTeamClick"
    >
      <div class="flex items-center space-x-1.5 min-w-0">
        <!-- Expand/Collapse Chevron -->
        <span 
          class="transition-transform duration-200 flex items-center text-gray-400"
          :class="expanded ? 'rotate-90' : ''"
        >
          <span class="i-heroicons-chevron-right-20-solid w-3 h-3"></span>
        </span>
        
        <!-- Status Dot -->
        <span class="status-indicator h-2 w-2 rounded-full flex-shrink-0" :class="statusColor"></span>
        
        <!-- ID -->
        <span class="text-sm text-gray-700 truncate">
          {{ formatId(teamRun.teamRunId) }}
        </span>
      </div>

      <!-- Delete Button -->
      <button
        @click.stop="$emit('delete', teamRun.teamRunId)"
        class="delete-btn inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 transition-colors"
        :title="$t('workspace.components.workspace.running.RunningTeamRow.stop_and_remove_team')"
        :aria-label="$t('workspace.components.workspace.running.RunningTeamRow.close_team_run')"
      >
        <span class="text-sm leading-none font-semibold" aria-hidden="true">×</span>
      </button>
    </div>

    <!-- Member List (when expanded) -->
    <div v-if="expanded" class="ml-5 mt-0.5">
      <TeamMemberRow
        v-for="[memberName, memberContext] in teamRun.members"
        :key="memberName"
        :member-name="memberName"
        :member-context="memberContext"
        :is-focused="teamRun.focusedMemberName === memberName"
        :is-coordinator="memberName === coordinatorName"
        @select="handleMemberSelect"
      />
      <div v-if="teamRun.members.size === 0" class="text-xs text-gray-400 py-1 px-2">{{ $t('workspace.components.workspace.running.RunningTeamRow.no_members_yet') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import TeamMemberRow from './TeamMemberRow.vue';

const props = defineProps<{
  teamRun: AgentTeamContext;
  isSelected?: boolean;
  coordinatorName?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'select-member', teamRunId: string, memberName: string): void;
}>();

const expanded = ref(false);

// Auto-expand when team becomes selected
watch(() => props.isSelected, (selected) => {
  if (selected) {
    expanded.value = true;
    // Auto-focus coordinator if no member is focused
    if (!props.teamRun.focusedMemberName && props.coordinatorName) {
      emit('select-member', props.teamRun.teamRunId, props.coordinatorName);
    }
  }
}, { immediate: true });

const handleTeamClick = () => {
  // Toggle expand/collapse
  expanded.value = !expanded.value;
  // Also select the team
  emit('select', props.teamRun.teamRunId);
};

const handleMemberSelect = (memberName: string) => {
  emit('select-member', props.teamRun.teamRunId, memberName);
};

const formatId = (id: string) => {
  if (id.startsWith('temp-')) return id;
  return id.substring(0, 8); 
};

const statusColor = computed(() => {
  switch (props.teamRun.currentStatus) {
    case AgentTeamStatus.Idle: return 'bg-green-400';
    case AgentTeamStatus.Processing: return 'bg-blue-400 animate-pulse';
    case AgentTeamStatus.Bootstrapping: return 'bg-purple-400 animate-pulse';
    case AgentTeamStatus.Error: return 'bg-red-500';
    case AgentTeamStatus.ShutdownComplete: return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
});
</script>
