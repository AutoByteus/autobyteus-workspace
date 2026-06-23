<template>
  <div class="mx-auto max-w-5xl p-6">
    <button class="mb-4 text-sm font-semibold text-blue-600 hover:underline" @click="$emit('back')">← {{ $t('memory.components.memory.AgentMemoryDetail.back_to_memory') }}</button>

    <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
        <h1 class="font-semibold text-gray-900">{{ agentName }}</h1>
        <span v-if="store.selectedSource.readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
        <div class="flex gap-2">
          <input v-model="searchInput" type="text" :placeholder="$t('memory.components.memory.AgentMemoryDetail.search_runs')" class="min-w-[260px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="applySearch" />
          <button class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800" @click="applySearch">Search</button>
        </div>
      </div>

      <div class="p-4">
        <div v-if="store.agentRuns.loading && store.agentRuns.entries.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.loading_runs') }}</div>
        <div v-else-if="store.agentRuns.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ store.agentRuns.error }}
          <button class="ml-2 font-semibold underline" @click="retry">Retry</button>
        </div>
        <div v-else-if="store.agentRuns.entries.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.no_runs_match_this_filter') }}</div>
        <div v-else class="space-y-3">
          <button v-for="run in store.agentRuns.entries" :key="run.runId" class="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40" @click="$emit('inspectRun', run)">
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{{ run.summary || run.runId }}</h3>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ run.runId }}</p>
                <p v-if="run.workspaceRootPath" class="mt-1 text-xs text-gray-500">{{ run.workspaceRootPath }}</p>
              </div>
              <span v-if="run.lastUpdatedAt" class="text-xs text-gray-500">{{ formatTimestamp(run.lastUpdatedAt) }}</span>
            </div>
            <MemoryBadges class="mt-3" :memory="run.memory" />
          </button>
        </div>
      </div>

      <footer class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="store.agentRuns.page <= 1" @click="changePage(store.agentRuns.page - 1)">Prev</button>
        <span>Page {{ store.agentRuns.page }} / {{ store.agentRuns.totalPages }}</span>
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="store.agentRuns.page >= store.agentRuns.totalPages" @click="changePage(store.agentRuns.page + 1)">Next</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { AgentRunMemorySummary, AgentWithMemorySelector } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';

const props = defineProps<{ selector: AgentWithMemorySelector }>();
defineEmits<{ back: []; inspectRun: [run: AgentRunMemorySummary] }>();

const store = useMemoryExplorerStore();
const searchInput = ref(store.agentRuns.search);

const agentName = computed(() => store.selectedAgent?.displayName || (props.selector.attribution === 'UNATTRIBUTED' ? 'Unattributed runs' : props.selector.agentDefinitionId || 'Agent'));

watch(() => store.agentRuns.search, (value) => { searchInput.value = value; });

const applySearch = async () => store.setAgentRunsSearch(props.selector, searchInput.value.trim());
const retry = async () => store.fetchAgentRuns(props.selector);
const changePage = async (page: number) => store.changeAgentRunsPage(props.selector, page);

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
