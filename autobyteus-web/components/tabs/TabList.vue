<template>
  <div
    ref="scrollContainer"
    v-bind="attrs"
    role="tablist"
    class="relative flex min-w-0 flex-nowrap items-end overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-gray-200 bg-white px-1 no-scrollbar"
    @scroll="updateOverflowState"
  >
    <div
      v-if="showLeftOverflow || showRightOverflow"
      data-test="tab-list-affordance-layer"
      class="tab-list-affordance-layer"
    >
      <span
        v-if="showLeftOverflow"
        data-test="tab-list-left-fade"
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent"
      />
      <span
        v-if="showRightOverflow"
        data-test="tab-list-right-fade"
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent"
      />
      <button
        v-if="showLeftOverflow"
        type="button"
        data-test="tab-list-scroll-left"
        class="pointer-events-auto absolute left-0 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:bg-white hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        :aria-label="previousLabel"
        :title="previousLabel"
        @click="scrollByPage(-1)"
      >
        <span aria-hidden="true" class="text-base leading-none">‹</span>
      </button>
      <button
        v-if="showRightOverflow"
        type="button"
        data-test="tab-list-scroll-right"
        class="pointer-events-auto absolute right-0 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:bg-white hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        :aria-label="nextLabel"
        :title="nextLabel"
        @click="scrollByPage(1)"
      >
        <span aria-hidden="true" class="text-base leading-none">›</span>
      </button>
    </div>

    <Tab
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :data-tab-name="tab.name"
      :selected="selectedTab === tab.name"
      :density="density"
      @focus="handleTabFocus(tab.name)"
      @select="selectTab"
    >
      {{ tab.label || tab.name }}
    </Tab>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import Tab from './Tab.vue';

defineOptions({ inheritAttrs: false });

interface TabInfo {
  name: string;
  label?: string;
}

const props = withDefaults(defineProps<{
  tabs: TabInfo[];
  selectedTab: string;
  density?: 'comfortable' | 'compact';
  showOverflowAffordances?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}>(), {
  density: 'comfortable',
  showOverflowAffordances: false,
  previousLabel: '',
  nextLabel: '',
});

const emit = defineEmits<{
  (event: 'select', tabName: string): void;
}>();

const attrs = useAttrs();
const scrollContainer = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const hasHorizontalOverflow = ref(false);
const prefersReducedMotion = ref(false);

const showLeftOverflow = computed(() =>
  props.showOverflowAffordances && hasHorizontalOverflow.value && canScrollLeft.value,
);
const showRightOverflow = computed(() =>
  props.showOverflowAffordances && hasHorizontalOverflow.value && canScrollRight.value,
);

let resizeObserver: ResizeObserver | null = null;
let reducedMotionMediaQuery: MediaQueryList | null = null;

const updateOverflowState = (): void => {
  const container = scrollContainer.value;
  if (!container) return;

  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const currentScrollLeft = Math.max(0, container.scrollLeft);
  const epsilon = 1;

  hasHorizontalOverflow.value = maxScrollLeft > epsilon;
  canScrollLeft.value = currentScrollLeft > epsilon;
  canScrollRight.value = currentScrollLeft < maxScrollLeft - epsilon;
};

const scrollTo = (left: number): void => {
  const container = scrollContainer.value;
  if (!container) return;

  const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const targetLeft = Math.min(Math.max(left, 0), maxScrollLeft);
  const behavior = prefersReducedMotion.value ? 'auto' : 'smooth';

  if (typeof container.scrollTo === 'function') {
    container.scrollTo({ left: targetLeft, behavior });
  } else {
    container.scrollLeft = targetLeft;
  }
};

const scrollByPage = (direction: -1 | 1): void => {
  const container = scrollContainer.value;
  if (!container) return;

  const pageSize = Math.max(container.clientWidth * 0.8, 1);
  scrollTo(container.scrollLeft + direction * pageSize);
};

const findTabElement = (tabName: string): HTMLElement | null => {
  const container = scrollContainer.value;
  if (!container) return null;

  return Array.from(container.querySelectorAll<HTMLElement>('[data-tab-name]'))
    .find((element) => element.dataset.tabName === tabName) ?? null;
};

const scrollTabIntoView = (tabName: string): void => {
  const container = scrollContainer.value;
  const tab = findTabElement(tabName);
  if (!container || !tab) return;

  const containerRect = container.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const leftInset = 4;
  const rightInset = Math.max(4, Math.min(28, container.clientWidth * 0.08));

  if (tabRect.left < containerRect.left + leftInset) {
    scrollTo(container.scrollLeft + tabRect.left - containerRect.left - leftInset);
  } else if (tabRect.right > containerRect.right - rightInset) {
    scrollTo(container.scrollLeft + tabRect.right - containerRect.right + rightInset);
  }
};

const handleTabFocus = (tabName: string): void => {
  nextTick(() => scrollTabIntoView(tabName));
};

const updateReducedMotionPreference = (): void => {
  prefersReducedMotion.value = reducedMotionMediaQuery?.matches ?? false;
};

const refreshAfterLayoutChange = (): void => {
  nextTick(() => {
    updateOverflowState();
    scrollTabIntoView(props.selectedTab);
  });
};

const selectTab = (tabName: string): void => {
  emit('select', tabName);
  nextTick(() => scrollTabIntoView(tabName));
};

watch(() => props.selectedTab, (tabName) => {
  nextTick(() => scrollTabIntoView(tabName));
});

watch(() => props.tabs, refreshAfterLayoutChange, { deep: true });

onMounted(() => {
  updateOverflowState();
  window.addEventListener('resize', refreshAfterLayoutChange);

  if (typeof ResizeObserver !== 'undefined' && scrollContainer.value) {
    resizeObserver = new ResizeObserver(refreshAfterLayoutChange);
    resizeObserver.observe(scrollContainer.value);
  }

  if (typeof window.matchMedia === 'function') {
    reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    updateReducedMotionPreference();
    reducedMotionMediaQuery.addEventListener?.('change', updateReducedMotionPreference);
  }

  refreshAfterLayoutChange();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', refreshAfterLayoutChange);
  reducedMotionMediaQuery?.removeEventListener?.('change', updateReducedMotionPreference);
  reducedMotionMediaQuery = null;
});
</script>

<style scoped>
/* Keep the affordance layer pinned to the scrollport while tabs move natively. */
.tab-list-affordance-layer {
  position: sticky;
  left: 0;
  z-index: 10;
  align-self: stretch;
  flex: 0 0 100%;
  width: 100%;
  margin-right: -100%;
  pointer-events: none;
}

/* Hide the native scrollbar without removing native horizontal scrolling. */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
