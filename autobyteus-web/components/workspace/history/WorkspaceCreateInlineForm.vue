<template>
  <form
    class="border-t border-gray-100 px-3 py-2"
    data-test="create-workspace-form"
    @submit.prevent="$emit('confirm')"
  >
    <div class="space-y-2">
      <input
        id="workspace-path-input"
        :value="modelValue"
        data-test="workspace-path-input"
        type="text"
        class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
        :class="errorMessage ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : ''"
        placeholder="/Users/you/project"
        :disabled="creatingWorkspace"
        @input="onInput"
        @keydown.enter.prevent="$emit('confirm')"
        @keydown.esc.prevent="$emit('cancel')"
      >
      <p v-if="errorMessage" class="text-xs text-red-600">
        {{ errorMessage }}
      </p>
      <div class="flex items-center justify-end gap-2">
        <button
          data-test="cancel-create-workspace"
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="creatingWorkspace"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          data-test="confirm-create-workspace"
          type="submit"
          class="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="creatingWorkspace"
        >
          {{ creatingWorkspace ? 'Adding...' : 'Add' }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  errorMessage: string;
  creatingWorkspace: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const onInput = (event: Event): void => {
  const target = event.target as HTMLInputElement | null;
  emit('update:modelValue', target?.value ?? '');
};
</script>
