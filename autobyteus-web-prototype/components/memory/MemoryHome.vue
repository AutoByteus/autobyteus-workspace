<template>
  <div class="mx-auto max-w-6xl p-6">
    <section class="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-100 p-4">
        <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <label class="text-xs font-semibold uppercase tracking-wide text-slate-500" for="memory-source-select">{{ $t('memory.components.memory.MemoryHome.memorySource') }}</label>
              <select id="memory-source-select" :value="store.selectedSource.key" class="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" @change="onSourceChange">
                <option v-for="source in store.sources" :key="source.key" :value="source.key">{{ source.label }}</option>
              </select>
            </div>
            <div class="text-sm text-slate-600">
              <span v-if="store.selectedSource.readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
              <span v-else class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">{{ $t('memory.components.memory.MemoryHome.localRunnableMemory') }}</span>
              <p v-if="store.selectedSource.lastImportedAt" class="mt-1 text-xs text-slate-500">{{ $t('memory.components.memory.MemoryHome.lastImported', { timestamp: formatTimestamp(store.selectedSource.lastImportedAt) }) }}</p>
            </div>
          </div>
          <p v-if="store.sourceError" class="mt-2 text-xs text-red-600">{{ store.sourceError }}</p>
        </div>
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex gap-2">
            <button class="rounded-lg px-4 py-2 text-sm font-semibold" :class="tabClass('agents')" @click="selectTab('agents')">{{ $t('memory.components.memory.MemoryHome.agents') }}</button>
            <button class="rounded-lg px-4 py-2 text-sm font-semibold" :class="tabClass('teams')" @click="selectTab('teams')">{{ $t('memory.components.memory.MemoryHome.agent_teams') }}</button>
          </div>
          <div class="flex gap-2">
            <input v-model="searchInput" type="text" :placeholder="store.homeTab === 'agents' ? $t('memory.components.memory.MemoryHome.search_agents') : $t('memory.components.memory.MemoryHome.search_agent_teams')" class="w-full min-w-[260px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="applySearch" />
            <button class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800" @click="applySearch">Search</button>
          </div>
        </div>
      </div>

      <div class="p-4">
        <div v-if="activeState.loading && activeState.entries.length === 0" class="py-12 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
        <div v-else-if="activeState.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ activeState.error }}
          <button class="ml-2 font-semibold underline" @click="retry">Retry</button>
        </div>
        <div v-else-if="activeState.entries.length === 0" class="py-12 text-center text-sm text-gray-500">
          {{ store.homeTab === 'agents' ? $t('memory.components.memory.MemoryHome.no_agent_memories_yet') : $t('memory.components.memory.MemoryHome.no_team_memories_yet') }}
        </div>

        <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <template v-if="store.homeTab === 'agents'">
          <button v-for="agent in store.agents.entries" :key="agent.stableId" class="rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40" @click="$emit('selectAgent', agent)">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-semibold text-gray-900">{{ agent.displayName }}</h2>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ agent.stableId }}</p>
              </div>
              <span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{{ agent.runCount }} runs</span>
            </div>
            <p v-if="agent.latestMemoryAt" class="mt-3 text-xs text-gray-500">{{ $t('memory.components.memory.MemoryHome.updated') }} {{ formatTimestamp(agent.latestMemoryAt) }}</p>
            <MemoryBadges class="mt-3" :memory="agent.memory" />
          </button>
          </template>

          <template v-else>
          <button v-for="team in store.teams.entries" :key="team.teamDefinitionId" class="rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40" @click="$emit('selectTeam', team)">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-semibold text-gray-900">{{ team.teamDefinitionName }}</h2>
                <p class="mt-1 font-mono text-xs text-gray-500">{{ team.teamDefinitionId }}</p>
              </div>
              <span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{{ team.teamRunCount }} runs</span>
            </div>
            <p class="mt-3 text-xs text-gray-500">{{ team.memberMemoryCount }} {{ $t('memory.components.memory.MemoryHome.members') }}<span v-if="team.latestMemoryAt"> · {{ $t('memory.components.memory.MemoryHome.updated') }} {{ formatTimestamp(team.latestMemoryAt) }}</span></p>
            <MemoryBadges class="mt-3" :memory="team.memory" />
          </button>
          </template>
        </div>
      </div>

      <footer class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="activeState.page <= 1" @click="changePage(activeState.page - 1)">Prev</button>
        <span>Page {{ activeState.page }} / {{ activeState.totalPages }}</span>
        <button class="rounded-md border border-gray-200 px-3 py-1 disabled:opacity-50" :disabled="activeState.page >= activeState.totalPages" @click="changePage(activeState.page + 1)">Next</button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMemoryExplorerStore, type MemoryHomeTab } from '~/stores/memoryExplorerStore';
import type { AgentTeamWithMemorySummary, AgentWithMemorySummary } from '~/types/memory';
import MemoryBadges from './MemoryBadges.vue';

const emit = defineEmits<{
  changeTab: [tab: MemoryHomeTab];
  changeSource: [sourceKey: string];
  selectAgent: [agent: AgentWithMemorySummary];
  selectTeam: [team: AgentTeamWithMemorySummary];
}>();

const store = useMemoryExplorerStore();
const searchInput = ref('');

const activeState = computed(() => store.homeTab === 'agents' ? store.agents : store.teams);

watch(() => [store.homeTab, store.agents.search, store.teams.search], () => {
  searchInput.value = activeState.value.search;
}, { immediate: true });

const tabClass = (tab: MemoryHomeTab) => store.homeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';

const onSourceChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  emit('changeSource', value);
};

const selectTab = async (tab: MemoryHomeTab) => {
  if (store.homeTab === tab) return;
  store.setHomeTab(tab);
  emit('changeTab', tab);
};

const applySearch = async () => {
  if (store.homeTab === 'agents') await store.setAgentsSearch(searchInput.value.trim());
  else await store.setTeamsSearch(searchInput.value.trim());
};

const retry = async () => {
  if (store.homeTab === 'agents') await store.fetchAgents();
  else await store.fetchTeams();
};

const changePage = async (page: number) => store.changeHomePage(store.homeTab, page);

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
