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

    <div v-if="viewStore.error" class="px-6 py-3 border-b border-red-200 bg-red-50 text-sm text-red-700">
      {{ viewStore.error }}
    </div>

    <div v-if="!viewStore.selectedRunId" class="flex-1 flex items-center justify-center text-gray-400">
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
        <div v-if="viewStore.loading && !viewStore.memoryView" class="py-12 text-center text-sm text-gray-500">
          Loading memory view...
        </div>

        <WorkingContextTab
          v-else-if="activeTab === 'working'"
          :messages="viewStore.memoryView?.workingContext ?? null"
        />

        <EpisodicTab
          v-else-if="activeTab === 'episodic'"
          :items="viewStore.memoryView?.episodic ?? null"
        />

        <SemanticTab
          v-else-if="activeTab === 'semantic'"
          :items="viewStore.memoryView?.semantic ?? null"
        />

        <RawTracesTab
          v-else-if="activeTab === 'raw'"
          :traces="viewStore.memoryView?.rawTraces ?? null"
          :limit="viewStore.rawTraceLimit"
          :loading="viewStore.loading"
          @updateLimit="updateRawTraceLimit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';
import WorkingContextTab from './WorkingContextTab.vue';
import EpisodicTab from './EpisodicTab.vue';
import SemanticTab from './SemanticTab.vue';
import RawTracesTab from './RawTracesTab.vue';

const viewStore = useAgentMemoryViewStore();

const tabs = [
  { id: 'working', label: 'Working Context' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'raw', label: 'Raw Traces' },
];

const activeTab = ref('working');

const headerSubtitle = computed(() => {
  if (!viewStore.selectedRunId) return 'No selection';
  return `Run: ${viewStore.selectedRunId}`;
});

const setTab = async (tabId: string) => {
  activeTab.value = tabId;
  await viewStore.setIncludeRawTraces(tabId === 'raw');
};

const updateRawTraceLimit = async (limit: number) => {
  await viewStore.setRawTraceLimit(limit);
};
</script>
