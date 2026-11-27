<template>
  <div>
    <!-- One row (autobyteus-608 DC-009): the file, named as text when there is one, the picker for 2+ (TR-006); "Show [N]"
         at the right, applied on Enter or when the field is left, and only when changed (TR-007). The tab names the view,
         so the labels are for screen readers only. -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <MemoryPicker
        v-if="(rawTraceFiles?.length ?? 0) > 1"
        id="raw-trace-file-selector"
        class="min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-auto"
        :label="$t('memory.components.memory.RawTracesTab.raw_trace_file')"
        :value="selectedRawTraceFileName ?? ''"
        :disabled="loading"
        data-test="raw-trace-file-select"
        @change="onFileChange"
      >
        <option v-for="file in rawTraceFiles" :key="file.fileName" :value="file.fileName">{{ fileLabel(file) }}</option>
      </MemoryPicker>
      <p v-else-if="rawTraceFiles?.length" class="min-w-0 flex-1 break-words text-sm text-gray-700" data-test="raw-trace-file-name">{{ fileLabel(rawTraceFiles[0]!) }}</p>
      <div v-else class="flex-1" />

      <label class="ml-auto flex flex-shrink-0 items-center gap-1.5 text-sm text-gray-500">
        <span>{{ $t('memory.inspector.show') }}</span>
        <input
          v-model.number="limitInput"
          type="number"
          min="1"
          inputmode="numeric"
          :aria-label="$t('memory.components.memory.RawTracesTab.raw_trace_limit')"
          class="no-spinner w-16 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          data-test="raw-trace-limit"
          @keyup.enter="applyLimit"
          @change="applyLimit"
        />
      </label>
      <span v-if="loading" class="text-xs text-gray-400">{{ $t('memory.inspector.loading') }}</span>
    </div>

    <div v-if="traces === null" class="text-sm text-gray-500">{{ $t('memory.components.memory.RawTracesTab.raw_traces_not_loaded') }}</div>
    <div v-else-if="traces.length === 0" class="text-sm text-gray-500">{{ $t('memory.components.memory.RawTracesTab.no_raw_traces_found') }}</div>
    <div v-else class="space-y-3">
      <div
        v-for="(trace, index) in traces"
        :key="index"
        class="rounded-lg border border-gray-200 bg-white p-4"
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
import { useLocalization } from '~/composables/useLocalization';
import { ref, watch } from 'vue';
import type { MemoryTraceEvent, RawTraceFileSummary } from '~/types/memory';
import MemoryPicker from './MemoryPicker.vue';

const { t, resolvedLocale } = useLocalization();

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

/** An empty or < 1 value is ignored, and so is the shown limit again (TR-007). */
const applyLimit = () => {
  if (!limitInput.value || limitInput.value < 1 || limitInput.value === props.limit) {
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

const formatCount = (value: number) => value.toLocaleString(resolvedLocale.value);

/** "segment-0001.jsonl (active) · 1 record" (DC-009). */
const fileLabel = (file: RawTraceFileSummary) => {
  const active = file.kind === 'active' ? ` (${t('memory.components.memory.RawTracesTab.active_file')})` : '';
  const count = file.recordCount === 1 ? t('memory.inspector.one_record') : t('memory.inspector.records', { count: formatCount(file.recordCount) });
  return `${file.fileName}${active} · ${count}`;
};

const formatJson = (payload: unknown) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};
</script>
