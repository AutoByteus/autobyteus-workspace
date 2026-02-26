<template>
  <div class="error-segment my-4 p-4 border-l-4 rounded-r-lg bg-red-50 border-red-500 text-red-800 dark:bg-gray-800 dark:border-red-600 dark:text-red-300">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <svg class="h-6 w-6 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3 flex-1">
        <p class="font-bold text-red-900 dark:text-red-200">An Error Occurred</p>
        <p class="mt-1 text-sm">{{ segment.message }}</p>
        <details v-if="segment.details" class="mt-2 text-xs">
          <summary class="cursor-pointer font-medium text-red-700 dark:text-red-400">Show Details</summary>
          <pre class="mt-1 p-2 bg-red-100 dark:bg-gray-700 rounded overflow-auto whitespace-pre-wrap font-mono"><code>{{ segment.details }}</code></pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ErrorSegment } from '~/types/segments';

defineProps<{
  segment: ErrorSegment;
}>();
</script>
