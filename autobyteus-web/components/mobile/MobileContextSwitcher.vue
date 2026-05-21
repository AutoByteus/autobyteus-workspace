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
            v-for="segment in segmentTabs"
            :key="segment.id"
            type="button"
            class="rounded-xl px-2 py-2 text-xs font-semibold"
            :class="activeSegment === segment.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'"
            :data-testid="`mobile-context-segment-${segment.id}`"
            @click="activeSegment = segment.id"
          >
            <span>{{ segment.label }}</span>
            <span v-if="segmentStateFor(segment.id).status === 'loading'" aria-hidden="true"> …</span>
            <span v-else-if="segmentStateFor(segment.id).status === 'error'" aria-hidden="true"> !</span>
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
        <div
          v-else-if="currentSegmentState.status === 'loading' || currentSegmentState.status === 'idle'"
          class="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center text-sm text-blue-800"
          data-testid="mobile-context-loading"
        >
          Loading {{ activeSegmentLabel.toLowerCase() }}…
        </div>
        <div
          v-else-if="currentSegmentState.status === 'error'"
          class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900"
          data-testid="mobile-context-error"
        >
          <p class="font-semibold">{{ currentSegmentState.errorMessage || `Could not load ${activeSegmentLabel.toLowerCase()}.` }}</p>
          <button
            type="button"
            class="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white"
            data-testid="mobile-context-retry"
            @click="$emit('retrySegment', activeSegment)"
          >
            Retry {{ activeSegmentLabel.toLowerCase() }}
          </button>
        </div>
        <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500" data-testid="mobile-context-empty">
          No matching {{ activeSegmentLabel.toLowerCase() }}.
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MobileReadableWorkRow from '~/components/mobile/MobileReadableWorkRow.vue';
import type {
  MobileCatalogSegmentId,
  MobileCatalogSegmentState,
  MobileWorkContext,
  MobileWorkListItem,
} from '~/types/mobileWork';
import { mobileWorkContextKey } from '~/types/mobileWork';

const props = defineProps<{
  segments: Record<MobileCatalogSegmentId, MobileCatalogSegmentState<MobileWorkListItem>>;
  selectedContext: MobileWorkContext | null;
}>();

defineEmits<{
  close: [];
  selectContext: [context: MobileWorkContext];
  retrySegment: [segmentId: MobileCatalogSegmentId];
}>();

type SegmentTab = { id: MobileCatalogSegmentId; label: string };

const segmentTabs: SegmentTab[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'agents', label: 'Agents' },
  { id: 'teams', label: 'Teams' },
  { id: 'workspaces', label: 'Workspaces' },
];

const search = ref('');

const segmentStateFor = (segmentId: MobileCatalogSegmentId): MobileCatalogSegmentState<MobileWorkListItem> => props.segments[segmentId];

const pickPreferredSegment = (): MobileCatalogSegmentId => {
  if (props.segments.recent.items.length > 0) {
    return 'recent';
  }
  if (props.segments.agents.items.length > 0 || props.segments.agents.status !== 'error') {
    return 'agents';
  }
  if (props.segments.teams.items.length > 0 || props.segments.teams.status !== 'error') {
    return 'teams';
  }
  return 'workspaces';
};

const activeSegment = ref<MobileCatalogSegmentId>(pickPreferredSegment());

const selectedKey = computed(() => props.selectedContext ? mobileWorkContextKey(props.selectedContext) : '');
const activeSegmentLabel = computed(() => segmentTabs.find((segment) => segment.id === activeSegment.value)?.label || 'work');
const currentSegmentState = computed(() => props.segments[activeSegment.value]);
const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase();
  const items = currentSegmentState.value.items;
  if (!query) return items;
  return items.filter((item) => `${item.label} ${item.detail} ${item.meta}`.toLowerCase().includes(query));
});

watch(
  () => [props.segments.recent.status, props.segments.recent.items.length, props.segments.agents.items.length, props.segments.teams.items.length],
  () => {
    if (activeSegment.value === 'recent' && props.segments.recent.status === 'success' && props.segments.recent.items.length === 0) {
      activeSegment.value = pickPreferredSegment();
    }
  },
);
</script>
