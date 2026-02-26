<template>
  <div
    class="bg-white px-3 py-2"
    @dragover.prevent
    @drop.prevent="onFileDrop"
    @paste="onPaste"
    data-file-drop-target="true"
    ref="dropAreaRef"
  >
    <!-- Hidden file input for upload button -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="onFileSelect"
      :disabled="!activeContextStore.activeAgentContext"
    />

    <!-- Clickable Header Area -->
    <div
      class="flex items-center justify-between"
      :class="{ 'mb-2': isContextListExpanded && contextFilePaths.length > 0 }"
    >
      <div
        @click="toggleContextList"
        class="flex items-center flex-grow cursor-pointer px-1 py-1 rounded hover:bg-gray-50 transition-colors"
        role="button"
        :aria-expanded="isContextListExpanded"
        aria-controls="context-file-list"
      >
        <div class="flex items-center">
          <!-- Chevron icon is now conditional -->
          <svg
            v-if="contextFilePaths.length > 0"
            class="w-5 h-5 transform transition-transform text-gray-600 mr-2 flex-shrink-0"
            :class="{ 'rotate-90': isContextListExpanded }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
          <span class="font-medium text-xs text-gray-700">
            Context Files ({{ contextFilePaths.length }})
          </span>
          <span v-if="contextFilePaths.length === 0" class="text-xs text-gray-400 ml-1.5">(drag, paste, or upload)</span>
        </div>
      </div>
      
      <!-- Upload Button -->
      <button
        @click.stop="triggerFileInput"
        class="text-blue-500 hover:text-white hover:bg-blue-500 transition-colors duration-200 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2 flex-shrink-0"
        title="Upload files"
        aria-label="Upload files"
        :disabled="!activeContextStore.activeAgentContext"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- File List (conditionally rendered) -->
    <div
      v-if="isContextListExpanded && contextFilePaths.length > 0"
      id="context-file-list"
      class="space-y-2"
    >
      <div v-if="thumbnailContextFiles.length > 0" class="thumbnail-row-container">
        <div class="thumbnail-row">
          <div
            v-for="item in thumbnailContextFiles"
            :key="`${item.filePath.path}-${item.index}`"
            class="thumbnail-card group"
          >
            <button
              type="button"
              class="thumbnail-button"
              @click="openImagePreview(item.filePath)"
              :title="item.filePath.path"
              aria-label="Open image preview"
            >
              <img
                :src="getImagePreviewSrc(item.filePath)"
                alt="Context image thumbnail"
                class="context-image-thumbnail"
                @error="markImagePreviewAsFailed(item.filePath.path)"
              />
            </button>
            <button
              @click.stop="removeContextFilePath(item.index)"
              class="thumbnail-remove-button"
              title="Remove this file"
              aria-label="Remove file"
              :disabled="uploadingFiles.includes(item.filePath.path)"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div v-if="uploadingFiles.includes(item.filePath.path)" class="thumbnail-uploading">
              <i class="fas fa-spinner fa-spin mr-1"></i>Uploading
            </div>
          </div>
        </div>
      </div>

      <ul v-if="regularContextFiles.length > 0" class="space-y-2">
        <li
          v-for="item in regularContextFiles"
          :key="`${item.filePath.path}-${item.index}`"
          class="bg-gray-100 p-2 rounded transition-colors duration-300 flex items-start justify-between hover:bg-gray-200 group"
        >
          <div class="flex items-start space-x-2 flex-grow min-w-0">
            <i :class="['fas', getIconForFileType(item.filePath.type), 'text-gray-500 w-4 flex-shrink-0']"></i>
            <div class="min-w-0 flex-grow">
              <span
                class="text-sm text-gray-600 truncate group-hover:underline cursor-pointer block"
                @click="handleContextFileClick(item.filePath)"
                :title="item.filePath.path"
              >
                {{ item.filePath.path }}
              </span>
            </div>
            <span v-if="uploadingFiles.includes(item.filePath.path)" class="text-xs text-blue-500 ml-auto flex-shrink-0">
              <i class="fas fa-spinner fa-spin mr-1"></i>Uploading...
            </span>
          </div>
          <button
            @click.stop="removeContextFilePath(item.index)"
            class="text-red-500 hover:text-white hover:bg-red-500 transition-colors duration-300 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 ml-2 flex-shrink-0"
            title="Remove this file"
            aria-label="Remove file"
            :disabled="uploadingFiles.includes(item.filePath.path)"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </li>
      </ul>
    </div>

    <!-- "Clear All" Button Footer (conditionally rendered) -->
    <div v-if="contextFilePaths.length > 0" class="flex justify-end pt-2 mt-2">
      <button
        @click.stop="clearAllContextFilePaths"
        class="px-2.5 py-1 border border-blue-100 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors duration-200 flex items-center text-xs"
      >
        <i class="fas fa-trash-alt mr-2"></i>
        Clear All
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
import { ref, computed, watch } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useFileUploadStore } from '~/stores/fileUploadStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { getFilePathsFromFolder, determineFileType } from '~/utils/fileExplorer/fileUtils';
import { getServerBaseUrl, getServerUrls } from '~/utils/serverConfig';
import type { TreeNode } from '~/utils/fileExplorer/TreeNode';
import type { ContextFilePath } from '~/types/conversation';
import FullScreenImageModal from '~/components/common/FullScreenImageModal.vue';

const activeContextStore = useActiveContextStore();
const fileUploadStore = useFileUploadStore();
const windowNodeContextStore = useWindowNodeContextStore();
const fileExplorerStore = useFileExplorerStore();
import { useWorkspaceStore } from '~/stores/workspace';
const workspaceStore = useWorkspaceStore();

const contextFilePaths = computed(() => activeContextStore.currentContextPaths);
const uploadingFiles = ref<string[]>([]);
const isContextListExpanded = ref(true);
const fileInputRef = ref<HTMLInputElement | null>(null);
const failedImagePreviewPaths = ref<Set<string>>(new Set());
const isImageModalVisible = ref(false);
const selectedImageUrl = ref<string | null>(null);

const getIconForFileType = (type: ContextFilePath['type']) => {
  switch (type) {
    case 'Image':
      return 'fa-image';
    case 'Audio':
      return 'fa-file-audio';
    case 'Video':
      return 'fa-file-video';
    default:
      return 'fa-file';
  }
};

const toggleContextList = () => {
  if (contextFilePaths.value.length > 0) {
    isContextListExpanded.value = !isContextListExpanded.value;
  } else {
    isContextListExpanded.value = true;
  }
};

const isAbsoluteLocalPath = (path: string): boolean => path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);

const resolveImagePreviewUrl = (filePath: ContextFilePath): string | null => {
  if (filePath.type !== 'Image' || failedImagePreviewPaths.value.has(filePath.path)) {
    return null;
  }

  const path = filePath.path.trim();
  if (!path) {
    return null;
  }

  if (
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('local-file://') ||
    path.startsWith('file://') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  if (isElectron.value && isAbsoluteLocalPath(path)) {
    return `local-file://${path}`;
  }

  if (path.startsWith('/')) {
    const baseUrl = getServerBaseUrl().replace(/\/$/, '');
    return `${baseUrl}${path}`;
  }

  if (path.startsWith('rest/')) {
    const baseUrl = getServerBaseUrl().replace(/\/$/, '');
    return `${baseUrl}/${path}`;
  }

  const workspaceId = workspaceStore.activeWorkspace?.workspaceId;
  if (!workspaceId) {
    return null;
  }

  const restBaseUrl = getServerUrls().rest.replace(/\/$/, '');
  return `${restBaseUrl}/workspaces/${workspaceId}/content?path=${encodeURIComponent(path)}`;
};

const getImagePreviewSrc = (filePath: ContextFilePath): string => resolveImagePreviewUrl(filePath) || '';

const isImagePreviewAvailable = (filePath: ContextFilePath): boolean => Boolean(resolveImagePreviewUrl(filePath));

const indexedContextFilePaths = computed(() =>
  contextFilePaths.value.map((filePath, index) => ({ filePath, index }))
);

const thumbnailContextFiles = computed(() =>
  indexedContextFilePaths.value.filter(
    ({ filePath }) => filePath.type === 'Image' && isImagePreviewAvailable(filePath)
  )
);

const regularContextFiles = computed(() =>
  indexedContextFilePaths.value.filter(
    ({ filePath }) => filePath.type !== 'Image' || !isImagePreviewAvailable(filePath)
  )
);

const markImagePreviewAsFailed = (path: string) => {
  if (failedImagePreviewPaths.value.has(path)) {
    return;
  }
  const updatedSet = new Set(failedImagePreviewPaths.value);
  updatedSet.add(path);
  failedImagePreviewPaths.value = updatedSet;
};

const openImagePreview = (filePath: ContextFilePath) => {
  if (uploadingFiles.value.includes(filePath.path)) {
    return;
  }
  const imageUrl = resolveImagePreviewUrl(filePath);
  if (!imageUrl) {
    handleContextFileClick(filePath);
    return;
  }
  selectedImageUrl.value = imageUrl;
  isImageModalVisible.value = true;
};

const closeImagePreview = () => {
  isImageModalVisible.value = false;
  selectedImageUrl.value = null;
};

const handleContextFileClick = (filePath: ContextFilePath) => {
  if (uploadingFiles.value.includes(filePath.path)) {
    return;
  }
  const workspaceId = workspaceStore.activeWorkspace?.workspaceId;
  if (workspaceId) {
      fileExplorerStore.openFile(filePath.path, workspaceId);
  } else {
      console.warn("Cannot open file: No active workspace found.");
  }
};

const removeContextFilePath = (index: number) => {
  activeContextStore.removeContextFilePath(index);
};

const clearAllContextFilePaths = () => {
  activeContextStore.clearContextFilePaths();
  isContextListExpanded.value = true;
};

const processAndUploadFiles = async (files: (File | null)[]) => {
  if (!activeContextStore.activeAgentContext) return;

  const validFiles = files.filter((f): f is File => f !== null);
  if (validFiles.length === 0) {
    return;
  }
  
  if (!isContextListExpanded.value) {
    isContextListExpanded.value = true;
  }

  const uploadPromises = validFiles.map(async (file) => {
    const tempPath = URL.createObjectURL(file);
    
    let fileType: ContextFilePath['type'];
    if (file.type.startsWith('image/')) fileType = 'Image';
    else if (file.type.startsWith('audio/')) fileType = 'Audio';
    else if (file.type.startsWith('video/')) fileType = 'Video';
    else fileType = 'Text';

    activeContextStore.addContextFilePath({ path: tempPath, type: fileType });
    uploadingFiles.value.push(tempPath);

    try {
      const uploadedFilePath = await fileUploadStore.uploadFile(file);
      const tempIndex = contextFilePaths.value.findIndex(cf => cf.path === tempPath);
      if (tempIndex !== -1) {
        activeContextStore.removeContextFilePath(tempIndex);
      }
      activeContextStore.addContextFilePath({ path: uploadedFilePath, type: fileType });
    } catch (error) {
      console.error('Error uploading file:', error);
      const tempIndex = contextFilePaths.value.findIndex(cf => cf.path === tempPath);
      if (tempIndex !== -1) {
        activeContextStore.removeContextFilePath(tempIndex);
      }
    } finally {
      uploadingFiles.value = uploadingFiles.value.filter(path => path !== tempPath);
    }
  });

  await Promise.all(uploadPromises);
};

const triggerFileInput = () => {
  if (activeContextStore.activeAgentContext) {
    fileInputRef.value?.click();
  }
};

const onFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    processAndUploadFiles(Array.from(input.files));
  }
  input.value = '';
};

const onFileDrop = async (event: DragEvent) => {
  if (!activeContextStore.activeAgentContext) return;

  const dataTransfer = event.dataTransfer;
  const dragData = dataTransfer?.getData('application/json');

  if (dragData) {
    console.log('[INFO] Drop event is from internal file explorer.');
    const droppedNode: TreeNode = JSON.parse(dragData);
    const filePaths = getFilePathsFromFolder(droppedNode);
    for (const filePath of filePaths) {
      const fileType = await determineFileType(filePath);
      activeContextStore.addContextFilePath({ path: filePath, type: fileType });
    }
    if (filePaths.length > 0 && !isContextListExpanded.value) {
      isContextListExpanded.value = true;
    }
  } else if (windowNodeContextStore.isEmbeddedWindow && dataTransfer?.files?.length) {
    console.log('[INFO] Drop event from native OS in Electron.');
    const files = Array.from(dataTransfer.files);
    const pathPromises = files.map(f => window.electronAPI?.getPathForFile(f));
    const paths = (await Promise.all(pathPromises)).filter((p): p is string => Boolean(p));
    
    console.log('[INFO] Received native file paths from preload bridge:', paths);
    for (const path of paths) {
      const fileType = await determineFileType(path);
      activeContextStore.addContextFilePath({ path, type: fileType });
    }
    if (paths.length > 0 && !isContextListExpanded.value) {
      isContextListExpanded.value = true;
    }
  } else if (!windowNodeContextStore.isEmbeddedWindow && dataTransfer?.files?.length) {
    console.log('[INFO] Drop event from native OS in browser, uploading files.');
    await processAndUploadFiles(Array.from(dataTransfer.files));
  }
};

const onPaste = async (event: ClipboardEvent) => {
  if (!activeContextStore.activeAgentContext) return;

  const clipboardData = event.clipboardData;
  if (!clipboardData) return;

  const items = clipboardData.items;
  if (items) {
    const fileLikes = Array.from(items)
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile());

    // Check if there are actual files to process
    if (fileLikes.some(f => f !== null)) {
      event.preventDefault();
      await processAndUploadFiles(fileLikes);
      return; // Prioritize file pasting
    }
  }

  // Fallback to handle pasting text paths if no files were found
  const pastedText = clipboardData.getData('text/plain');
  if (pastedText && pastedText.trim()) {
    event.preventDefault();
    const paths = pastedText.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    
    if (paths.length > 0) {
      if (!isContextListExpanded.value) {
        isContextListExpanded.value = true;
      }
      for (const path of paths) {
        const fileType = await determineFileType(path);
        activeContextStore.addContextFilePath({ path, type: fileType });
      }
    }
  }
};

watch(contextFilePaths, (newPaths) => {
    if (newPaths.length === 0 && !isContextListExpanded.value) {
        isContextListExpanded.value = true;
    }
    const activePaths = new Set(newPaths.map(pathInfo => pathInfo.path));
    failedImagePreviewPaths.value = new Set(
      Array.from(failedImagePreviewPaths.value).filter(path => activePaths.has(path))
    );
}, { deep: true });
</script>

<style scoped>
.thumbnail-button {
  display: inline-flex;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 1px solid #d1d5db;
  transition: box-shadow 0.2s ease;
  width: 42px;
  height: 42px;
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
  font-size: 10px;
  line-height: 1;
  color: #1d4ed8;
  text-align: center;
  background: rgba(255, 255, 255, 0.9);
}

.context-image-thumbnail {
  width: 42px;
  height: 42px;
  object-fit: cover;
  display: block;
  background: #f3f4f6;
}
</style>
