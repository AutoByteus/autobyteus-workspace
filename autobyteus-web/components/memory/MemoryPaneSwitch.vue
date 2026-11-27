<template>
  <div class="flex w-full flex-shrink-0 rounded-lg bg-gray-200/75 p-0.5 sm:inline-flex sm:w-auto" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="selected === tab.id"
      class="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none sm:px-3.5"
      :class="selected === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
      :data-test="testIdPrefix ? `${testIdPrefix}${tab.id}` : undefined"
      @click="$emit('select', tab.id)"
    >
      <!-- Below 640 px a short label, when the tab has one, keeps the tabs on one line. -->
      <template v-if="tab.short"><span class="sm:hidden">{{ tab.short }}</span><span class="hidden sm:inline">{{ tab.label }}</span></template>
      <span v-else>{{ tab.label }}</span>
      <span
        v-if="tab.count !== undefined && tab.count !== null"
        class="rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none"
        :class="selected === tab.id ? 'bg-gray-100 text-gray-600' : 'text-gray-500'"
        data-test="memory-pane-count"
      >{{ tab.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
/**
 * A page's switch (autobyteus-608): Episodic / Semantic memory, Members / Runs, Work Journal / Raw Traces. Grey
 * segmented, the selected tab white; an optional count pill; full width on a phone.
 */
export interface MemoryPaneTab<Id extends string> { id: Id; label: string; short?: string; count?: number | null }
defineProps<{ tabs: Array<MemoryPaneTab<T>>; selected: T; testIdPrefix?: string }>();
defineEmits<{ select: [id: T] }>();
</script>
