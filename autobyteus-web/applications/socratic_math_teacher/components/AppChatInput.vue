<template>
  <div class="p-4 border-t border-gray-200 bg-gray-50">
    <AppInputForm
      :problemText="problemText"
      :contextFiles="contextFiles"
      @update:problemText="$emit('update:problemText', $event)"
      @update:contextFiles="$emit('update:contextFiles', $event)"
      @open-file="handleOpenFile"
      @submit="handleSubmit"
    />

    <!-- Submit Button -->
    <div class="mt-4">
      <button
        @click="handleSubmit"
        :disabled="isSubmitDisabled"
        class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        <svg v-if="isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ isLoading ? 'Processing...' : 'Send Message' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import type { ContextFilePath } from '~/types/conversation';
import AppInputForm from './AppInputForm.vue';

// --- PROPS & EMITS ---
const props = defineProps<{
  isLoading: boolean;
  problemText: string;
  contextFiles: ContextFilePath[];
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'update:problemText', value: string): void;
  (e: 'update:contextFiles', value: ContextFilePath[]): void;
}>();

// --- STORES ---
const fileExplorerStore = useFileExplorerStore();

// --- COMPUTED ---
const isSubmitDisabled = computed(() => {
  return props.isLoading || !props.problemText.trim();
});

// --- METHODS ---
function handleOpenFile(file: ContextFilePath) {
  fileExplorerStore.openFile(file.path);
}

function handleSubmit() {
  if (!isSubmitDisabled.value) {
    emit('submit');
  }
}
</script>
