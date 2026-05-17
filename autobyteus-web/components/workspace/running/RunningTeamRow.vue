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
        v-for="member in displayMembers"
        :key="member.node.memberRouteKey"
        :member-name="member.node.displayName || member.node.memberName"
        :member-route-key="member.node.memberRouteKey"
        :member-context="member.context"
        :style="{ marginLeft: `${member.depth * 12}px` }"
        :is-focused="teamRun.focusedMemberRouteKey === member.node.memberRouteKey"
        :is-coordinator="member.node.memberRouteKey === coordinatorRouteKey"
        @select="handleMemberSelect"
      />
      <div v-if="displayMembers.length === 0" class="text-xs text-gray-400 py-1 px-2">{{ $t('workspace.components.workspace.running.RunningTeamRow.no_members_yet') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import TeamMemberRow from './TeamMemberRow.vue';
import { flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers';

const props = defineProps<{
  teamRun: AgentTeamContext;
  isSelected?: boolean;
  coordinatorRouteKey?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'select-member', teamRunId: string, memberRouteKey: string): void;
}>();

const expanded = ref(false);

// Auto-expand when team becomes selected
watch(() => props.isSelected, (selected) => {
  if (selected) {
    expanded.value = true;
    // Auto-focus coordinator if no member is focused
    if (!props.teamRun.focusedMemberRouteKey && props.coordinatorRouteKey) {
      emit('select-member', props.teamRun.teamRunId, props.coordinatorRouteKey);
    }
  }
}, { immediate: true });

const displayMembers = computed(() =>
  flattenTeamMemberNodesForDisplay(props.teamRun.memberTree).map((entry) => ({
    ...entry,
    context: props.teamRun.leafAgentContextsByRouteKey.get(entry.node.memberRouteKey) || null,
  })),
);

const handleTeamClick = () => {
  // Toggle expand/collapse
  expanded.value = !expanded.value;
  // Also select the team
  emit('select', props.teamRun.teamRunId);
};

const handleMemberSelect = (memberRouteKey: string) => {
  emit('select-member', props.teamRun.teamRunId, memberRouteKey);
};

const formatId = (id: string) => {
  if (id.startsWith('temp-')) return id;
  return id.substring(0, 8); 
};

const statusColor = computed(() => {
  switch (props.teamRun.currentStatus) {
    case AgentTeamStatus.Offline: return 'bg-gray-300';
    case AgentTeamStatus.Initializing: return 'bg-amber-400 animate-pulse';
    case AgentTeamStatus.Idle: return 'bg-green-400';
    case AgentTeamStatus.Running: return 'bg-blue-400 animate-pulse';
    case AgentTeamStatus.Error: return 'bg-red-500';
    default: return 'bg-gray-300';
  }
});
</script>
