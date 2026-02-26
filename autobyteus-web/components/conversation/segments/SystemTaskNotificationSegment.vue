<template>
  <div class="system-task-notification my-4 p-4 border rounded-lg bg-purple-50 border-purple-200 dark:bg-gray-800 dark:border-purple-800">
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <span class="text-2xl">📥</span>
      </div>
      <div class="flex-1">
        <p class="font-semibold text-purple-800 dark:text-purple-300">System Task Notification</p>
        <pre class="mt-2 text-sm text-purple-700 dark:text-purple-200 whitespace-pre-wrap font-mono bg-purple-100 dark:bg-gray-700 p-3 rounded"><code>{{ segment.content }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SystemTaskNotificationSegment } from '~/types/segments';

defineProps<{
  segment: SystemTaskNotificationSegment;
}>();
</script>

<style scoped>
/* Scoped styles can go here if needed */
</style>
