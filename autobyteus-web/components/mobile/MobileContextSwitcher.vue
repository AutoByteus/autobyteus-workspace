<template>
  <div class="fixed inset-0 z-50 flex items-end bg-slate-950/40" data-testid="mobile-context-switcher">
    <section class="max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl">
      <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Switch work</p>
          <h2 class="text-xl font-bold text-slate-950">Choose work</h2>
        </div>
        <button type="button" class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" @click="$emit('close')">
          Close
        </button>
      </header>

      <div class="border-b border-slate-100 px-5 py-3">
        <input
          v-model="search"
          class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="Search recent work, agents, teams, or workspaces"
          data-testid="mobile-context-search"
        />
        <div class="mt-3 grid grid-cols-4 gap-2" data-testid="mobile-context-segments">
          <button
            v-for="segment in segments"
            :key="segment.id"
            type="button"
            class="rounded-xl px-2 py-2 text-xs font-semibold"
            :class="activeSegment === segment.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
            @click="activeSegment = segment.id"
          >
            {{ segment.label }}
          </button>
        </div>
      </div>

      <div class="max-h-[58vh] overflow-y-auto px-5 py-4">
        <div v-if="filteredItems.length" class="space-y-2" data-testid="mobile-context-list">
          <MobileReadableWorkRow
            v-for="item in filteredItems"
            :key="item.key"
            :label="item.label"
            :detail="item.detail"
            :meta="item.meta"
            :selected="item.key === selectedKey"
            @select="$emit('selectContext', item.context)"
          />
        </div>
        <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500" data-testid="mobile-context-empty">
          No matching {{ activeSegmentLabel.toLowerCase() }}.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MobileReadableWorkRow from '~/components/mobile/MobileReadableWorkRow.vue';
import type { MobileWorkContext, MobileWorkListItem } from '~/types/mobileWork';
import { mobileWorkContextKey } from '~/types/mobileWork';

const props = defineProps<{
  recentItems: MobileWorkListItem[];
  agentItems: MobileWorkListItem[];
  teamItems: MobileWorkListItem[];
  workspaceItems: MobileWorkListItem[];
  selectedContext: MobileWorkContext | null;
}>();

defineEmits<{
  close: [];
  selectContext: [context: MobileWorkContext];
}>();

type SegmentId = 'recent' | 'agents' | 'teams' | 'workspaces';

const segments: Array<{ id: SegmentId; label: string }> = [
  { id: 'recent', label: 'Recent' },
  { id: 'agents', label: 'Agents' },
  { id: 'teams', label: 'Teams' },
  { id: 'workspaces', label: 'Workspaces' },
];

const activeSegment = ref<SegmentId>('recent');
const search = ref('');

const selectedKey = computed(() => props.selectedContext ? mobileWorkContextKey(props.selectedContext) : '');
const activeSegmentLabel = computed(() => segments.find((segment) => segment.id === activeSegment.value)?.label || 'work');
const segmentItems = computed(() => {
  switch (activeSegment.value) {
    case 'agents':
      return props.agentItems;
    case 'teams':
      return props.teamItems;
    case 'workspaces':
      return props.workspaceItems;
    case 'recent':
    default:
      return props.recentItems;
  }
});
const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return segmentItems.value;
  return segmentItems.value.filter((item) => `${item.label} ${item.detail} ${item.meta}`.toLowerCase().includes(query));
});
</script>
