<template>
  <div class="border border-gray-300 shadow-sm bg-white rounded-md">
    <AppContextFileArea
      :model-value="contextFiles"
      :draft-owner="draftOwner"
      :context-files-target-key="contextFilesTargetKey"
      :update-context-files-for-target="updateContextFilesForTarget"
      @update:model-value="emit('update:contextFiles', $event)"
    />
    <div class="border-t border-gray-200">
      <AppProblemInputTextArea
        :model-value="problemText"
        @update:model-value="emit('update:problemText', $event)"
        @submit="emit('submit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContextAttachment } from '~/types/conversation';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';
import AppContextFileArea from './AppContextFileArea.vue';
import AppProblemInputTextArea from './AppProblemInputTextArea.vue';

defineProps<{
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
  (e: 'update:problemText', value: string): void;
  (e: 'update:contextFiles', value: ContextAttachment[]): void;
  (e: 'submit'): void;
}>();
</script>
