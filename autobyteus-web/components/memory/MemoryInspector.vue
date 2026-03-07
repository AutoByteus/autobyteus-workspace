<template>
  <div class="flex flex-col h-full bg-white">
    <div class="h-16 flex items-center px-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">Memory Inspector</h2>
        <p class="text-xs text-gray-500">
          {{ headerSubtitle }}
        </p>
      </div>
    </div>

    <div v-if="activeError" class="px-6 py-3 border-b border-red-200 bg-red-50 text-sm text-red-700">
      {{ activeError }}
    </div>

    <div v-if="!hasSelection" class="flex-1 flex items-center justify-center text-gray-400">
      Select a memory entry to inspect.
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="px-6 pt-4">
        <nav class="flex space-x-2 border-b border-gray-200">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="px-3 py-2 text-sm font-semibold rounded-t-md"
            :class="activeTab === tab.id ? 'bg-white text-blue-600 border border-gray-200 border-b-white' : 'text-gray-500 hover:text-gray-700'"
            @click="setTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div v-if="activeLoading && !activeMemoryView" class="py-12 text-center text-sm text-gray-500">
          Loading memory view...
        </div>

        <WorkingContextTab
          v-else-if="activeTab === 'working'"
          :messages="activeMemoryView?.workingContext ?? null"
        />

        <EpisodicTab
          v-else-if="activeTab === 'episodic'"
          :items="activeMemoryView?.episodic ?? null"
        />

        <SemanticTab
          v-else-if="activeTab === 'semantic'"
          :items="activeMemoryView?.semantic ?? null"
        />

        <RawTracesTab
          v-else-if="activeTab === 'raw'"
          :traces="activeMemoryView?.rawTraces ?? null"
          :limit="activeRawTraceLimit"
          :loading="activeLoading"
          @updateLimit="updateRawTraceLimit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';
import { useMemoryScopeStore } from '~/stores/memoryScopeStore';
import { useTeamMemoryViewStore } from '~/stores/teamMemoryViewStore';
import WorkingContextTab from './WorkingContextTab.vue';
import EpisodicTab from './EpisodicTab.vue';
import SemanticTab from './SemanticTab.vue';
import RawTracesTab from './RawTracesTab.vue';

const scopeStore = useMemoryScopeStore();
const agentViewStore = useAgentMemoryViewStore();
const teamViewStore = useTeamMemoryViewStore();

const tabs = [
  { id: 'working', label: 'Working Context' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'raw', label: 'Raw Traces' },
];

const activeTab = ref('working');

const isAgentScope = computed(() => scopeStore.scope === 'agent');

const hasSelection = computed(() => {
  if (isAgentScope.value) {
    return Boolean(agentViewStore.selectedRunId);
  }
  return Boolean(teamViewStore.selectedTeamRunId && teamViewStore.selectedMemberRunId);
});

const activeError = computed(() => {
  return isAgentScope.value ? agentViewStore.error : teamViewStore.error;
});

const activeLoading = computed(() => {
  return isAgentScope.value ? agentViewStore.loading : teamViewStore.loading;
});

const activeMemoryView = computed(() => {
  return isAgentScope.value ? agentViewStore.memoryView : teamViewStore.memoryView;
});

const activeRawTraceLimit = computed(() => {
  return isAgentScope.value ? agentViewStore.rawTraceLimit : teamViewStore.rawTraceLimit;
});

const headerSubtitle = computed(() => {
  if (isAgentScope.value) {
    if (!agentViewStore.selectedRunId) {
      return 'Agent Runs: no selection';
    }
    return `Agent Run: ${agentViewStore.selectedRunId}`;
  }

  if (!teamViewStore.selectedTeamRunId || !teamViewStore.selectedMemberRunId) {
    return 'Team Runs: no selection';
  }

  const teamName = teamViewStore.selectedTeamDefinitionName || teamViewStore.selectedTeamRunId;
  const memberName = teamViewStore.selectedMemberName || teamViewStore.selectedMemberRouteKey || 'member';
  return `Team: ${teamName} / Member: ${memberName} / Run: ${teamViewStore.selectedMemberRunId}`;
});

const setTab = async (tabId: string) => {
  activeTab.value = tabId;
  const includeRawTraces = tabId === 'raw';

  if (isAgentScope.value) {
    await agentViewStore.setIncludeRawTraces(includeRawTraces);
    return;
  }
  await teamViewStore.setIncludeRawTraces(includeRawTraces);
};

const updateRawTraceLimit = async (limit: number) => {
  if (isAgentScope.value) {
    await agentViewStore.setRawTraceLimit(limit);
    return;
  }
  await teamViewStore.setRawTraceLimit(limit);
};
</script>
