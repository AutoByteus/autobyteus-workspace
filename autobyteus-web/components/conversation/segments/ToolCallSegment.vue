<template>
  <ToolCallIndicator
    :invocation-id="segment.invocationId"
    :tool-name="segment.toolName || 'Parsing Tool...'"
    :status="segment.status"
    :args="segment.arguments"
    :error-message="segment.error ?? undefined"
  />
</template>

<script setup lang="ts">
import type { ToolCallSegment } from '~/types/segments';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';

const props = defineProps<{
  segment: ToolCallSegment;
  conversationId: string; // This is the agentId
}>();
</script>

<style scoped>
/* No style needed, wrapper only */
</style>
