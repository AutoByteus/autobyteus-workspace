<template>
  <header class="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-gray-200 pb-3" data-test="memory-page-header">
    <!-- Its basis is its own width (Back, the "/", the title and a run's title): one row when that fits beside the
         actions, else the actions wrap to a row of their own instead of squeezing the title away (spec Responsive: "one
         row when it fits, wraps otherwise"; CRR-002 CR-003). On its own row a title too long still truncates. -->
    <div class="flex min-w-0 flex-auto items-center gap-1.5">
      <button
        type="button"
        class="-ml-1.5 inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-gray-500 transition hover:bg-gray-200/60 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="backLabel"
        :title="backLabel"
        data-test="memory-page-back"
        @click="$emit('back')"
      >
        <Icon icon="heroicons:arrow-left-20-solid" class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <!-- On a row too narrow for Back, the title and a run's title, each gives way in proportion (CRR-002 CR-003). -->
        <span class="min-w-0 max-w-[16rem] truncate">{{ backText }}</span>
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
