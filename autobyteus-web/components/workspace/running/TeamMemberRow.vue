<template>
  <div 
    class="flex items-center py-1 px-2 rounded cursor-pointer transition-colors text-xs"
    :class="isFocused 
      ? 'bg-indigo-50 text-indigo-900' 
      : 'hover:bg-gray-50 text-gray-600'"
    @click="$emit('select', memberName)"
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
      class="ml-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"
    >
      Coord
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';

const props = defineProps<{
  memberName: string;
  memberContext: AgentContext | undefined;
  isFocused: boolean;
  isCoordinator: boolean;
}>();

defineEmits<{
  (e: 'select', memberName: string): void;
}>();

const statusColor = computed(() => {
  if (!props.memberContext) return 'bg-gray-300';
  
  switch (props.memberContext.state.currentStatus) {
    case AgentStatus.Idle: 
      return 'bg-green-400';
    case AgentStatus.Bootstrapping:
    case AgentStatus.ProcessingUserInput:
    case AgentStatus.ExecutingTool:
    case AgentStatus.ProcessingToolResult:
    case AgentStatus.AnalyzingLlmResponse:
      return 'bg-blue-400 animate-pulse';
    case AgentStatus.AwaitingToolApproval:
    case AgentStatus.AwaitingLlmResponse:
      return 'bg-yellow-400';
    case AgentStatus.Error:
    case AgentStatus.ToolDenied:
      return 'bg-red-500';
    case AgentStatus.ShuttingDown:
    case AgentStatus.ShutdownComplete:
      return 'bg-gray-400';
    default: 
      return 'bg-gray-300';
  }
});
</script>
