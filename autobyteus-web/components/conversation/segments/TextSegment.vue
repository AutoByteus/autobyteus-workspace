<template>
  <div class="mb-4">
    <MarkdownRenderer
      v-if="presentationComplete"
      :content="content"
      :enable-event-monitor-file-actions="enableEventMonitorFileActions"
      @file-path-action="emit('file-path-action', $event)"
    />
    <LiveTextRenderer v-else :content="content" />
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import LiveTextRenderer from '~/components/conversation/segments/renderer/LiveTextRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

withDefaults(defineProps<{
  content: string;
  presentationComplete?: boolean;
  enableEventMonitorFileActions?: boolean;
}>(), { presentationComplete: true, enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();
</script>
