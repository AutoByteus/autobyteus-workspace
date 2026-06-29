<template>
  <div
    class="system-task-notification mb-4 text-gray-900 dark:text-slate-100"
    data-testid="system-task-notification-segment"
    role="note"
    :aria-label="$t('workspace.components.conversation.segments.SystemTaskNotificationSegment.system_task_notification')"
  >
    <MarkdownRenderer :content="segment.content" />
  </div>
</template>

<script setup lang="ts">
import type { SystemTaskNotificationSegment } from '~/types/segments';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';

defineProps<{
  segment: SystemTaskNotificationSegment;
}>();
</script>
