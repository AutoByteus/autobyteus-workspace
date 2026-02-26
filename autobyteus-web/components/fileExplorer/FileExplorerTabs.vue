<template>
  <!-- Zen: teleport to body so it sits above the sidebar stacking context -->
  <Teleport v-if="isZenMode" to="body">
    <div
      id="contentViewer"
      class="bg-white rounded-lg shadow-md flex flex-col h-full fixed inset-0 z-[120] min-h-screen"
      ref="contentRef"
    >
      <div class="flex-1 flex flex-col min-h-0">
        <!-- If no file is active -->
        <!-- If no file is active -->
        <div v-if="!activeFile" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-16 h-16 mb-4 text-gray-300">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 class="text-lg font-medium text-gray-500 mb-1">No file selected</h3>
          <p class="text-sm">Select a file from the explorer to view or edit its content.</p>
        </div>

        <!-- Main content -->
        <div v-else class="flex-1 flex flex-col min-h-0">
          <div v-if="activeFileData?.isLoading" class="flex-1 text-center py-4 flex items-center justify-center">
            <p class="text-gray-600">Loading file content...</p>
          </div>
          <div v-else-if="activeFileData?.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">{{ activeFileData.error }}</span>
          </div>
          <div v-else-if="activeFileData" class="flex-1 bg-gray-50 rounded-lg overflow-hidden relative min-h-0">
            <FileViewer
              v-if="activeFileData"
              :file="activeFileData"
              :mode="activeFileMode"
              :loading="activeFileData.isLoading"
              :error="activeFileData.error"
              :read-only="false"
              @update:model-value="fileContent = $event"
              @save="handleSave"
              class="h-full w-full flex-1 min-h-0 overflow-auto"
            />
            <template v-if="activeFileData.type === 'Text' && activeFile && activeFileMode === 'edit'">
              <div v-if="saveContentError" class="absolute bottom-2 left-2 text-red-600 bg-white px-2 py-1 rounded shadow">
                {{ saveContentError }}
              </div>
              <div v-if="isSavingContent" class="absolute bottom-2 right-2 text-gray-600 bg-white px-2 py-1 rounded shadow">
                Saving...
              </div>
              <div v-if="showSaveSuccess" class="absolute bottom-2 right-2 text-green-600 bg-white px-2 py-1 rounded shadow">
                Changes saved
              </div>
            </template>
          </div>
          <div v-else class="flex-1 text-center py-4 flex items-center justify-center">
            <p class="text-gray-500">Unsupported file type. Cannot display.</p>
          </div>
        </div>
      </div>

      <button
        class="absolute top-3 right-3 p-2 rounded-full border border-gray-200 bg-white shadow hover:bg-gray-100"
        @click.stop="toggleZenMode"
        title="Exit full view"
      >
        <Icon icon="heroicons:x-mark" class="h-5 w-5 text-gray-700" />
      </button>
    </div>
  </Teleport>

  <!-- Normal render -->
  <div
    v-else
    id="contentViewer"
    class="bg-white rounded-lg shadow-md flex flex-col h-full"
    ref="contentRef"
  >
    <!-- File Tabs & Controls Header -->
    <div class="flex items-center border-b border-gray-200 bg-white overflow-x-auto sticky top-0 z-10 px-0 h-[46px]">
      <div class="flex flex-1 px-2 gap-4 items-center min-w-0">
         <div class="flex gap-4 overflow-x-auto no-scrollbar mask-fade-right">
            <button 
            v-for="file in openFiles" 
            :key="file"
            @click="setActiveFile(file)"
            @contextmenu.prevent="showContextMenu($event, file)"
            tabindex="0"
            @keyup.enter="setActiveFile(file)"
            class="group relative flex items-center gap-2 px-1 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 focus:outline-none whitespace-nowrap"
            :class="file === activeFile 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
            <span class="truncate max-w-[150px]">{{ getFileName(file) }}</span>
            <span 
                v-if="file === activeFile"
                @click.stop="closeFile(file)" 
                class="flex items-center justify-center w-4 h-4 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all ml-1"
                aria-label="Close file"
            >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </span>
            </button>
        </div>
      </div>
      
      <!-- Right Side Controls -->
      <div class="flex items-center gap-1 pr-2 shrink-0">
        <!-- Edit/Preview Group -->
        <div v-if="activeFileData?.type === 'Text' && isPreviewableText" class="flex items-center gap-1 border-r border-gray-200 pr-1 mr-1">
           <button
            class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
            :class="activeFileMode === 'edit' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
            @click.stop="setMode('edit')"
             title="Edit Mode"
          >
            <Icon icon="heroicons:pencil-square" class="h-4 w-4" />
          </button>
          <button
            class="p-1.5 rounded-md transition-all duration-200 focus:outline-none"
            :class="activeFileMode === 'preview' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'"
            @click.stop="setMode('preview')"
             title="Preview Mode"
          >
            <Icon icon="heroicons:eye" class="h-4 w-4" />
          </button>
        </div>

         <!-- Zen Mode -->
         <button
          class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 focus:outline-none"
          @click.stop="toggleZenMode"
          :title="isZenMode ? 'Restore view' : 'Maximize view'"
        >
          <Icon v-if="!isZenMode" icon="heroicons:arrows-pointing-out" class="h-4 w-4" />
          <Icon v-else icon="heroicons:arrows-pointing-in" class="h-4 w-4" />
        </button>

        <!-- Close All button -->
        <button 
            v-if="openFiles.length > 1"
            @click="closeAllFiles"
            class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all ml-1"
            title="Close all files"
        >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </button>
      </div>
    </div>
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 relative">
      <div v-if="!activeFile" class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-16 h-16 mb-4 text-gray-300">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-500 mb-1">No file selected</h3>
        <p class="text-sm">Select a file from the explorer to view or edit its content.</p>
      </div>

      <div v-else class="flex-1 flex flex-col min-h-0">
        <div v-if="activeFileData?.isLoading" class="flex-1 text-center py-4 flex items-center justify-center">
          <p class="text-gray-600">Loading file content...</p>
        </div>
        <div v-else-if="activeFileData?.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
          <strong class="font-bold">Error!</strong>
          <span class="block sm:inline">{{ activeFileData.error }}</span>
        </div>
        <div v-else-if="activeFileData" class="flex-1 bg-gray-50 rounded-lg overflow-hidden relative min-h-0">
          <FileViewer
            v-if="activeFileData"
            :file="activeFileData"
            :mode="activeFileMode"
            :loading="activeFileData.isLoading"
            :error="activeFileData.error"
            :read-only="false"
            @update:model-value="fileContent = $event"
            @save="handleSave"
            class="h-full w-full flex-1 min-h-0 overflow-auto"
          />
          <template v-if="activeFileData.type === 'Text' && activeFile && activeFileMode === 'edit'">
            <div v-if="saveContentError" class="absolute bottom-2 left-2 text-red-600 bg-white px-2 py-1 rounded shadow">
              {{ saveContentError }}
            </div>
            <div v-if="isSavingContent" class="absolute bottom-2 right-2 text-gray-600 bg-white px-2 py-1 rounded shadow">
              Saving...
            </div>
            <div v-if="showSaveSuccess" class="absolute bottom-2 right-2 text-green-600 bg-white px-2 py-1 rounded shadow">
              Changes saved
            </div>
          </template>
        </div>
        <div v-else class="flex-1 text-center py-4 flex items-center justify-center">
          <p class="text-gray-500">Unsupported file type. Cannot display.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref, onBeforeUnmount } from 'vue'
import { Teleport } from 'vue'
import { storeToRefs } from 'pinia'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useWorkspaceStore } from '~/stores/workspace'
import { useFileContentDisplayModeStore } from '~/stores/fileContentDisplayMode'
import { getLanguage } from '~/utils/highlighting/languageDetector'
import { Icon } from '@iconify/vue'

// Viewer components
import FileViewer from '~/components/fileExplorer/FileViewer.vue'

const fileExplorerStore = useFileExplorerStore()
const workspaceStore = useWorkspaceStore()
const fileContentDisplayModeStore = useFileContentDisplayModeStore()
const { isZenMode } = storeToRefs(fileContentDisplayModeStore)

const props = defineProps<{
  workspaceId?: string
}>()

const contentRef = ref<HTMLElement | null>(null)
// File Content Viewer is currently Global / Desktop level, so it binds to the Active Workspace.
// In the future, if we want multiple viewers for split screens, this component would need a workspaceId prop.
const currentWorkspaceId = computed(() => props.workspaceId || workspaceStore.activeWorkspace?.workspaceId)

const openFiles = computed(() => currentWorkspaceId.value ? fileExplorerStore.getOpenFiles(currentWorkspaceId.value) : [])
const activeFile = computed(() => currentWorkspaceId.value ? fileExplorerStore.getActiveFile(currentWorkspaceId.value) : null)
const activeFileData = computed(() => currentWorkspaceId.value ? fileExplorerStore.getActiveFileData(currentWorkspaceId.value) : null)

const fileContent = ref<string | null>(null)
const showSaveSuccess = ref(false)
let saveSuccessTimeout: ReturnType<typeof setTimeout> | null = null

const isSavingContent = computed(() => (activeFile.value && currentWorkspaceId.value) ? fileExplorerStore.isSaveContentLoading(activeFile.value, currentWorkspaceId.value) : false)
const saveContentError = computed(() => (activeFile.value && currentWorkspaceId.value) ? fileExplorerStore.getSaveContentError(activeFile.value, currentWorkspaceId.value) : null)

const getFileName = (filePath: string) => {
  try {
    const url = new URL(filePath);
    const pathname = url.pathname;
    return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1)) || filePath;
  } catch (e) {
    return filePath.split('/').pop() || filePath;
  }
};
const setActiveFile = (filePath: string) => currentWorkspaceId.value && fileExplorerStore.setActiveFile(filePath, currentWorkspaceId.value)
const closeFile = (filePath: string) => currentWorkspaceId.value && fileExplorerStore.closeFile(filePath, currentWorkspaceId.value)
const closeAllFiles = () => currentWorkspaceId.value && fileExplorerStore.closeAllFiles(currentWorkspaceId.value)
const closeOtherFiles = (filePath: string) => currentWorkspaceId.value && fileExplorerStore.closeOtherFiles(filePath, currentWorkspaceId.value)
const getFileLanguage = (filePath: string) => getLanguage(filePath)
const setMode = (mode: 'edit' | 'preview') => {
  if (!activeFile.value || !currentWorkspaceId.value) return
  fileExplorerStore.setFileMode(activeFile.value, mode, currentWorkspaceId.value)
}

const isPreviewableText = computed(() => {
  const path = activeFileData.value?.path?.toLowerCase?.() || ''
  return path.endsWith('.md') || path.endsWith('.markdown') || path.endsWith('.html') || path.endsWith('.htm')
})

const activeFileMode = computed(() => activeFileData.value?.mode ?? 'edit')
const toggleZenMode = () => fileContentDisplayModeStore.toggleZenMode()

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetFile: null as string | null
})

const showContextMenu = (event: MouseEvent, file: string) => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    targetFile: file
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
  contextMenu.value.targetFile = null
}

const handleContextClose = () => {
  if (contextMenu.value.targetFile) {
    closeFile(contextMenu.value.targetFile)
  }
  hideContextMenu()
}

const handleContextCloseOthers = () => {
  if (contextMenu.value.targetFile) {
    closeOtherFiles(contextMenu.value.targetFile)
  }
  hideContextMenu()
}

const handleContextCloseAll = () => {
  closeAllFiles()
  hideContextMenu()
}

// Check if Monaco editor is focused
const isEditorFocused = () => {
  const activeEl = document.activeElement
  if (!activeEl) return false
  // Monaco editor uses textarea or elements with monaco-editor class
  return activeEl.tagName === 'TEXTAREA' || 
         activeEl.closest('.monaco-editor') !== null
}



watch(activeFileData, (newVal) => {
  if (newVal?.type === 'Text') {
    fileContent.value = newVal.content;
  } else {
    fileContent.value = null;
  }
}, { immediate: true, deep: true });

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', hideContextMenu)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', hideContextMenu)
  if (saveSuccessTimeout) {
    clearTimeout(saveSuccessTimeout)
  }
})

const handleSave = async () => {
  if (!activeFile.value || fileContent.value === null || isSavingContent.value) return;

  try {
    const workspaceId = currentWorkspaceId.value
    if (!workspaceId) throw new Error('No workspace selected, cannot save file.')

    await fileExplorerStore.saveFileContentFromEditor(
      workspaceId, 
      activeFile.value, 
      fileContent.value
    )
    
    showSaveSuccess.value = true
    if (saveSuccessTimeout) clearTimeout(saveSuccessTimeout)
    saveSuccessTimeout = setTimeout(() => { showSaveSuccess.value = false }, 2000)
  } catch (error) {
    console.error("Save operation failed:", error)
  }
}

const handleKeydown = async (event: KeyboardEvent) => {
  // Exit Zen mode on Escape
  if (event.key === 'Escape' && isZenMode.value) {
    fileContentDisplayModeStore.exitZenMode()
    return
  }
  
  // Arrow key navigation - only when editor is NOT focused
  if (!isEditorFocused() && openFiles.value.length > 1) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (currentWorkspaceId.value) fileExplorerStore.navigateToPreviousTab(currentWorkspaceId.value)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (currentWorkspaceId.value) fileExplorerStore.navigateToNextTab(currentWorkspaceId.value)
    }
  }
}
</script>

<style scoped>
.close-button {
  font-size: 18px;
}
.close-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
