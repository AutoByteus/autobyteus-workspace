<template>
  <ToolCallIndicator
    :invocation-id="segment.invocationId"
    :tool-name="segment.toolName || 'run_bash'"
    :status="segment.status"
    :args="displayArgs"
    :error-message="segment.error ?? undefined"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TerminalCommandSegment } from '~/types/segments';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';

const props = defineProps<{
  segment: TerminalCommandSegment;
  conversationId: string;
}>();

const displayArgs = computed<Record<string, any>>(() => {
  const args = { ...(props.segment.arguments || {}) };
  if (!args.command) {
    args.command = props.segment.command || '';
  }
  return args;
});
</script>

<style scoped>
/* No style needed, wrapper only */
</style>
