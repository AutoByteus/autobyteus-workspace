<template>
  <div
    ref="fileItemRef"
    :class="[
      'file-item cursor-pointer',
      {
        'folder': !file.is_file,
        'open': isFolderOpen,
        'dragging': isDragging,
        'relative': true
      }
    ]"
    draggable="true"
    @click.stop="handleClick"
    @contextmenu.prevent="handleContextMenu"
    @dragstart="onDragStart"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="onDragEnd"
    v-if="file.is_file || !file.is_file"
  >
    <!-- Hidden drag preview -->
    <div v-show="false" ref="dragPreviewRef" class="drag-preview">
      <div class="drag-preview-content">
        <div class="drag-preview-icon">
          <svg v-if="!file.is_file" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#87CEEB" class="w-full h-full">
            <path d="M20 18c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h5l2 1h7c.55 0 1 .45 1 1v11z"/>
          </svg>
          <i v-else class="fas fa-file text-gray-500"></i>
        </div>
        <span class="drag-preview-text">{{ file.name }}</span>
      </div>
    </div>

    <div
      class="file-header flex items-center space-x-1.5 rounded-r px-2 py-0.5 border-l-2 ml-[8px]"
      :class="{
        'hover:bg-gray-200': !isDragging && !isActive,
        'bg-blue-50 text-blue-700': isActive && !isDragging,
        'border-blue-500': isActive && !isDragging,
        'border-transparent': !isActive || isDragging,
        'opacity-50': isDragging
      }"
      :style="{ paddingLeft: (props.file.is_file && !explorer.openFolders.value[props.file.path.split('/').slice(0, -1).join('/')]) ? '' : '' }"
    >
      <div class="icon w-4 h-4 flex-shrink-0 flex items-center justify-center">
        <!-- Folder Icons -->
        <svg v-if="!file.is_file" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" :class="isFolderOpen ? 'text-blue-500' : 'text-blue-400'" class="w-full h-full transform transition-transform duration-150" :style="{ transform: isFolderOpen ? 'rotate(90deg)' : 'rotate(0deg)' }">
             <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>

        <!-- File Icons (refined) -->
        <i v-else-if="file.name.endsWith('.js') || file.name.endsWith('.ts')" class="fab fa-js text-yellow-500 text-xs"></i>
        <i v-else-if="file.name.endsWith('.vue')" class="fab fa-vuejs text-green-500 text-xs"></i>
        <i v-else-if="file.name.endsWith('.html')" class="fab fa-html5 text-orange-500 text-xs"></i>
        <i v-else-if="file.name.endsWith('.css')" class="fab fa-css3-alt text-blue-500 text-xs"></i>
        <i v-else-if="file.name.endsWith('.md')" class="fab fa-markdown text-blue-400 text-xs"></i>
        <i v-else-if="file.name.endsWith('.json')" class="fas fa-code text-yellow-600 text-xs"></i>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3.5 h-3.5 text-gray-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      <template v-if="!isRenaming">
        <span class="text-[0.9375rem] text-gray-700 truncate select-none" :class="{ 'text-blue-700 font-medium': isActive }">{{ file.name }}</span>
      </template>
      <template v-else>
        <input
          class="border text-[0.9375rem] text-gray-700 px-1 py-0 rounded focus:ring-1 focus:ring-blue-500 outline-none w-full"
          type="text"
          v-model="renameInput"
          @keyup.enter="confirmRename"
          @blur="cancelRename"
          ref="renameInputRef"
        />
      </template>
    </div>

    <!-- Folder contents if open -->
    <transition name="folder">
      <div v-if="!file.is_file && isFolderOpen" class="children ml-4 mt-2">
        <FileItem v-for="child in file.children" :key="child.id" :file="child"/>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, inject } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { TreeNode } from '~/utils/fileExplorer/TreeNode'
import { useWorkspaceStore } from '~/stores/workspace'
import type { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer'
import { createFileExplorerNodeContextTarget } from '~/utils/fileExplorer/contextMenu'
import type { FileExplorerRenameRequest, RequestFileExplorerContextMenu } from '~/utils/fileExplorer/contextMenu'

const props = defineProps<{ file: TreeNode }>()
const explorer = inject<ReturnType<typeof useWorkspaceFileExplorer>>('workspaceFileExplorer')!
if (!explorer) throw new Error("FileItem must be used within a component providing 'workspaceFileExplorer'")
const panelActive = inject<ComputedRef<boolean>>('fileExplorerPanelActive', computed(() => true))
const requestFileExplorerContextMenu = inject<RequestFileExplorerContextMenu | null>('requestFileExplorerContextMenu', null)
const renameRequest = inject<Ref<FileExplorerRenameRequest | null>>('fileExplorerRenameRequest', ref(null))
const outsideDragSignal = inject<Ref<number>>('fileExplorerOutsideDragSignal', ref(0))
const globalDragResetSignal = inject<Ref<number>>('fileExplorerGlobalDragResetSignal', ref(0))

const workspaceStore = useWorkspaceStore()
const isLoadingChildren = ref(false)

const fileItemRef = ref<HTMLElement | null>(null)
const dragPreviewRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isRenaming = ref(false)
const renameInput = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
let originalName = ''

const isActive = computed(() => {
  return props.file.is_file && explorer.activeFile.value === props.file.path
})

const isPreviewable = computed(() => {
  if (!props.file.is_file) return false
  const lower = props.file.name.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.csv') || lower.endsWith('.pdf')
})

const isFolderOpen = computed(() => {
  return !props.file.is_file && !!explorer.openFolders.value[props.file.path]
})

const isValidDropTarget = computed(() => {
  return !props.file.is_file
})

const onGlobalDragEnd = () => {
  isDragging.value = false
}

const handleClick = async () => {
  if (!panelActive.value) return

  if (props.file.is_file) {
    if (isPreviewable.value) {
      explorer.openFilePreview(props.file.path)
    } else {
      explorer.openFile(props.file.path)
    }
  } else {
    explorer.toggleFolder(props.file.path)

    const willBeOpen = !!explorer.openFolders.value[props.file.path]
    if (willBeOpen && !props.file.childrenLoaded && !isLoadingChildren.value) {
      const wsId = explorer.workspaceId.value
      if (wsId) {
        isLoadingChildren.value = true
        try {
          await workspaceStore.fetchFolderChildren(wsId, props.file.path)
        } catch (error) {
          console.error('Error loading folder children:', error)
        } finally {
          isLoadingChildren.value = false
        }
      }
    }
  }
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!panelActive.value || !requestFileExplorerContextMenu) return

  requestFileExplorerContextMenu({
    target: createFileExplorerNodeContextTarget(props.file),
    position: {
      top: event.clientY,
      left: event.clientX,
    },
  })
}

const startRename = () => {
  originalName = props.file.name
  renameInput.value = props.file.name
  isRenaming.value = true
  nextTick(() => {
    if (renameInputRef.value) {
      renameInputRef.value.focus()
      renameInputRef.value.select()
    }
  })
}

const confirmRename = async () => {
  isRenaming.value = false
  const newName = renameInput.value.trim()
  if (!newName || newName === originalName) {
    renameInput.value = originalName
    return
  }

  try {
    await explorer.renameFileOrFolder(props.file.path, newName)
  } catch (error) {
    renameInput.value = originalName
    console.error('Rename failed:', error)
  }
}

const cancelRename = () => {
  isRenaming.value = false
  renameInput.value = originalName
}

const onDragStart = (event: DragEvent) => {
  event.stopPropagation()
  if (!panelActive.value) return

  if (event.target === fileItemRef.value && event.dataTransfer) {
    isDragging.value = true

    event.dataTransfer.setData('application/json', JSON.stringify(props.file))
    event.dataTransfer.effectAllowed = 'move'

    if (dragPreviewRef.value) {
      const preview = dragPreviewRef.value.cloneNode(true) as HTMLElement
      preview.style.display = 'block'
      document.body.appendChild(preview)

      preview.style.position = 'fixed'
      preview.style.top = '0'
      preview.style.left = '0'
      preview.style.zIndex = '-1'
      preview.style.opacity = '1'

      const rect = preview.getBoundingClientRect()
      event.dataTransfer.setDragImage(preview, -10, rect.height / 2)
      setTimeout(() => preview.remove(), 0)
    }
  }
}

const onDragEnter = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!panelActive.value) return

  if (!isValidDropTarget.value) return
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!panelActive.value) return

  if (!isValidDropTarget.value) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none'
    }
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!panelActive.value) return

  if (!isValidDropTarget.value) return

  const relatedTarget = event.relatedTarget as HTMLElement
  if (!fileItemRef.value?.contains(relatedTarget)) {
    }
}

const onDragEnd = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isDragging.value = false
}

const onDrop = async (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (!panelActive.value) return

  if (!isValidDropTarget.value) return

  try {
    const data = event.dataTransfer?.getData('application/json')
    if (!data) return

    const parsedData: TreeNode = JSON.parse(data)
    const sourcePath = parsedData.path

    if (sourcePath) {
      const sourceBasename = sourcePath.split('/').pop() || ''
      const destinationPath = props.file.path + '/' + sourceBasename
      await explorer.moveFileOrFolder(sourcePath, destinationPath)
    }
  } catch (error) {
    console.error('Drop operation failed:', error)
  }
}

const matchesRenameRequest = (request: FileExplorerRenameRequest): boolean => {
  if (request.nodeId && props.file.id) {
    return request.nodeId === props.file.id
  }
  return request.path === props.file.path
}

watch(renameRequest, (request) => {
  if (request && matchesRenameRequest(request)) {
    startRename()
  }
})

watch(outsideDragSignal, () => {
})

watch(globalDragResetSignal, () => {
  onGlobalDragEnd()
})

watch(panelActive, (isActive) => {
  if (isActive) return
  onGlobalDragEnd()
})
</script>

<style scoped>

.file-item {
  position: relative;
  transition: all 0.2s ease-out;
}

.file-header {
  position: relative;
  z-index: 1;
  transition: background-color 0.2s ease-out;
}

.file-header input {
  width: 140px;
}

.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.drag-preview {
  position: fixed;
  top: -9999px;
  left: -9999px;
  z-index: -1;
  pointer-events: none;
}

.drag-preview-content {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: #374151;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  max-width: 200px;
}

.drag-preview-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.drag-preview-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-enter-active,
.folder-leave-active {
  transition: all 0.2s ease;
}

.folder-enter-from,
.folder-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.file-header:hover:not(.dragging) {
  background-color: rgba(229, 231, 235, 0.5);
}

.file-item:focus-within > .file-header {
  background-color: rgba(229, 231, 235, 0.7);
}

.drop-indicator-line {
  height: 2px;
  background-color: #3b82f6;
  position: absolute;
  left: 0;
  right: 0;
  transform: scaleX(0);
  transition: transform 0.15s ease-in-out;
}

.drop-indicator-line.active {
  transform: scaleX(1);
}

.drop-indicator-circle {
  width: 6px;
  height: 6px;
  background-color: #3b82f6;
  border-radius: 50%;
  position: absolute;
  left: -3px;
  top: -2px;
}

.file-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.file-item:not(.dragging) {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
}

.file-item.drag-over {
  transform: translateX(4px);
}

@keyframes pulse {
  0% {
    border-color: #3b82f6;
    opacity: 1;
  }
  50% {
    border-color: #60a5fa;
    opacity: 0.7;
  }
  100% {
    border-color: #3b82f6;
    opacity: 1;
  }
}
</style>
