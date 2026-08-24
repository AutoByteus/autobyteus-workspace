<template>
  <div
    ref="scrollContainer"
    v-bind="attrs"
    role="tablist"
    class="relative flex min-w-0 flex-nowrap items-end overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-gray-200 bg-white px-1 no-scrollbar"
  >
    <Tab
      v-for="tab in tabs"
      :key="tab.name"
      :name="tab.name"
      :data-tab-name="tab.name"
      :selected="selectedTab === tab.name"
      @focus="handleTabFocus(tab.name)"
      @select="selectTab"
    >
      {{ tab.label || tab.name }}
    </Tab>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import Tab from './Tab.vue';

defineOptions({ inheritAttrs: false });

interface TabInfo {
  name: string;
  label?: string;
}

const props = defineProps<{
  tabs: TabInfo[];
  selectedTab: string;
}>();

const emit = defineEmits<{
  (event: 'select', tabName: string): void;
}>();

const attrs = useAttrs();
const scrollContainer = ref<HTMLElement | null>(null);
const prefersReducedMotion = ref(false);

let resizeObserver: ResizeObserver | null = null;
let reducedMotionMediaQuery: MediaQueryList | null = null;

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
/* Hide the native scrollbar without removing native horizontal scrolling. */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
