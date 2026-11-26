<template>
  <!-- autobyteus-608: one column that fills the page, so Global's reader takes the window's remaining height. -->
  <div class="mx-auto flex min-h-full max-w-7xl flex-col px-5 py-4 sm:px-7 sm:py-5">
    <template v-if="section === 'search'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <MemorySectionTabs :section="section" @change-section="(next) => $emit('changeSection', next)" />
      </div>
      <div class="space-y-4">
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
      </div>
    </template>

    <template v-else-if="section === 'index'">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <MemorySectionTabs :section="section" @change-section="(next) => $emit('changeSection', next)" />
      </div>
      <MemoryIndexPanel />
    </template>

    <!-- autobyteus-554: Browse is organised by owner (Global, Agents, Agent Teams, Agent Orgs) and their pages. Its tabs
         share one row with Browse · Search · Index; an owner's page is its own page, without them (autobyteus-608). -->
    <MemoryBrowse
      v-else
      class="min-h-0 flex-1"
      :node-key="nodeKey"
      :pane="pane"
      @change-source="(key) => $emit('changeSource', key)"
      @select-node="(key, nextPane) => $emit('selectNode', key, nextPane)"
      @open-episode="(episode, ownerName) => $emit('openEpisode', episode, ownerName)"
      @inspect-member="(runId, member, ownerName, runLabel) => $emit('inspectMember', runId, member, ownerName, runLabel)"
    >
      <template #sections>
        <MemorySectionTabs :section="section" @change-section="(next) => $emit('changeSection', next)" />
      </template>
    </MemoryBrowse>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MemorySection } from '~/stores/memorySearchStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { SearchMatch, SearchResult } from '~/types/memorySearch';
import type { AgentEpisode, CollaborationMemberMemoryTargetSummary } from '~/types/memory';
import MemoryBrowse from './MemoryBrowse.vue';
import MemorySectionTabs from './MemorySectionTabs.vue';
import MemorySearchPanel from './MemorySearchPanel.vue';
import MemorySearchResults from './MemorySearchResults.vue';
import MemoryIndexPanel from './MemoryIndexPanel.vue';

/** `nodeKey` and `pane`: the Browse address (utils/memoryBrowseNode.ts), from the page's route. */
defineProps<{ section: MemorySection; nodeKey: string; pane: string | null }>();
defineEmits<{
  changeSection: [section: MemorySection];
  search: [query: string];
  clearSearch: [];
  openResult: [result: SearchResult, match: SearchMatch];
  changeSource: [sourceKey: string];
  selectNode: [nodeKey: string, pane?: string];
  openEpisode: [episode: AgentEpisode, ownerName: string];
  /** `runLabel`: the team's or org's run summary, the run page's title (autobyteus-608 DEC-002). */
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, ownerName: string, runLabel: string | null];
}>();

const search = useMemorySearchStore();
/** The results already say how much is covered, so the Search tab does not repeat it. */
const resultsCarryCoverage = computed(() => search.status === 'ready' && !!search.coverage && (search.coverage.textPct < 100 || search.coverage.meaningPct < 100));
</script>
