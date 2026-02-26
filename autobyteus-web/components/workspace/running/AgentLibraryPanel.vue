<template>
  <div class="h-full flex flex-col bg-white overflow-hidden text-sm">
    <!-- Search -->
    <div class="p-3 border-b border-gray-100">
      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
          <span class="i-heroicons-magnifying-glass-20-solid w-4 h-4"></span>
        </span>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search agents & teams..." 
          class="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
        >
      </div>
    </div>

    <!-- Lists -->
    <div class="flex-1 overflow-y-auto p-2 space-y-4">
      
      <!-- Agents -->
      <div v-if="filteredAgents.length > 0">
        <h4 class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agents</h4>
        <div class="space-y-0.5">
          <button
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="w-full group flex items-start p-2 rounded-md hover:bg-indigo-50 text-left transition-colors border border-transparent hover:border-indigo-100"
            @click="selectAgent(agent)"
          >
            <div class="mt-0.5 mr-2.5 flex-shrink-0 text-indigo-500">
              <span class="i-heroicons-cpu-chip-20-solid w-5 h-5"></span>
            </div>
            <div class="min-w-0">
              <div class="font-medium text-gray-900 truncate">{{ agent.name }}</div>
              <div class="text-xs text-gray-500 line-clamp-2 mt-0.5">{{ agent.description || 'No description' }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Teams -->
      <div v-if="filteredTeams.length > 0">
        <h4 class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-3">Teams</h4>
        <div class="space-y-0.5">
          <button
            v-for="team in filteredTeams"
            :key="team.id"
            class="w-full group flex items-start p-2 rounded-md hover:bg-emerald-50 text-left transition-colors border border-transparent hover:border-emerald-100"
            @click="selectTeam(team)"
          >
            <div class="mt-0.5 mr-2.5 flex-shrink-0 text-emerald-500">
              <span class="i-heroicons-user-group-20-solid w-5 h-5"></span>
            </div>
            <div class="min-w-0">
              <div class="font-medium text-gray-900 truncate">{{ team.name }}</div>
              <div class="text-xs text-gray-500 line-clamp-2 mt-0.5">{{ team.description || 'No description' }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredAgents.length === 0 && filteredTeams.length === 0" class="text-center py-8 text-gray-400">
        <span class="block mb-2">
          <span class="i-heroicons-archive-box-20-solid w-8 h-8 mx-auto opacity-50"></span>
        </span>
        <span class="text-sm">No items found</span>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const agentDefinitionStore = useAgentDefinitionStore();
const teamDefinitionStore = useAgentTeamDefinitionStore();
const agentRunConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const selectionStore = useAgentSelectionStore();

const searchQuery = ref('');

onMounted(() => {
  if (agentDefinitionStore.agentDefinitions.length === 0) agentDefinitionStore.fetchAllAgentDefinitions();
  if (teamDefinitionStore.agentTeamDefinitions.length === 0) teamDefinitionStore.fetchAllAgentTeamDefinitions();
});

const filteredAgents = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return agentDefinitionStore.agentDefinitions.filter(a => 
    a.name.toLowerCase().includes(query) || (a.description?.toLowerCase().includes(query))
  );
});

const filteredTeams = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return teamDefinitionStore.agentTeamDefinitions.filter(t => 
    t.name.toLowerCase().includes(query) || (t.description?.toLowerCase().includes(query))
  );
});

const selectAgent = (agent: AgentDefinition) => {
  agentRunConfigStore.setTemplate(agent);
  teamRunConfigStore.clearConfig();
  selectionStore.clearSelection();
  emit('close');
};

const selectTeam = (team: AgentTeamDefinition) => {
  teamRunConfigStore.setTemplate(team);
  agentRunConfigStore.clearConfig();
  selectionStore.clearSelection();
  emit('close');
};
</script>
