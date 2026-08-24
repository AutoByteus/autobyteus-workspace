<template>
  <div
    class="system-task-notification mb-4 text-gray-900 dark:text-slate-100"
    data-testid="system-task-notification-segment"
    role="note"
    :aria-label="$t('workspace.components.conversation.segments.SystemTaskNotificationSegment.system_task_notification')"
  >
    <MarkdownRenderer
      :content="segment.content"
      :enable-event-monitor-file-actions="enableEventMonitorFileActions"
      @file-path-action="emit('file-path-action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { SystemTaskNotificationSegment } from '~/types/segments';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

withDefaults(defineProps<{
  segment: SystemTaskNotificationSegment;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();
</script>
