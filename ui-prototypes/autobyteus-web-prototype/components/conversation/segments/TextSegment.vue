<template>
  <div class="mb-4">
    <MarkdownRenderer
      :content="content"
      :enable-event-monitor-file-actions="enableEventMonitorFileActions"
      @file-path-action="emit('file-path-action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

withDefaults(defineProps<{
  content: string;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();
</script>
