<template>
  <div 
    class="flex items-center py-1 px-2 rounded cursor-pointer transition-colors text-xs"
    :class="isFocused 
      ? 'bg-indigo-50 text-indigo-900' 
      : 'hover:bg-gray-50 text-gray-600'"
    @click="$emit('select', memberRouteKey)"
  >
    <!-- Status Dot -->
    <span 
      class="h-1.5 w-1.5 rounded-full flex-shrink-0 mr-2" 
      :class="statusColor"
    ></span>
    
    <!-- Member Name -->
    <span class="truncate flex-1">{{ memberName }}</span>
    
    <!-- Coordinator Badge -->
    <span 
      v-if="isCoordinator" 
      class="ml-1 text-[0.625rem] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"
    >
      {{ $t('workspace.components.workspace.running.TeamMemberRow.coord') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';

const props = defineProps<{
  memberName: string;
  memberRouteKey: string;
  memberContext: AgentContext | null | undefined;
  memberStatus?: AgentStatus | null;
  isFocused: boolean;
  isCoordinator: boolean;
}>();

defineEmits<{
  (e: 'select', memberRouteKey: string): void;
}>();

const statusColor = computed(() => {
  const status = props.memberContext?.state.currentStatus ?? props.memberStatus ?? AgentStatus.Offline;
  
  switch (status) {
    case AgentStatus.Offline:
      return 'bg-gray-300';
    case AgentStatus.Initializing:
      return 'bg-amber-400 animate-pulse';
    case AgentStatus.Idle: 
      return 'bg-green-400';
    case AgentStatus.Running:
      return 'bg-blue-400 animate-pulse';
    case AgentStatus.Error:
      return 'bg-red-500';
    default: 
      return 'bg-gray-300';
  }
});
</script>
