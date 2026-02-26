<template>
  <div>
    <div v-if="messages === null" class="text-sm text-gray-500">
      Working context not available.
    </div>
    <div v-else-if="messages.length === 0" class="text-sm text-gray-500">
      Working context is empty.
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="rounded-md border border-gray-200 px-4 py-3"
      >
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span class="font-semibold uppercase">{{ msg.role }}</span>
          <span v-if="msg.ts">{{ formatTimestamp(msg.ts) }}</span>
        </div>
        <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">
          {{ msg.content || '(no content)' }}
        </div>
        <div v-if="msg.reasoning" class="mt-2 text-xs text-gray-500">
          <span class="font-semibold">Reasoning:</span>
          <span class="ml-1">{{ msg.reasoning }}</span>
        </div>
        <div v-if="msg.toolPayload" class="mt-2">
          <div class="text-xs font-semibold text-gray-500">Tool Payload</div>
          <pre class="mt-1 rounded-md bg-gray-50 p-2 text-xs text-gray-600 overflow-auto">{{ formatJson(msg.toolPayload) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MemoryMessage } from '~/types/memory';

defineProps<{
  messages: MemoryMessage[] | null;
}>();

const formatJson = (payload: Record<string, unknown>) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

const formatTimestamp = (ts: number) => {
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) {
    return String(ts);
  }
  return date.toLocaleString();
};
</script>
