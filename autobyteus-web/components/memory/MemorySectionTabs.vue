<template>
  <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" :aria-label="$t('memory.page.title')">
    <button
      v-for="item in sections"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="section === item.id"
      class="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="section === item.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
      :data-test="`memory-section-${item.id}`"
      @click="$emit('changeSection', item.id)"
    >
      {{ $t(item.label) }}
      <template v-if="item.id === 'index' && indexBadge">
        <MemorySpinner v-if="indexBadge.spinner" class="h-3.5 w-3.5" :class="section === 'index' ? 'text-white' : 'text-blue-600'" />
        <span v-else class="h-2 w-2 rounded-full" :class="indexBadge.dot" aria-hidden="true" />
        <span v-if="indexBadge.text" class="text-xs font-semibold" :class="section === 'index' ? 'text-blue-100' : 'text-blue-600'" data-test="memory-index-tab-badge">{{ indexBadge.text }}</span>
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MemorySection } from '~/stores/memorySearchStore';
import { useMemoryIndexView } from '~/composables/useMemoryIndexView';
import MemorySpinner from './MemorySpinner.vue';

/**
 * The Memory page's sections, Browse · Search · Index, with the Index badge (autobyteus-608 DC-001): shown on the
 * top-level pages only (Browse's tabs, Search, Index), never on an owner's or a run's page.
 */
defineProps<{ section: MemorySection }>();
defineEmits<{ changeSection: [section: MemorySection] }>();

const { badge: indexBadge } = useMemoryIndexView();
const sections: Array<{ id: MemorySection; label: string }> = [
  { id: 'browse', label: 'memory.tabs.browse' },
  { id: 'search', label: 'memory.tabs.search' },
  { id: 'index', label: 'memory.tabs.index' },
];
</script>
