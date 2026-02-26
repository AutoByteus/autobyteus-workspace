<template>
  <div class="flex flex-col h-full bg-white">
    <div class="h-16 flex items-center px-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <div>
        <h1 class="text-lg font-bold text-gray-800">Memory</h1>
        <p class="text-xs text-gray-500">Stored run memories</p>
      </div>
    </div>

    <div class="p-4 border-b border-gray-100 space-y-3">
      <div>
        <label class="block text-xs font-semibold text-gray-600 mb-1">Search</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Run id..."
            class="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="applySearch"
          />
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 w-full"
            @click="applySearch"
          >
            Search
          </button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-600 mb-1">Manual Run Id</label>
        <div class="flex flex-col gap-2">
          <input
            v-model="manualRunId"
            type="text"
            placeholder="run-123"
            class="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="submitManualRunId"
          />
          <button
            class="px-3 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 w-full"
            @click="submitManualRunId"
          >
            Load
          </button>
        </div>
      </div>
    </div>

    <div class="px-4 pt-3" v-if="showManualSelection">
      <div class="flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
        <div class="text-xs text-blue-900">
          Manual selection:
          <span class="font-mono">{{ viewStore.selectedRunId }}</span>
        </div>
        <button
          class="text-xs font-semibold text-blue-700 hover:text-blue-900"
          @click="clearSelection"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-3">
      <div v-if="indexStore.loading && indexStore.entries.length === 0" class="py-8 text-center text-sm text-gray-500">
        Loading memory index...
      </div>

      <div v-else-if="indexStore.error" class="py-4">
        <div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ indexStore.error }}
        </div>
        <button
          class="mt-3 w-full px-3 py-2 text-sm font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200"
          @click="retry"
        >
          Retry
        </button>
      </div>

      <div v-else-if="indexStore.entries.length === 0" class="py-8 text-center text-sm text-gray-500">
        No memories found.
      </div>

      <ul v-else class="space-y-2">
        <li v-for="entry in indexStore.entries" :key="entry.runId">
          <button
            class="w-full text-left rounded-md border px-3 py-2 transition-colors"
            :class="entry.runId === viewStore.selectedRunId ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
            @click="selectRun(entry.runId)"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs text-gray-800">{{ entry.runId }}</span>
              <span class="text-[10px] text-gray-400">
                {{ formatTimestamp(entry.lastUpdatedAt ?? null) }}
              </span>
            </div>
            <div class="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
              <span v-if="entry.hasWorkingContext">Working</span>
              <span v-if="entry.hasEpisodic">Episodic</span>
              <span v-if="entry.hasSemantic">Semantic</span>
              <span v-if="entry.hasRawTraces">Traces</span>
              <span v-if="!entry.hasWorkingContext && !entry.hasEpisodic && !entry.hasSemantic && !entry.hasRawTraces">
                Empty
              </span>
            </div>
          </button>
        </li>
      </ul>
    </div>

    <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
      <button
        class="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        :disabled="indexStore.page <= 1"
        @click="indexStore.previousPage()"
      >
        Prev
      </button>
      <div>
        Page {{ indexStore.page }} / {{ indexStore.totalPages }}
      </div>
      <button
        class="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        :disabled="indexStore.page >= indexStore.totalPages"
        @click="indexStore.nextPage()"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAgentMemoryIndexStore } from '~/stores/agentMemoryIndexStore';
import { useAgentMemoryViewStore } from '~/stores/agentMemoryViewStore';

const indexStore = useAgentMemoryIndexStore();
const viewStore = useAgentMemoryViewStore();

const searchInput = ref(indexStore.search);
const manualRunId = ref('');

watch(
  () => indexStore.search,
  (value) => {
    if (value !== searchInput.value) {
      searchInput.value = value;
    }
  }
);

const showManualSelection = computed(() => {
  const selected = viewStore.selectedRunId;
  if (!selected) return false;
  return !indexStore.entries.some((entry) => entry.runId === selected);
});

const applySearch = async () => {
  await indexStore.setSearch(searchInput.value.trim());
};

const submitManualRunId = async () => {
  const value = manualRunId.value.trim();
  if (!value) return;
  await viewStore.setSelectedRunId(value);
};

const selectRun = async (runId: string) => {
  await viewStore.setSelectedRunId(runId);
};

const clearSelection = () => {
  viewStore.clearSelection();
};

const retry = async () => {
  await indexStore.fetchIndex();
};

const formatTimestamp = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};
</script>
