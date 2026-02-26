<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="text-xs font-semibold text-gray-600">Raw Trace Limit</div>
      <input
        v-model.number="limitInput"
        type="number"
        min="1"
        class="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        class="px-2 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
        @click="applyLimit"
      >
        Apply
      </button>
      <span v-if="loading" class="text-xs text-gray-400">Loading...</span>
    </div>

    <div v-if="traces === null" class="text-sm text-gray-500">
      Raw traces not loaded.
    </div>
    <div v-else-if="traces.length === 0" class="text-sm text-gray-500">
      No raw traces found.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="(trace, index) in traces"
        :key="index"
        class="rounded-md border border-gray-200 p-3"
      >
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span class="font-semibold">{{ trace.traceType }}</span>
          <span>#{{ trace.seq }}</span>
        </div>
        <div class="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
          {{ trace.content || '(no content)' }}
        </div>
        <div v-if="trace.toolName" class="mt-2 text-xs text-gray-500">
          <span class="font-semibold">Tool:</span> {{ trace.toolName }}
        </div>
        <div v-if="trace.toolArgs" class="mt-2">
          <div class="text-xs font-semibold text-gray-500">Tool Args</div>
          <pre class="mt-1 rounded-md bg-gray-50 p-2 text-xs text-gray-600 overflow-auto">{{ formatJson(trace.toolArgs) }}</pre>
        </div>
        <div v-if="trace.toolResult" class="mt-2">
          <div class="text-xs font-semibold text-gray-500">Tool Result</div>
          <pre class="mt-1 rounded-md bg-gray-50 p-2 text-xs text-gray-600 overflow-auto">{{ formatJson(trace.toolResult) }}</pre>
        </div>
        <div v-if="trace.toolError" class="mt-2 text-xs text-red-600">
          Error: {{ trace.toolError }}
        </div>
        <div v-if="trace.media" class="mt-2 text-xs text-gray-500">
          <span v-if="trace.media.images?.length">Images: {{ trace.media.images.length }}</span>
          <span v-if="trace.media.audio?.length" class="ml-2">Audio: {{ trace.media.audio.length }}</span>
          <span v-if="trace.media.video?.length" class="ml-2">Video: {{ trace.media.video.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MemoryTraceEvent } from '~/types/memory';

const props = defineProps<{
  traces: MemoryTraceEvent[] | null;
  limit: number;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'updateLimit', value: number): void;
}>();

const limitInput = ref(props.limit);

watch(
  () => props.limit,
  (value) => {
    if (value !== limitInput.value) {
      limitInput.value = value;
    }
  }
);

const applyLimit = () => {
  if (!limitInput.value || limitInput.value < 1) {
    return;
  }
  emit('updateLimit', limitInput.value);
};

const formatJson = (payload: unknown) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};
</script>
