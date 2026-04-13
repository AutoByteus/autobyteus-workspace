<template>
  <div
    class="relative bg-gray-50 p-3"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onFileDrop"
    @paste="onPaste"
  >
    <input ref="fileInputRef" type="file" multiple class="hidden" @change="onFileSelect" />

    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <span class="font-medium text-sm text-gray-800">Context Files ({{ displayedItems.length }})</span>
        <span v-if="displayedItems.length === 0" class="text-xs text-gray-500 ml-2">
          (drag, drop, paste, or click to upload)
        </span>
      </div>
      <button
        class="text-blue-500 hover:text-white hover:bg-blue-500 transition-colors duration-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        title="Upload files"
        @click.stop="triggerFileInput"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <ul v-if="displayedItems.length > 0" class="mt-3 space-y-2 max-h-48 overflow-y-auto pr-2 border-t border-gray-200 pt-3">
      <li
        v-for="item in displayedItems"
        :key="item.key"
        class="bg-white p-2 rounded border border-gray-200 flex items-center justify-between group gap-3"
      >
        <div class="flex items-center gap-2 flex-grow min-w-0">
          <img v-if="item.previewUrl" :src="item.previewUrl" alt="Context file preview" class="h-8 w-8 rounded object-cover border border-gray-200" @error="markImagePreviewAsFailed(item.key)" />
          <i v-else :class="['fas', getContextAttachmentIcon(item.type), 'text-gray-500 w-4 text-center']"></i>
          <button
            type="button"
            class="text-sm text-left text-gray-700 truncate group-hover:underline cursor-pointer max-w-full"
            :title="item.label"
            :disabled="item.isUploading"
            @click="openItem(item)"
          >
            {{ item.label }}
          </button>
          <span v-if="item.isUploading" class="text-xs text-blue-500 ml-auto flex-shrink-0">
            <svg class="animate-spin h-3 w-3 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        </div>
        <button
          class="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full flex-shrink-0 disabled:opacity-50"
          :disabled="item.isUploading"
          title="Remove file"
          @click="handleRemoveItem(item)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </li>
    </ul>

    <div v-if="isDragOver" class="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-600 rounded-md flex items-center justify-center pointer-events-none">
      <span class="text-blue-800 font-semibold">Drop files or paths to add context</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useContextAttachmentComposer } from '~/composables/useContextAttachmentComposer';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { ContextAttachment } from '~/types/conversation';
import { getContextAttachmentIcon } from '~/utils/contextFiles/contextAttachmentIcons';
import type { DraftContextFileOwnerDescriptor } from '~/utils/contextFiles/contextFileOwner';

const props = defineProps<{
  modelValue: ContextAttachment[];
  draftOwner: DraftContextFileOwnerDescriptor | null;
  contextFilesTargetKey: string | null;
  updateContextFilesForTarget?: (
    targetBucketKey: string,
    updater: (current: ContextAttachment[]) => ContextAttachment[],
  ) => void;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ContextAttachment[]): void;
}>();

const fileExplorerStore = useFileExplorerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const workspaceStore = useWorkspaceStore();

const isDragOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const workspaceId = computed(() => workspaceStore.activeWorkspace?.workspaceId ?? null);
const isEmbeddedElectronRuntime = computed(
  () => windowNodeContextStore.isEmbeddedWindow && typeof window !== 'undefined' && Boolean(window.electronAPI),
);

const emitModelValue = (value: ContextAttachment[]): void => emit('update:modelValue', value);
const getCurrentTarget = () => {
  if (!props.contextFilesTargetKey) {
    return null;
  }

  return {
    key: props.contextFilesTargetKey,
    subject: props.contextFilesTargetKey,
    attachments: props.modelValue,
    draftOwner: props.draftOwner,
  };
};

const {
  displayedItems,
  uploadFiles,
  appendWorkspaceLocators,
  openAttachment,
  removeItem,
  markImagePreviewAsFailed,
} = useContextAttachmentComposer<string>({
  getCurrentTarget,
  commitAttachments: (target, updater) => {
    if (props.contextFilesTargetKey === target.key) {
      emitModelValue(updater(props.modelValue));
      return;
    }

    if (!props.updateContextFilesForTarget) {
      console.warn(`Cannot update context files for inactive target '${target.key}' without a parent updater.`);
      return;
    }

    props.updateContextFilesForTarget(target.key, updater);
  },
  openWorkspaceFile: (locator, resolvedWorkspaceId) => fileExplorerStore.openFile(locator, resolvedWorkspaceId),
  getWorkspaceId: () => workspaceId.value,
  getIsEmbeddedElectronRuntime: () => isEmbeddedElectronRuntime.value,
});

const openItem = (item: (typeof displayedItems.value)[number]): void => {
  if (item.isUploading || !item.attachment) {
    return;
  }

  openAttachment(item.attachment);
};

const handleRemoveItem = (item: (typeof displayedItems.value)[number]): void => {
  void removeItem(item);
};

const triggerFileInput = (): void => {
  fileInputRef.value?.click();
};

const onFileSelect = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (files.length > 0) {
    await uploadFiles(files);
  }
  input.value = '';
};

const onFileDrop = async (event: DragEvent): Promise<void> => {
  isDragOver.value = false;
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return;
  }

  if (isEmbeddedElectronRuntime.value && dataTransfer.files.length > 0 && window.electronAPI) {
    const target = getCurrentTarget();
    if (!target) {
      return;
    }

    const nativePaths = (
      await Promise.all(Array.from(dataTransfer.files).map((file) => window.electronAPI.getPathForFile(file)))
    ).filter((value): value is string => Boolean(value));
    appendWorkspaceLocators(nativePaths, target);
    return;
  }

  if (dataTransfer.files.length > 0) {
    await uploadFiles(Array.from(dataTransfer.files));
    return;
  }

  const droppedText = dataTransfer.getData('text/plain');
  if (droppedText.trim()) {
    appendWorkspaceLocators(droppedText.split(/\r?\n/));
  }
};

const onPaste = async (event: ClipboardEvent): Promise<void> => {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return;
  }

  const files = Array.from(clipboardData.files);
  if (files.length > 0) {
    event.preventDefault();
    await uploadFiles(files);
    return;
  }

  const pastedText = clipboardData.getData('text/plain');
  if (!pastedText.trim()) {
    return;
  }

  event.preventDefault();
  appendWorkspaceLocators(pastedText.split(/\r?\n/));
};
</script>
