<template>
  <div class="border border-gray-300 shadow-sm bg-white rounded-md">
    <AppContextFileArea
      :model-value="contextFiles"
      @update:model-value="emit('update:contextFiles', $event)"
      @open-file="emit('open-file', $event)"
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
import type { ContextFilePath } from '~/types/conversation';
import AppContextFileArea from './AppContextFileArea.vue';
import AppProblemInputTextArea from './AppProblemInputTextArea.vue';

defineProps<{
  problemText: string;
  contextFiles: ContextFilePath[];
}>();

const emit = defineEmits<{
  (e: 'update:problemText', value: string): void;
  (e: 'update:contextFiles', value: ContextFilePath[]): void;
  (e: 'open-file', file: ContextFilePath): void;
  (e: 'submit'): void;
}>();
</script>
