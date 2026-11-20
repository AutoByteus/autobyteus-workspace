<template>
  <div class="space-y-5" data-test="agent-memory-page">
    <header>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="break-words text-xl font-semibold text-gray-900">{{ name }}</h1>
        <span v-if="imported" class="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      </div>
      <p v-if="subtitle" class="mt-1 text-sm text-gray-500" data-test="agent-memory-places">{{ subtitle }}</p>
      <p v-if="agentDefinitionId" class="mt-0.5 break-all font-mono text-xs text-gray-400">{{ agentDefinitionId }}</p>
    </header>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex w-full rounded-lg border border-gray-200 bg-white p-1 sm:inline-flex sm:w-auto" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="pane === tab.id"
          class="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none sm:flex-none sm:px-4 focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="pane === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          :data-test="`agent-memory-tab-${tab.id}`"
          @click="$emit('changePane', tab.id)"
        >
          <!-- Below 640 px the short label ("Episodic", "Semantic") keeps both tabs on one line. -->
          <span class="sm:hidden">{{ tab.short }}</span><span class="hidden sm:inline">{{ tab.label }}</span>
          <span v-if="tab.id === 'episodic' && episodesShown" class="text-xs font-semibold" :class="pane === tab.id ? 'text-blue-100' : 'text-gray-400'">{{ episodes.total }}</span>
        </button>
      </div>
      <div v-if="pane === 'episodic'" class="relative w-full sm:w-80">
        <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input v-model="filter" type="text" :placeholder="$t('memory.components.memory.AgentMemoryDetail.search_runs')" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" data-test="agent-episodes-filter" />
      </div>
    </div>

    <!-- Episodic memory: the agent's runs from every place it works, newest first; a run opens its Work Journal. -->
    <template v-if="pane === 'episodic'">
      <div v-if="!episodesShown || (episodes.loading && !episodes.entries.length)" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.loading_runs') }}</div>
      <div v-else-if="episodes.error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ episodes.error }}
        <button class="ml-2 font-semibold underline" @click="explorer.fetchEpisodes(selector)">{{ $t('memory.results.retry') }}</button>
      </div>
      <div v-else-if="!episodes.entries.length && !episodes.search" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.agent.no_runs', { name }) }}</div>
      <div v-else-if="!episodes.entries.length" class="py-16 text-center text-sm text-gray-500">{{ $t('memory.components.memory.AgentMemoryDetail.no_runs_match_this_filter') }}</div>
      <template v-else>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-test="agent-episodes">
          <button v-for="episode in episodes.entries" :key="episode.runId" :class="cardClass" data-test="agent-episode" @click="$emit('openEpisode', episode)">
            <h3 class="break-words text-base font-semibold text-gray-900">{{ episode.summary || episode.taskTitle || episode.runId }}</h3>
            <p class="mt-1 break-all font-mono text-xs text-gray-500">{{ episode.runId }}</p>
            <p v-if="episode.place && showPlaces" class="mt-1 flex items-center gap-1 text-xs text-gray-600" data-test="agent-episode-place">
              <Icon :icon="episode.place.kind === 'ORG' ? 'heroicons:building-office-2' : 'heroicons:user-group'" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <span class="truncate">{{ $t('memory.agent.in_place', { name: episode.place.name || '' }) }}</span>
            </p>
            <p v-if="episode.workspaceRootPath" class="mt-0.5 break-all text-xs text-gray-500">{{ episode.workspaceRootPath }}</p>
            <p v-if="episode.lastActivityAt" class="mt-3 text-xs text-gray-500">{{ formatTimestamp(episode.lastActivityAt) }}</p>
          </button>
        </div>
        <div v-if="episodes.totalPages > 1" class="flex items-center justify-center gap-4 text-xs text-gray-500">
          <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="episodes.page <= 1" @click="explorer.changeEpisodesPage(selector, episodes.page - 1)">Prev</button>
          <span>Page {{ episodes.page }} / {{ episodes.totalPages }}</span>
          <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="episodes.page >= episodes.totalPages" @click="explorer.changeEpisodesPage(selector, episodes.page + 1)">Next</button>
        </div>
      </template>
    </template>

    <!-- Semantic memory: the agent's folder, read only. -->
    <SemanticMemoryFolder v-else-if="agentDefinitionId" :agent-definition-id="agentDefinitionId" :agent-name="name" :imported="imported" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import SemanticMemoryFolder from './SemanticMemoryFolder.vue';
import { useLocalization } from '~/composables/useLocalization';
import { episodesOwnerKey, useMemoryExplorerStore } from '~/stores/memoryExplorerStore';
import type { AgentEpisode, AgentWithMemorySelector } from '~/types/memory';

/**
 * One agent's memory (autobyteus-554, UXJ-003), the same page wherever the agent is reached (Agents, a team or an org):
 * Episodic memory, its runs from every place it works; Semantic memory, its folder. "Unattributed runs" has Episodic
 * memory only. The page loads the episodes; the filter and the pages ask the node again.
 */
export type AgentPane = 'episodic' | 'semantic';
const props = defineProps<{ agentDefinitionId: string | null; name: string; pane: AgentPane; imported: boolean }>();
defineEmits<{ changePane: [pane: AgentPane]; openEpisode: [episode: AgentEpisode] }>();

const { t, resolvedLocale } = useLocalization();
const explorer = useMemoryExplorerStore();
const episodes = computed(() => explorer.episodes);

const selector = computed((): AgentWithMemorySelector => (props.agentDefinitionId
  ? { attribution: 'DEFINITION', agentDefinitionId: props.agentDefinitionId }
  : { attribution: 'UNATTRIBUTED' }));
/** The list in the store is this agent's (another agent's never shows). */
const episodesShown = computed(() => explorer.episodes.ownerKey === episodesOwnerKey(selector.value));

const tabs = computed(() => [
  { id: 'episodic' as const, label: t('memory.agent.episodic'), short: t('memory.agent.episodic_short') },
  ...(props.agentDefinitionId ? [{ id: 'semantic' as const, label: t('memory.agent.semantic'), short: t('memory.agent.semantic_short') }] : []),
]);

/** Team-local: "Belongs to <team>". Shared: "Also works in <teams · orgs>". Unattributed: what the group is. */
const subtitle = computed(() => {
  if (!props.agentDefinitionId) return t('memory.agent.unattributed_note');
  const places = explorer.placesOf(props.agentDefinitionId);
  const home = places.find((place) => place.local);
  if (home) return t('memory.agent.belongs_to', { name: home.name });
  const names = [...new Set(places.map((place) => place.name))];
  return names.length ? t('memory.agent.also_in', { names: names.join(' · ') }) : '';
});

/** The place line helps only when the agent works in more than one place (standalone and in teams, or several). */
const showPlaces = computed(() => new Set(explorer.episodes.entries.map((episode) => `${episode.place?.kind ?? ''}:${episode.place?.name ?? ''}`)).size > 1
  || (props.agentDefinitionId ? explorer.placesOf(props.agentDefinitionId).length > 1 : false));

/** The filter asks the node as you type (run ID, Task title, run summary). */
const filter = ref(explorer.episodes.search);
watch(() => props.agentDefinitionId, () => { filter.value = ''; });
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(filter, (value) => {
  if (value.trim() === explorer.episodes.search) return;
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { void explorer.setEpisodesSearch(selector.value, value.trim()); }, 300);
});

const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-5 text-left transition hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resolvedLocale.value);
};
</script>
