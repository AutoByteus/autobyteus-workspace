<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div v-if="rawTraceFiles?.length" class="flex items-center gap-2">
        <label class="text-xs font-semibold text-gray-600" for="raw-trace-file-selector">
          {{ $t('memory.components.memory.RawTracesTab.raw_trace_file') }}
        </label>
        <select
          id="raw-trace-file-selector"
          class="min-w-64 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          :value="selectedRawTraceFileName ?? ''"
          :disabled="loading"
          @change="onFileChange"
        >
          <option v-for="file in rawTraceFiles" :key="file.fileName" :value="file.fileName">
            {{ file.fileName }}{{ file.kind === 'active' ? ` (${$t('memory.components.memory.RawTracesTab.active_file')})` : '' }} — {{ formatCount(file.recordCount) }} {{ $t('memory.components.memory.RawTracesTab.records') }}
          </option>
        </select>
      </div>
      <div class="text-xs font-semibold text-gray-600">{{ $t('memory.components.memory.RawTracesTab.raw_trace_limit') }}</div>
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

    <div v-if="traces === null" class="text-sm text-gray-500">{{ $t('memory.components.memory.RawTracesTab.raw_traces_not_loaded') }}</div>
    <div v-else-if="traces.length === 0" class="text-sm text-gray-500">{{ $t('memory.components.memory.RawTracesTab.no_raw_traces_found') }}</div>
    <div v-else class="space-y-3">
      <div
        v-for="(trace, index) in traces"
        :key="index"
        class="rounded-md border border-gray-200 p-3"
      >
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span class="font-semibold">{{ trace.traceType }}</span>
          <span>{{ trace.scope === 'run' ? $t('memory.components.memory.RawTracesTab.run_scope') : `#${trace.seq}` }}</span>
        </div>
        <div class="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
          {{ trace.content || '(no content)' }}
        </div>
        <div v-if="trace.toolName" class="mt-2 text-xs text-gray-500">
          <span class="font-semibold">{{ $t('memory.components.memory.RawTracesTab.tool') }}</span> {{ trace.toolName }}
        </div>
        <div v-if="trace.toolArgs" class="mt-2">
          <div class="text-xs font-semibold text-gray-500">{{ $t('memory.components.memory.RawTracesTab.tool_args') }}</div>
          <pre class="mt-1 rounded-md bg-gray-50 p-2 text-xs text-gray-600 overflow-auto">{{ formatJson(trace.toolArgs) }}</pre>
        </div>
        <div v-if="trace.toolResult" class="mt-2">
          <div class="text-xs font-semibold text-gray-500">{{ $t('memory.components.memory.RawTracesTab.tool_result') }}</div>
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
import type { MemoryTraceEvent, RawTraceFileSummary } from '~/types/memory';

const props = withDefaults(defineProps<{
  traces: MemoryTraceEvent[] | null;
  rawTraceFiles?: RawTraceFileSummary[] | null;
  selectedRawTraceFileName?: string | null;
  limit: number;
  loading: boolean;
}>(), {
  rawTraceFiles: null,
  selectedRawTraceFileName: null,
});

const emit = defineEmits<{
  (e: 'updateLimit', value: number): void;
  (e: 'selectFile', value: string): void;
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

const onFileChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target?.value) {
    return;
  }
  emit('selectFile', target.value);
};

const formatCount = (value: number) => value.toLocaleString();

const formatJson = (payload: unknown) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};
</script>
