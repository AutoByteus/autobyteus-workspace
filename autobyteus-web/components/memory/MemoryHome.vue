<template>
  <div class="mx-auto max-w-7xl space-y-5 p-8">
    <div class="flex flex-wrap items-center gap-3">
      <div class="inline-flex rounded-lg border border-gray-200 bg-white p-1" role="tablist" :aria-label="$t('memory.page.title')">
        <button
          v-for="item in sections"
          :key="item.id"
          type="button"
          role="tab"
          :aria-selected="section === item.id"
          class="flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="section === item.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          :data-test="`memory-section-${item.id}`"
          @click="$emit('changeSection', item.id)"
        >
          {{ item.label }}
          <template v-if="item.id === 'index' && indexBadge">
            <MemorySpinner v-if="indexBadge.spinner" class="h-3.5 w-3.5" :class="section === 'index' ? 'text-white' : 'text-blue-600'" />
            <span v-else class="h-2 w-2 rounded-full" :class="indexBadge.dot" aria-hidden="true" />
            <span v-if="indexBadge.text" class="text-xs font-semibold" :class="section === 'index' ? 'text-blue-100' : 'text-blue-600'" data-test="memory-index-tab-badge">{{ indexBadge.text }}</span>
          </template>
        </button>
      </div>
    </div>

    <template v-if="section === 'search'">
      <MemorySearchPanel :show-notice="!resultsCarryCoverage" :centered="search.status === 'idle'" @search="(query) => $emit('search', query)" @open-index="$emit('changeSection', 'index')" />
      <MemorySearchResults
        v-if="search.status !== 'idle'"
        :query="search.query"
        :status="search.status"
        :outcome="search.outcome"
        :error="search.error"
        :coverage="search.coverage"
        @clear="$emit('clearSearch')"
        @retry="search.runSearch(search.query)"
        @open="(result, match) => $emit('openResult', result, match)"
      />
    </template>

    <MemoryIndexPanel v-else-if="section === 'index'" />

    <div v-else class="space-y-5" data-test="memory-browse">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-1">
          <button v-for="tab in browseTabs" :key="tab.id" type="button" class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition" :class="store.homeTab === tab.id ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'" @click="selectTab(tab.id)">{{ tab.label }}</button>
        </div>
        <div class="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div v-if="store.sources.length > 1" class="flex items-center gap-2">
            <label class="sr-only" for="memory-source-select">{{ $t('memory.components.memory.MemoryHome.memorySource') }}</label>
            <select id="memory-source-select" :value="store.selectedSource.key" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" @change="onSourceChange">
              <option v-for="source in store.sources" :key="source.key" :value="source.key">{{ source.label }}</option>
            </select>
            <span v-if="store.selectedSource.readOnly" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
          </div>
          <div class="relative w-full sm:w-80">
            <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input v-model="searchInput" type="text" :placeholder="$t(tabText[store.homeTab].search)" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" data-test="memory-browse-filter" @keyup.enter="applySearch" />
          </div>
        </div>
      </div>
      <p v-if="store.sourceError" class="text-xs text-red-600">{{ store.sourceError }}</p>

      <div v-if="activeState.loading && activeState.entries.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.MemoryHome.loading_memory_catalog') }}</div>
      <div v-else-if="activeState.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ activeState.error }}
        <button class="ml-2 font-semibold underline" @click="retry">Retry</button>
      </div>
      <div v-else-if="activeState.entries.length === 0" class="py-16 text-center text-sm text-gray-500">{{ $t(tabText[store.homeTab].empty) }}</div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <template v-if="store.homeTab === 'agents'">
          <button v-for="agent in store.agents.entries" :key="agent.stableId" :class="cardClass" @click="$emit('selectAgent', agent)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-gray-900">{{ agent.displayName }}</h2>
                <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ agent.stableId }}</p>
              </div>
              <span :class="countClass">{{ agent.runCount }} runs</span>
            </div>
            <p v-if="agent.latestMemoryAt" class="mt-3 text-xs text-gray-500">{{ formatTimestamp(agent.latestMemoryAt) }}</p>
            <MemoryBadges class="mt-3" :memory="agent.memory" />
          </button>
        </template>

        <template v-else-if="store.homeTab === 'teams'">
          <button v-for="team in store.teams.entries" :key="team.teamDefinitionId" :class="cardClass" @click="$emit('selectTeam', team)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-gray-900">{{ team.teamDefinitionName }}</h2>
                <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ team.teamDefinitionId }}</p>
                <p v-if="team.isTaskTeam" class="mt-2 inline-flex items-center gap-1 rounded-[0.2rem] border border-dashed border-indigo-300 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700" :title="team.startedByAgentName ? $t('memory.browse.task_team_started_by', { name: team.startedByAgentName }) : undefined" data-test="memory-task-team-tag">
                  <Icon icon="heroicons:user-group-20-solid" class="h-3 w-3" aria-hidden="true" />{{ $t('memory.browse.task_team') }}
                </p>
              </div>
              <span :class="countClass">{{ team.teamRunCount }} runs</span>
            </div>
            <p class="mt-3 text-xs text-gray-500">{{ team.memberMemoryCount }} {{ $t('memory.components.memory.MemoryHome.members') }}<span v-if="team.latestMemoryAt"> · {{ formatTimestamp(team.latestMemoryAt) }}</span></p>
            <MemoryBadges class="mt-3" :memory="team.memory" />
          </button>
        </template>

        <template v-else>
          <button v-for="org in store.orgs.entries" :key="org.orgDefinitionId" :class="cardClass" @click="$emit('selectOrg', org)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="break-words text-base font-semibold text-gray-900">{{ org.orgDefinitionName }}</h2>
                <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ org.orgDefinitionId }}</p>
              </div>
              <span :class="countClass">{{ org.orgRunCount }} runs</span>
            </div>
            <p class="mt-3 text-xs text-gray-500">{{ org.memberMemoryCount }} {{ $t('memory.components.memory.MemoryHome.members') }}<span v-if="org.latestMemoryAt"> · {{ formatTimestamp(org.latestMemoryAt) }}</span></p>
            <MemoryBadges class="mt-3" :memory="org.memory" />
          </button>
        </template>
      </div>

      <div v-if="activeState.totalPages > 1" class="flex items-center justify-center gap-4 text-xs text-gray-500">
        <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="activeState.page <= 1" @click="changePage(activeState.page - 1)">Prev</button>
        <span>Page {{ activeState.page }} / {{ activeState.totalPages }}</span>
        <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="activeState.page >= activeState.totalPages" @click="changePage(activeState.page + 1)">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useMemoryExplorerStore, type MemoryHomeTab } from '~/stores/memoryExplorerStore';
import type { MemorySection } from '~/stores/memorySearchStore';
import type { AgentOrgWithMemorySummary, AgentTeamWithMemorySummary, AgentWithMemorySummary } from '~/types/memory';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { SearchMatch, SearchResult } from '~/types/memorySearch';
import MemoryBadges from './MemoryBadges.vue';
import MemorySpinner from './MemorySpinner.vue';
import MemorySearchPanel from './MemorySearchPanel.vue';
import MemorySearchResults from './MemorySearchResults.vue';
import MemoryIndexPanel from './MemoryIndexPanel.vue';
import { useMemoryIndexView } from '~/composables/useMemoryIndexView';
import { useLocalization } from '~/composables/useLocalization';

defineProps<{ section: MemorySection }>();
const emit = defineEmits<{
  changeSection: [section: MemorySection];
  search: [query: string];
  clearSearch: [];
  openResult: [result: SearchResult, match: SearchMatch];
  changeTab: [tab: MemoryHomeTab];
  changeSource: [sourceKey: string];
  selectAgent: [agent: AgentWithMemorySummary];
  selectTeam: [team: AgentTeamWithMemorySummary];
  selectOrg: [org: AgentOrgWithMemorySummary];
}>();

const { t } = useLocalization();
const { badge: indexBadge } = useMemoryIndexView();
const sections: Array<{ id: MemorySection; label: string }> = [
  { id: 'browse', label: t('memory.tabs.browse') },
  { id: 'search', label: t('memory.tabs.search') },
  { id: 'index', label: t('memory.tabs.index') },
];
const store = useMemoryExplorerStore();
const search = useMemorySearchStore();
const searchInput = ref('');
/** The results already say how much is covered, so the Search tab does not repeat it. */
const resultsCarryCoverage = computed(() => search.status === 'ready' && !!search.coverage && (search.coverage.textPct < 100 || search.coverage.meaningPct < 100));

const tabText: Record<MemoryHomeTab, { search: string; empty: string }> = {
  agents: { search: 'memory.components.memory.MemoryHome.search_agents', empty: 'memory.components.memory.MemoryHome.no_agent_memories_yet' },
  teams: { search: 'memory.components.memory.MemoryHome.search_agent_teams', empty: 'memory.components.memory.MemoryHome.no_team_memories_yet' },
  orgs: { search: 'memory.components.memory.MemoryHome.search_agent_orgs', empty: 'memory.components.memory.MemoryHome.no_org_memories_yet' },
};

const activeState = computed(() => {
  if (store.homeTab === 'agents') return store.agents;
  return store.homeTab === 'teams' ? store.teams : store.orgs;
});

watch(() => [store.homeTab, store.agents.search, store.teams.search, store.orgs.search], () => {
  searchInput.value = activeState.value.search;
}, { immediate: true });

const browseTabs: Array<{ id: MemoryHomeTab; label: string }> = [
  { id: 'agents', label: t('memory.components.memory.MemoryHome.agents') },
  { id: 'teams', label: t('memory.components.memory.MemoryHome.agent_teams') },
  { id: 'orgs', label: t('memory.components.memory.MemoryHome.agent_orgs') },
];
const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const countClass = 'flex-shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600';

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
  const search = searchInput.value.trim();
  if (store.homeTab === 'agents') await store.setAgentsSearch(search);
  else if (store.homeTab === 'teams') await store.setTeamsSearch(search);
  else await store.setOrgsSearch(search);
};

/** The filter applies as you type, like the Skills page. */
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchInput, (value) => {
  if (value.trim() === activeState.value.search) return;
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { void applySearch(); }, 300);
});

const retry = async () => store.fetchHomeTab(store.homeTab);

const changePage = async (page: number) => store.changeHomePage(store.homeTab, page);

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};
</script>
