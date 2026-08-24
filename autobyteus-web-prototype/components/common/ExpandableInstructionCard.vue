<template>
  <section :class="surfaceClass" data-test="expandable-instruction-card">
    <h2 :class="titleClass">{{ title }}</h2>

    <div class="mt-2">
      <div class="relative">
        <div
          :id="contentId"
          ref="viewportRef"
          :class="[bodyClass, viewportClass]"
          data-test="instruction-viewport"
        >
          {{ content }}
        </div>

        <div
          v-if="showFade"
          :class="fadeClass"
          data-test="instruction-fade"
        ></div>

        <button
          v-if="isOverflowing && !isExpanded"
          type="button"
          :aria-controls="contentId"
          :aria-expanded="isExpanded ? 'true' : 'false'"
          :aria-label="toggleLabel"
          :title="toggleLabel"
          :class="collapsedButtonClass"
          data-test="instruction-toggle"
          @click="toggleExpanded"
        >
          <Icon
            icon="heroicons:chevron-down-20-solid"
            class="h-6 w-6"
            aria-hidden="true"
          />
          <span class="sr-only">{{ toggleLabel }}</span>
        </button>
      </div>

      <div v-if="isOverflowing && isExpanded" class="mt-2 flex justify-center">
        <button
          type="button"
          :aria-controls="contentId"
          :aria-expanded="isExpanded ? 'true' : 'false'"
          :aria-label="toggleLabel"
          :title="toggleLabel"
          :class="expandedButtonClass"
          data-test="instruction-toggle"
          @click="toggleExpanded"
        >
          <Icon
            icon="heroicons:chevron-down-20-solid"
            :class="['h-6 w-6 transition-transform duration-200', isExpanded ? 'rotate-180' : '']"
            aria-hidden="true"
          />
          <span class="sr-only">{{ toggleLabel }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  content: string;
  title?: string;
  variant?: 'gray' | 'slate';
  contentId?: string;
}>(), {
  title: 'Instructions',
  variant: 'slate',
  contentId: 'instructions-content',
});

const viewportRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const isOverflowing = ref(false);

let resizeObserver: ResizeObserver | null = null;

const contentId = computed(() => props.contentId);
const toggleLabel = computed(() => (isExpanded.value ? 'Collapse instructions' : 'Expand instructions'));
const showFade = computed(() => isOverflowing.value && !isExpanded.value);

const surfaceClass = computed(() =>
  props.variant === 'gray'
    ? 'rounded-xl border border-gray-200 bg-white p-5'
    : 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
);

const titleClass = computed(() =>
  props.variant === 'gray'
    ? 'text-lg font-semibold text-gray-800'
    : 'text-lg font-semibold text-slate-900',
);

const bodyClass = computed(() =>
  props.variant === 'gray'
    ? 'whitespace-pre-wrap font-mono text-sm text-gray-600'
    : 'whitespace-pre-wrap font-mono text-sm text-slate-700',
);

const collapsedButtonClass = computed(() =>
  props.variant === 'gray'
    ? 'absolute bottom-1.5 left-1/2 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-gray-300/80 bg-white/95 text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
    : 'absolute bottom-1.5 left-1/2 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-slate-300/80 bg-white/95 text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
);

const expandedButtonClass = computed(() =>
  props.variant === 'gray'
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:border-gray-400 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
);

const fadeClass = computed(() =>
  props.variant === 'gray'
    ? 'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/60 to-transparent'
    : 'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white via-white/60 to-transparent',
);

const viewportClass = computed(() =>
  showFade.value ? 'max-h-56 overflow-hidden sm:max-h-72' : '',
);

const collapsedHeightPx = (): number => {
  if (typeof window === 'undefined') {
    return 288;
  }
  return window.innerWidth >= 640 ? 288 : 224;
};

const measureOverflow = (): void => {
  const viewportEl = viewportRef.value;
  if (!viewportEl) {
    return;
  }

  const nextOverflowing = viewportEl.scrollHeight > collapsedHeightPx() + 1;
  isOverflowing.value = nextOverflowing;

  if (!nextOverflowing) {
    isExpanded.value = false;
  }
};

const scheduleMeasure = (): void => {
  void nextTick(() => {
    measureOverflow();
  });
};

const toggleExpanded = (): void => {
  if (!isOverflowing.value) {
    return;
  }
  isExpanded.value = !isExpanded.value;
};

onMounted(() => {
  scheduleMeasure();

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleMeasure);
  }

  if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
    resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });
    resizeObserver.observe(viewportRef.value);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleMeasure);
  }
  resizeObserver?.disconnect();
});

watch(() => props.content, () => {
  isExpanded.value = false;
  scheduleMeasure();
});
</script>
