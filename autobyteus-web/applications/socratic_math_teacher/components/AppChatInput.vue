<template>
  <div class="p-4 border-t border-gray-200 bg-gray-50">
    <AppInputForm
      :problem-text="problemText"
      :context-files="contextFiles"
      :draft-owner="draftOwner"
      :context-files-target-key="contextFilesTargetKey"
      :update-context-files-for-target="updateContextFilesForTarget"
      @update:problemText="$emit('update:problemText', $event)"
      @update:contextFiles="$emit('update:contextFiles', $event)"
      @submit="handleSubmit"
    />

    <div class="mt-4">
      <button
        class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        :disabled="isSubmitDisabled"
        @click="handleSubmit"
      >
        <svg v-if="isLoading || contextFileUploadStore.isUploading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ buttonLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import type { ContextAttachment } from '~/types/conversation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';
import AppInputForm from './AppInputForm.vue';

const props = defineProps<{
  isLoading: boolean;
  problemText: string;
  contextFiles: ContextAttachment[];
  draftOwner: DraftContextFileOwnerDescriptor | null;
  contextFilesTargetKey: string | null;
  updateContextFilesForTarget: (
    targetBucketKey: string,
    updater: (current: ContextAttachment[]) => ContextAttachment[],
  ) => void;
}>();

const emit = defineEmits<{
  (e: 'submit'): void;
  (e: 'update:problemText', value: string): void;
  (e: 'update:contextFiles', value: ContextAttachment[]): void;
}>();

const contextFileUploadStore = useContextFileUploadStore();

const isSubmitDisabled = computed(() =>
  props.isLoading || contextFileUploadStore.isUploading || !props.problemText.trim(),
);

const buttonLabel = computed(() => {
  if (contextFileUploadStore.isUploading) {
    return 'Uploading files...';
  }
  return props.isLoading ? 'Processing...' : 'Send Message';
});

const handleSubmit = (): void => {
  if (!isSubmitDisabled.value) {
    emit('submit');
  }
};
</script>
