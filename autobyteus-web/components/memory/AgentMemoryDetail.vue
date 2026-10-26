<template>
  <div class="mx-auto max-w-7xl space-y-5 p-8">
    <button class="text-sm font-medium text-blue-600 hover:underline" @click="$emit('back')">← {{ $t('memory.components.memory.AgentMemoryDetail.back_to_memory') }}</button>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold text-gray-900">{{ agentName }}</h1>
        <span v-if="store.selectedSource.readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      </div>
      <div class="relative w-full sm:w-80">
        <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input v-model="searchInput" type="text" :placeholder="$t('memory.components.memory.AgentMemoryDetail.search_runs')" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" @keyup.enter="applySearch" />
      </div>
    </div>

    <div v-if="store.agentRuns.loading && store.agentRuns.entries.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.loading_runs') }}</div>
    <div v-else-if="store.agentRuns.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ store.agentRuns.error }}
      <button class="ml-2 font-semibold underline" @click="retry">Retry</button>
    </div>
    <div v-else-if="store.agentRuns.entries.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.no_runs_match_this_filter') }}</div>
    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <button v-for="run in store.agentRuns.entries" :key="run.runId" class="flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="$emit('inspectRun', run)">
        <h3 class="break-words text-base font-semibold text-gray-900">{{ run.summary || run.runId }}</h3>
        <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ run.runId }}</p>
        <p v-if="run.workspaceRootPath" class="mt-0.5 break-all text-xs text-gray-500">{{ run.workspaceRootPath }}</p>
        <p v-if="run.lastUpdatedAt" class="mt-3 text-xs text-gray-500">{{ formatTimestamp(run.lastUpdatedAt) }}</p>
        <MemoryBadges class="mt-3" :memory="run.memory" />
      </button>
    </div>

    <div v-if="store.agentRuns.totalPages > 1" class="flex items-center justify-center gap-4 text-xs text-gray-500">
      <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="store.agentRuns.page <= 1" @click="changePage(store.agentRuns.page - 1)">Prev</button>
      <span>Page {{ store.agentRuns.page }} / {{ store.agentRuns.totalPages }}</span>
      <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="store.agentRuns.page >= store.agentRuns.totalPages" @click="changePage(store.agentRuns.page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
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
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (value) => {
  if (value.trim() === store.agentRuns.search) return;
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { void applySearch(); }, 300);
});
const retry = async () => store.fetchAgentRuns(props.selector);
const changePage = async (page: number) => store.changeAgentRunsPage(props.selector, page);

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
