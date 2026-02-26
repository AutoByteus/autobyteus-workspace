<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <div class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
        <p v-if="description" class="mt-1 text-sm text-slate-600">{{ description }}</p>
        <p class="mt-1 text-xs text-slate-500">Source node: {{ sourceNodeName || 'Current Node' }}</p>
      </div>

      <div v-if="targets.length === 0" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        No target nodes are available.
      </div>

      <div v-else>
        <div class="mb-2 flex justify-end">
          <button
            class="text-xs font-medium text-slate-600 hover:text-slate-900"
            data-testid="node-sync-picker-clear-all"
            type="button"
            @click="clearSelection"
          >
            Clear all
          </button>
        </div>
        <div class="space-y-2">
        <label
          v-for="target in targets"
          :key="target.id"
          class="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"
        >
          <input
            v-model="selectedTargetIds"
            :value="target.id"
            type="checkbox"
            class="mt-1 rounded border-slate-300"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800">{{ target.name }}</p>
            <p class="break-all font-mono text-xs text-slate-500">{{ target.baseUrl }}</p>
          </div>
        </label>
        </div>
      </div>

      <p v-if="validationError" class="mt-3 text-sm text-red-600">{{ validationError }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          :disabled="busy"
          data-testid="node-sync-picker-cancel"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          :disabled="busy || targets.length === 0"
          data-testid="node-sync-picker-confirm"
          @click="confirmSelection"
        >
          {{ busy ? 'Syncing...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface TargetNodeOption {
  id: string;
  name: string;
  baseUrl: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    description?: string | null;
    sourceNodeName?: string | null;
    targets: TargetNodeOption[];
    confirmLabel?: string;
    busy?: boolean;
  }>(),
  {
    description: null,
    sourceNodeName: null,
    confirmLabel: 'Sync',
    busy: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', targetNodeIds: string[]): void;
}>();

const selectedTargetIds = ref<string[]>([]);
const validationError = ref<string | null>(null);

function resetSelection(): void {
  selectedTargetIds.value = props.targets.map((target) => target.id);
  validationError.value = null;
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetSelection();
    }
  },
  { immediate: true },
);

watch(
  () => props.targets,
  () => {
    if (props.modelValue) {
      resetSelection();
    }
  },
  { deep: true },
);

function closeModal(): void {
  validationError.value = null;
  emit('update:modelValue', false);
}

function clearSelection(): void {
  selectedTargetIds.value = [];
  validationError.value = null;
}

function confirmSelection(): void {
  const uniqueTargets = [...new Set(selectedTargetIds.value)];
  if (uniqueTargets.length === 0) {
    validationError.value = 'Select at least one target node.';
    return;
  }

  validationError.value = null;
  emit('confirm', uniqueTargets);
  emit('update:modelValue', false);
}
</script>
