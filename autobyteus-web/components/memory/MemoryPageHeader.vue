<template>
  <header class="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-gray-200 pb-3" data-test="memory-page-header">
    <div class="flex min-w-0 flex-1 items-center gap-1.5">
      <button
        type="button"
        class="-ml-1.5 inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-gray-500 transition hover:bg-gray-200/60 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="backLabel"
        :title="backLabel"
        data-test="memory-page-back"
        @click="$emit('back')"
      >
        <Icon icon="heroicons:arrow-left-20-solid" class="h-4 w-4" aria-hidden="true" />
        <span class="max-w-[16rem] truncate">{{ backText }}</span>
      </button>
      <span class="flex-shrink-0 text-gray-300" aria-hidden="true">/</span>
      <slot />
    </div>
    <!-- Each action is its own item of the row: below 640 px each takes a full-width row of its own. -->
    <slot name="actions" />
  </header>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

/**
 * An owner's or a run's page header (autobyteus-608 DC-001, DC-002, DC-007): one row, Back (showing where it goes;
 * its accessible name and tooltip "Back to …") · `/` · the page's title (default slot), and at the right its actions
 * (a filter, the page's switch).
 */
defineProps<{ backText: string; backLabel: string }>();
defineEmits<{ back: [] }>();
</script>
