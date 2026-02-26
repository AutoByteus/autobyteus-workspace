<template>
  <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between">
    <div class="p-5">
      <!-- Header with Icon and Name -->
      <div class="flex items-center mb-3">
        <div class="bg-green-100 p-2 rounded-md mr-3">
          <span class="i-heroicons-cpu-chip-20-solid w-5 h-5 text-green-600"></span>
        </div>
        <div>
            <h3 class="font-medium text-gray-900 text-lg">{{ agent.name }}</h3>
            <p class="text-xs text-gray-500 font-mono" :title="agent.id">ID: ...{{ agent.id.slice(-12) }}</p>
        </div>
      </div>
      
      <!-- Role -->
      <div class="mb-4">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</span>
        <p class="text-sm text-gray-800 mt-1">{{ agent.role }}</p>
      </div>

      <!-- Current Status -->
      <div class="mb-4">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
        <div class="flex items-center mt-1">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
            <p class="text-sm text-gray-800 font-mono">{{ agent.currentStatus }}</p>
        </div>
      </div>
      
      <!-- Workspace Info -->
      <div class="mb-4">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Workspace</span>
        <div class="flex items-center mt-1">
          <span class="i-heroicons-server-20-solid w-4 h-4 text-gray-500 mr-1.5"></span>
          <p class="text-sm text-gray-800">{{ agent.workspace ? agent.workspace.name : 'None' }}</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end items-center mt-4 p-4 bg-gray-50 border-t border-gray-200 space-x-2">
      <button 
        @click="$emit('terminate-agent', agent.id)"
        class="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-semibold"
      >
        Terminate
      </button>
      <button 
        @click="$emit('open-agent', agent)"
        class="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
      >
        Open
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type AgentRun = {
  id: string;
  name: string;
  role: string;
  currentStatus: string;
  agentDefinitionId?: string | null;
  workspace?: {
    workspaceId: string;
    name: string;
    config: unknown;
  } | null;
};

defineProps<{  agent: AgentRun;
}>();

defineEmits(['open-agent', 'terminate-agent']);
</script>
