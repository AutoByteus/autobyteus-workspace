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

    <!-- autobyteus-554: Browse is organised by owner (Global, Agents, Agent Teams, Agent Orgs) and their pages. -->
    <MemoryBrowse
      v-else
      :node-key="nodeKey"
      :pane="pane"
      @change-source="(key) => $emit('changeSource', key)"
      @select-node="(key, nextPane) => $emit('selectNode', key, nextPane)"
      @open-episode="(episode, ownerName) => $emit('openEpisode', episode, ownerName)"
      @inspect-member="(runId, member, ownerName) => $emit('inspectMember', runId, member, ownerName)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MemorySection } from '~/stores/memorySearchStore';
import { useMemorySearchStore } from '~/stores/memorySearchStore';
import type { SearchMatch, SearchResult } from '~/types/memorySearch';
import type { AgentEpisode, CollaborationMemberMemoryTargetSummary } from '~/types/memory';
import MemoryBrowse from './MemoryBrowse.vue';
import MemorySpinner from './MemorySpinner.vue';
import MemorySearchPanel from './MemorySearchPanel.vue';
import MemorySearchResults from './MemorySearchResults.vue';
import MemoryIndexPanel from './MemoryIndexPanel.vue';
import { useMemoryIndexView } from '~/composables/useMemoryIndexView';
import { useLocalization } from '~/composables/useLocalization';

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
  inspectMember: [runId: string, member: CollaborationMemberMemoryTargetSummary, ownerName: string];
}>();

const { t } = useLocalization();
const { badge: indexBadge } = useMemoryIndexView();
const sections: Array<{ id: MemorySection; label: string }> = [
  { id: 'browse', label: t('memory.tabs.browse') },
  { id: 'search', label: t('memory.tabs.search') },
  { id: 'index', label: t('memory.tabs.index') },
];
const search = useMemorySearchStore();
/** The results already say how much is covered, so the Search tab does not repeat it. */
const resultsCarryCoverage = computed(() => search.status === 'ready' && !!search.coverage && (search.coverage.textPct < 100 || search.coverage.meaningPct < 100));
</script>
