<template>
  <ToolCallIndicator
    :invocation-id="segment.invocationId"
    :tool-name="segment.toolName || 'edit_file'"
    :status="segment.status"
    :args="{ path: segment.path }"
    :error-message="segment.error ?? undefined"
  />
</template>

<script setup lang="ts">
import type { EditFileSegment } from '~/types/segments';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';

const props = defineProps<{
  segment: EditFileSegment;
  conversationId: string;
}>();
</script>

<style scoped>
/* No styles needed, wrapper only */
</style>
