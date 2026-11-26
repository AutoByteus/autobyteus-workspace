<template>
  <div class="flex min-h-0 flex-col space-y-4" data-test="agent-memory-page">
    <!-- One header row (autobyteus-608 DC-002): Back, the agent's name (its ID in the tooltip), its places inline on a
         wide screen; the run filter (Episodic) and the Episodic / Semantic switch at the right. -->
    <MemoryPageHeader :back-text="backText" :back-label="backLabel" @back="$emit('back')">
      <h1 class="min-w-0 truncate text-lg font-semibold tracking-tight text-gray-900" :title="agentDefinitionId ?? name">{{ name }}</h1>
      <!-- Only the space the name leaves: the name stays whole unless it alone overflows the row (CRR-001 CR-002). -->
      <span v-if="subtitle" class="hidden min-w-0 flex-1 basis-0 truncate text-xs text-gray-500 lg:block" data-test="agent-memory-places">{{ subtitle }}</span>
      <span v-if="imported" class="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{{ $t('memory.components.memory.common.importedReadOnly') }}</span>
      <template #actions>
        <div v-if="pane === 'episodic'" class="relative w-full sm:w-60">
          <Icon icon="heroicons:magnifying-glass-20-solid" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input v-model="filter" type="text" :placeholder="$t('memory.components.memory.AgentMemoryDetail.search_runs')" :aria-label="$t('memory.browse.filter_label')" class="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" data-test="agent-episodes-filter" />
        </div>
        <MemoryPaneSwitch :tabs="tabs" :selected="pane" test-id-prefix="agent-memory-tab-" @select="(next) => $emit('changePane', next)" />
      </template>
    </MemoryPageHeader>

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
        <div class="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3" data-test="agent-episodes">
          <!-- No run ID line (DC-006): it is in the title's tooltip, and the filter still matches it. -->
          <button v-for="episode in episodes.entries" :key="episode.runId" :class="cardClass" data-test="agent-episode" @click="$emit('openEpisode', episode)">
            <h3 class="break-words text-sm font-semibold text-gray-900" :title="episode.runId">{{ episode.summary || episode.taskTitle || episode.runId }}</h3>
            <p v-if="episode.place && showPlaces" class="mt-1.5 flex items-center gap-1 text-xs text-gray-600" data-test="agent-episode-place">
              <Icon :icon="episode.place.kind === 'ORG' ? 'heroicons:building-office-2' : 'heroicons:user-group'" class="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <span class="truncate">{{ $t('memory.agent.in_place', { name: episode.place.name || '' }) }}</span>
            </p>
            <!-- The workspace and the time share one line. -->
            <p v-if="episode.workspaceRootPath || episode.lastActivityAt" class="mt-1.5 flex min-w-0 items-baseline gap-2 text-xs text-gray-500" data-test="agent-episode-meta">
              <span v-if="episode.workspaceRootPath" class="min-w-0 truncate" :title="episode.workspaceRootPath">{{ episode.workspaceRootPath }}</span>
              <span v-if="episode.lastActivityAt" class="ml-auto flex-shrink-0 text-gray-400">{{ formatTimestamp(episode.lastActivityAt) }}</span>
            </p>
          </button>
        </div>
        <div v-if="episodes.totalPages > 1" class="flex items-center justify-center gap-4 text-xs text-gray-500">
          <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="episodes.page <= 1" @click="explorer.changeEpisodesPage(selector, episodes.page - 1)">Prev</button>
          <span>Page {{ episodes.page }} / {{ episodes.totalPages }}</span>
          <button class="rounded-md border border-gray-200 bg-white px-3 py-1 disabled:opacity-50" :disabled="episodes.page >= episodes.totalPages" @click="explorer.changeEpisodesPage(selector, episodes.page + 1)">Next</button>
        </div>
      </template>
    </template>

    <!-- Semantic memory: the agent's folder, read only, filling the page's remaining height. -->
    <SemanticMemoryFolder v-else-if="agentDefinitionId" class="min-h-0 flex-1" :agent-definition-id="agentDefinitionId" :agent-name="name" :imported="imported" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MemoryPageHeader from './MemoryPageHeader.vue';
import MemoryPaneSwitch, { type MemoryPaneTab } from './MemoryPaneSwitch.vue';
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
/** `backText`: where Back goes, shown ("Memory", or the team or org); `backLabel`: its accessible name ("Back to …"). */
const props = defineProps<{ agentDefinitionId: string | null; name: string; pane: AgentPane; imported: boolean; backText: string; backLabel: string }>();
defineEmits<{ back: []; changePane: [pane: AgentPane]; openEpisode: [episode: AgentEpisode] }>();

const { t, resolvedLocale } = useLocalization();
const explorer = useMemoryExplorerStore();
const episodes = computed(() => explorer.episodes);

const selector = computed((): AgentWithMemorySelector => (props.agentDefinitionId
  ? { attribution: 'DEFINITION', agentDefinitionId: props.agentDefinitionId }
  : { attribution: 'UNATTRIBUTED' }));
/** The list in the store is this agent's (another agent's never shows). */
const episodesShown = computed(() => explorer.episodes.ownerKey === episodesOwnerKey(selector.value));

const tabs = computed((): Array<MemoryPaneTab<AgentPane>> => [
  { id: 'episodic', label: t('memory.agent.episodic'), short: t('memory.agent.episodic_short'), count: episodesShown.value ? episodes.value.total : null },
  ...(props.agentDefinitionId ? [{ id: 'semantic' as const, label: t('memory.agent.semantic'), short: t('memory.agent.semantic_short') }] : []),
]);

/** Team-local: "Belongs to <team>". Shared: "Also works in <teams · orgs>". Unattributed: what the group is. */
const subtitle = computed(() => {
  if (!props.agentDefinitionId) return t('memory.agent.unattributed_note');
  const places = explorer.placesOf(props.agentDefinitionId);
  const home = places.find((place) => place.local);
  // Reached through its own team, Back already names the team: "Belongs to" would repeat it (DC-002).
  if (home) return home.name === props.backText ? '' : t('memory.agent.belongs_to', { name: home.name });
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

const cardClass = 'flex flex-col justify-start rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const formatTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(resolvedLocale.value);
};
</script>
