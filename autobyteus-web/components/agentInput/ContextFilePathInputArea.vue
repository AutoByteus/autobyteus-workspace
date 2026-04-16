<template>
  <div
    class="bg-white px-3 py-2"
    data-file-drop-target="true"
    @dragover.prevent
    @drop.prevent="onFileDrop"
    @paste="onPaste"
  >
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      :disabled="!activeContextStore.activeAgentContext"
      @change="onFileSelect"
    />

    <div class="flex items-center justify-between" :class="{ 'mb-2': isContextListExpanded && displayedItems.length > 0 }">
      <div
        class="flex items-center flex-grow cursor-pointer px-1 py-1 rounded hover:bg-gray-50 transition-colors"
        role="button"
        aria-controls="context-file-list"
        :aria-expanded="isContextListExpanded"
        @click="toggleContextList"
      >
        <div class="flex items-center">
          <svg
            v-if="displayedItems.length > 0"
            class="w-5 h-5 transform transition-transform text-gray-600 mr-2 flex-shrink-0"
            :class="{ 'rotate-90': isContextListExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="font-medium text-xs text-gray-700">Context Files ({{ displayedItems.length }})</span>
          <span v-if="displayedItems.length === 0" class="text-xs text-gray-400 ml-1.5">
            {{ $t('agentInput.components.agentInput.ContextFilePathInputArea.drag_paste_or_upload') }}
          </span>
        </div>
      </div>

      <button
        class="text-blue-500 hover:text-white hover:bg-blue-500 transition-colors duration-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        :title="$t('agentInput.components.agentInput.ContextFilePathInputArea.upload_files')"
        :aria-label="$t('agentInput.components.agentInput.ContextFilePathInputArea.upload_files')"
        :disabled="!activeContextStore.activeAgentContext"
        @click.stop="triggerFileInput"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div v-if="isContextListExpanded && displayedItems.length > 0" id="context-file-list" class="space-y-2">
      <div v-if="thumbnailItems.length > 0" class="thumbnail-row-container">
        <div class="thumbnail-row">
          <div v-for="item in thumbnailItems" :key="item.key" class="thumbnail-card group">
            <button
              type="button"
              class="thumbnail-button"
              :title="item.label"
              :aria-label="$t('agentInput.components.agentInput.ContextFilePathInputArea.open_image_preview')"
              :disabled="item.isUploading"
              @click="openItem(item)"
            >
              <img
                v-if="item.previewUrl"
                :src="item.previewUrl"
                :alt="$t('agentInput.components.agentInput.ContextFilePathInputArea.context_image_thumbnail')"
                class="context-image-thumbnail"
                @error="markImagePreviewAsFailed(item.key)"
              />
              <div v-else class="thumbnail-fallback">
                <i :class="['fas', getContextAttachmentIcon(item.type)]"></i>
              </div>
            </button>
            <button
              class="thumbnail-remove-button"
              :title="$t('agentInput.components.agentInput.ContextFilePathInputArea.remove_this_file')"
              :aria-label="$t('agentInput.components.agentInput.ContextFilePathInputArea.remove_file')"
              :disabled="item.isUploading"
              @click.stop="handleRemoveItem(item)"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <div v-if="item.isUploading" class="thumbnail-uploading">
              <i class="fas fa-spinner fa-spin mr-1"></i>Uploading
            </div>
          </div>
        </div>
      </div>

      <ul v-if="regularItems.length > 0" class="space-y-2">
        <li
          v-for="item in regularItems"
          :key="item.key"
          class="bg-gray-100 p-2 rounded transition-colors duration-300 flex items-start justify-between hover:bg-gray-200 group"
        >
          <div class="flex items-start space-x-2 flex-grow min-w-0">
            <i :class="['fas', getContextAttachmentIcon(item.type), 'text-gray-500 w-4 flex-shrink-0']"></i>
            <div class="min-w-0 flex-grow">
              <button
                type="button"
                class="text-sm text-left text-gray-600 truncate group-hover:underline cursor-pointer block w-full"
                :title="item.label"
                :disabled="item.isUploading"
                @click="openItem(item)"
              >
                {{ item.label }}
              </button>
            </div>
            <span v-if="item.isUploading" class="text-xs text-blue-500 ml-auto flex-shrink-0">
              <i class="fas fa-spinner fa-spin mr-1"></i>Uploading...
            </span>
          </div>
          <button
            class="text-red-500 hover:text-white hover:bg-red-500 transition-colors duration-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 ml-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="$t('agentInput.components.agentInput.ContextFilePathInputArea.remove_this_file')"
            :aria-label="$t('agentInput.components.agentInput.ContextFilePathInputArea.remove_file')"
            :disabled="item.isUploading"
            @click.stop="handleRemoveItem(item)"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </li>
      </ul>
    </div>

    <div v-if="displayedItems.length > 0" class="flex justify-end pt-2 mt-2">
      <button
        class="px-2.5 py-1 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors duration-200 flex items-center text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="contextFileUploadStore.isUploading"
        @click.stop="clearAllContextFilePaths"
      >
        <i class="fas fa-trash-alt mr-2"></i>{{ $t('agentInput.components.agentInput.ContextFilePathInputArea.clear_all') }}
      </button>
    </div>
  </div>

  <FullScreenImageModal
    v-if="selectedImageUrl"
    :visible="isImageModalVisible"
    :image-url="selectedImageUrl"
    alt-text="Context image preview"
    @close="closeImagePreview"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useContextAttachmentComposer } from '~/composables/useContextAttachmentComposer';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { TreeNode } from '~/utils/fileExplorer/TreeNode';
import { getFilePathsFromFolder } from '~/utils/fileExplorer/fileUtils';
import { getContextAttachmentIcon } from '~/utils/contextFiles/contextAttachmentIcons';
import {
  buildAgentDraftContextFileOwner,
  buildTeamMemberDraftContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner';
import FullScreenImageModal from '~/components/common/FullScreenImageModal.vue';

const activeContextStore = useActiveContextStore();
const agentContextsStore = useAgentContextsStore();
const agentSelectionStore = useAgentSelectionStore();
const agentTeamContextsStore = useAgentTeamContextsStore();
const contextFileUploadStore = useContextFileUploadStore();
const fileExplorerStore = useFileExplorerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const workspaceStore = useWorkspaceStore();

const activeContext = computed(() => activeContextStore.activeAgentContext);
const workspaceId = computed(
  () => activeContext.value?.config.workspaceId ?? workspaceStore.activeWorkspace?.workspaceId ?? null,
);
const isEmbeddedElectronRuntime = computed(
  () => windowNodeContextStore.isEmbeddedWindow && typeof window !== 'undefined' && Boolean(window.electronAPI),
);

const fileInputRef = ref<HTMLInputElement | null>(null);
const isContextListExpanded = ref(true);
const isImageModalVisible = ref(false);
const selectedImageUrl = ref<string | null>(null);

const resolveDraftOwnerForContext = (targetContext: AgentContext | null) => {
  if (!targetContext) {
    return null;
  }

  if (agentSelectionStore.selectedType === 'agent' && agentContextsStore.activeRun === targetContext) {
    return buildAgentDraftContextFileOwner(targetContext.state.runId);
  }

  const activeTeam = agentSelectionStore.selectedType === 'team' ? agentTeamContextsStore.activeTeamContext : null;
  if (!activeTeam) {
    return null;
  }

  const activeMember = activeTeam.members.get(activeTeam.focusedMemberName) ?? null;
  if (activeMember !== targetContext) {
    return null;
  }

  return buildTeamMemberDraftContextFileOwner(activeTeam.teamRunId, activeTeam.focusedMemberName);
};

const getTargetForContext = (targetContext: AgentContext | null) => {
  if (!targetContext) {
    return null;
  }

  return {
    key: targetContext.state.runId,
    subject: targetContext,
    attachments: targetContext.contextFilePaths,
    draftOwner: resolveDraftOwnerForContext(targetContext),
  };
};

const {
  displayedItems,
  thumbnailItems,
  regularItems,
  appendLocatorAttachments,
  appendWorkspaceLocators,
  uploadFiles,
  openAttachment,
  removeItem,
  clearCurrentTargetAttachments,
  markImagePreviewAsFailed,
} = useContextAttachmentComposer<AgentContext>({
  getCurrentTarget: () => getTargetForContext(activeContext.value),
  commitAttachments: (target, updater) => {
    target.subject.contextFilePaths = updater(target.subject.contextFilePaths);
  },
  openWorkspaceFile: (locator, resolvedWorkspaceId) => fileExplorerStore.openFile(locator, resolvedWorkspaceId),
  getWorkspaceId: () => workspaceId.value,
  getIsEmbeddedElectronRuntime: () => isEmbeddedElectronRuntime.value,
});

const toggleContextList = (): void => {
  if (displayedItems.value.length > 0) {
    isContextListExpanded.value = !isContextListExpanded.value;
    return;
  }
  isContextListExpanded.value = true;
};

const closeImagePreview = (): void => {
  isImageModalVisible.value = false;
  selectedImageUrl.value = null;
};

const openItem = (item: (typeof displayedItems.value)[number]): void => {
  if (item.isUploading || !item.attachment) {
    return;
  }

  if (item.type === 'Image' && item.previewUrl) {
    selectedImageUrl.value = item.previewUrl;
    isImageModalVisible.value = true;
    return;
  }

  openAttachment(item.attachment);
};

const handleRemoveItem = (item: (typeof displayedItems.value)[number]): void => {
  void removeItem(item);
};

const clearAllContextFilePaths = async (): Promise<void> => {
  await clearCurrentTargetAttachments();
  isContextListExpanded.value = true;
};

const triggerFileInput = (): void => {
  if (activeContext.value) {
    fileInputRef.value?.click();
  }
};

const onFileSelect = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (files.length > 0) {
    isContextListExpanded.value = true;
    await uploadFiles(files);
  }
  input.value = '';
};

const onFileDrop = async (event: DragEvent): Promise<void> => {
  const targetContext = activeContext.value;
  if (!targetContext) {
    return;
  }

  const target = getTargetForContext(targetContext);
  if (!target) {
    return;
  }

  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    return;
  }

  const dragData = dataTransfer.getData('application/json');
  if (dragData) {
    try {
      const droppedNode = JSON.parse(dragData) as TreeNode;
      appendWorkspaceLocators(getFilePathsFromFolder(droppedNode), target);
      isContextListExpanded.value = true;
    } catch (error) {
      console.error('Failed to parse dropped file explorer payload:', error);
    }
    return;
  }

  if (windowNodeContextStore.isEmbeddedWindow && dataTransfer.files.length > 0 && window.electronAPI) {
    const nativePaths = (
      await Promise.all(Array.from(dataTransfer.files).map((file) => window.electronAPI.getPathForFile(file)))
    ).filter((value): value is string => Boolean(value));
    appendWorkspaceLocators(nativePaths, target);
    isContextListExpanded.value = true;
    return;
  }

  if (dataTransfer.files.length > 0) {
    isContextListExpanded.value = true;
    await uploadFiles(Array.from(dataTransfer.files), target);
  }
};

const onPaste = async (event: ClipboardEvent): Promise<void> => {
  const targetContext = activeContext.value;
  const clipboardData = event.clipboardData;
  if (!targetContext || !clipboardData) {
    return;
  }

  const target = getTargetForContext(targetContext);
  if (!target) {
    return;
  }

  const fileLikes = Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (fileLikes.length > 0) {
    event.preventDefault();
    isContextListExpanded.value = true;
    await uploadFiles(fileLikes, target);
    return;
  }

  const pastedText = clipboardData.getData('text/plain');
  if (!pastedText.trim()) {
    return;
  }

  event.preventDefault();
  await appendLocatorAttachments(pastedText.split(/\r?\n/), target);
  isContextListExpanded.value = true;
};

watch(
  () => displayedItems.value.length,
  (itemCount) => {
    if (itemCount === 0 && !isContextListExpanded.value) {
      isContextListExpanded.value = true;
    }
  },
);
</script>

<style scoped>
.thumbnail-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 1px solid #d1d5db;
  transition: box-shadow 0.2s ease;
}

.thumbnail-button:hover {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
}

.thumbnail-row-container {
  overflow-x: auto;
  padding: 0.125rem 0.125rem 0.375rem 0.125rem;
}

.thumbnail-row {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  min-width: max-content;
}

.thumbnail-card {
  position: relative;
  flex: 0 0 auto;
}

.thumbnail-remove-button {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background-color: #ef4444;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-card:hover .thumbnail-remove-button {
  opacity: 1;
}

.thumbnail-remove-button:disabled {
  opacity: 0.55;
}

.thumbnail-uploading {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  font-size: 0.625rem;
  line-height: 1;
  color: #1d4ed8;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
}

.context-image-thumbnail,
.thumbnail-fallback {
  width: 42px;
  height: 42px;
}

.context-image-thumbnail {
  object-fit: cover;
  display: block;
  background: #f3f4f6;
}

.thumbnail-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  background: #f3f4f6;
}
</style>
