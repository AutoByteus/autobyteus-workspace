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

    <!-- The drop indicator for folders has been removed to prevent a full blue border on child folders -->
    <!-- File/Folder Display -->
    <!-- File/Folder Display -->
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
        <span class="text-[15px] text-gray-700 truncate select-none" :class="{ 'text-blue-700 font-medium': isActive }">{{ file.name }}</span>
      </template>
      <template v-else>
        <input 
          class="border text-[15px] text-gray-700 px-1 py-0 rounded focus:ring-1 focus:ring-blue-500 outline-none w-full"
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

    <!-- Context menu -->
    <FileContextMenu
      :visible="showContextMenu"
      :position="contextMenuPosition"
      @rename="startRename"
      @delete="promptDelete"
      @add-file="promptAddFile"
      @add-folder="promptAddFolder"
    />

    <!-- Delete confirmation -->
    <ConfirmDeleteDialog 
      :show="showDeleteConfirm"
      :targetName="file.name"
      @confirm="onDeleteConfirmed"
      @cancel="onDeleteCanceled"
    />

    <!-- Add file/folder dialog -->
    <AddFileOrFolderDialog
      :show="showAddDialog"
      :parentPath="file.path"
      :isFile="addFileMode"
      @confirm="onAddConfirmed"
      @cancel="onAddCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, inject } from 'vue'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'
// import { useFileExplorerStore } from '~/stores/fileExplorer'  <-- REMOVED
import { useWorkspaceStore } from '~/stores/workspace'
import FileContextMenu from './FileContextMenu.vue'
import ConfirmDeleteDialog from './ConfirmDeleteDialog.vue'
import AddFileOrFolderDialog from './AddFileOrFolderDialog.vue'
import type { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer'

const props = defineProps<{ file: TreeNode }>()
// Inject the scoped controller provided by FileExplorer.vue
const explorer = inject<ReturnType<typeof useWorkspaceFileExplorer>>('workspaceFileExplorer')!
if (!explorer) throw new Error("FileItem must be used within a component providing 'workspaceFileExplorer'")

const workspaceStore = useWorkspaceStore()
const isLoadingChildren = ref(false)

const fileItemRef = ref<HTMLElement | null>(null)
const dragPreviewRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const isRenaming = ref(false)
const renameInput = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const showContextMenu = ref(false)
const contextMenuPosition = ref({ top: 0, left: 0 })
const showDeleteConfirm = ref(false)
const isDragOver = ref(false)
const isGlobalDragging = ref(false)

const isActive = computed(() => {
  return props.file.is_file && explorer.activeFile.value === props.file.path
})

const isPreviewable = computed(() => {
  if (!props.file.is_file) return false
  const lower = props.file.name.toLowerCase()
  return lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.csv') || lower.endsWith('.pdf')
})

const showAddDialog = ref(false)
const addFileMode = ref(true)
let originalName = ''

onMounted(() => {
  document.addEventListener('closeAllFileContextMenus', onCloseAllContextMenus)
  document.addEventListener('dragover', onGlobalDragOver)
  document.addEventListener('dragend', onGlobalDragEnd)
})

onBeforeUnmount(() => {
  document.removeEventListener('closeAllFileContextMenus', onCloseAllContextMenus)
  document.removeEventListener('dragover', onGlobalDragOver)
  document.removeEventListener('dragend', onGlobalDragEnd)
  isDragOver.value = false
})

const isFolderOpen = computed(() => {
  return !props.file.is_file && !!explorer.openFolders.value[props.file.path]
})

const isValidDropTarget = computed(() => {
  return !props.file.is_file // Only folders are valid drop targets
})

function onCloseAllContextMenus() {
  if (showContextMenu.value) {
    showContextMenu.value = false
    document.removeEventListener('click', onGlobalClick)
    document.removeEventListener('keydown', handleEscapeKey)
  }
}

const onGlobalDragOver = (event: DragEvent) => {
  const isOverFileExplorer = event.target instanceof Element && 
    (event.target.closest('.file-item') !== null || event.target.closest('.file-explorer') !== null)
  
  if (!isOverFileExplorer) {
    isDragOver.value = false
  }
}

const onGlobalDragEnd = () => {
  // Clear all drag-related states
  isDragOver.value = false
  isGlobalDragging.value = false
  isDragging.value = false
}

const handleClick = async () => {
  if (props.file.is_file) {
    if (isPreviewable.value) {
      explorer.openFilePreview(props.file.path)
    } else {
      explorer.openFile(props.file.path)
    }
  } else {
    // Toggle folder open/close
    explorer.toggleFolder(props.file.path)
    
    // Lazy load children if folder is being opened and children not yet loaded
    const willBeOpen = !!explorer.openFolders.value[props.file.path]
    if (willBeOpen && !props.file.childrenLoaded && !isLoadingChildren.value) {
      // Use the injected workspaceId from the explorer context, NOT the global activeWorkspace.
      // This is critical for skill workspaces which are NOT the active workspace.
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
  
  document.dispatchEvent(new Event('closeAllFileContextMenus'))

  showContextMenu.value = true
  contextMenuPosition.value = { 
    top: event.clientY,
    left: event.clientX
  }
  
  document.addEventListener('click', onGlobalClick)
  document.addEventListener('keydown', handleEscapeKey)
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showContextMenu.value = false
    document.removeEventListener('keydown', handleEscapeKey)
  }
}

const onGlobalClick = () => {
  showContextMenu.value = false
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('keydown', handleEscapeKey)
}

const startRename = () => {
  showContextMenu.value = false
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

const promptDelete = () => {
  showContextMenu.value = false
  showDeleteConfirm.value = true
}

const onDeleteConfirmed = async () => {
  showDeleteConfirm.value = false
  try {
    await explorer.deleteFileOrFolder(props.file.path)
  } catch (error) {
    console.error('Failed to delete:', error)
  }
}

const onDeleteCanceled = () => {
  showDeleteConfirm.value = false
}

const promptAddFile = () => {
  showContextMenu.value = false
  addFileMode.value = true
  showAddDialog.value = true
}

const promptAddFolder = () => {
  showContextMenu.value = false
  addFileMode.value = false
  showAddDialog.value = true
}

async function onAddConfirmed(newName: string) {
  showAddDialog.value = false
  try {
    // Build the new file/folder path based on whether the current node is a file or folder
    let finalPath: string
    if (props.file.is_file) {
      const segments = props.file.path.split('/')
      segments.pop()
      const parentPath = segments.join('/')
      finalPath = parentPath ? `${parentPath}/${newName}` : newName
    } else {
      finalPath = props.file.path ? `${props.file.path}/${newName}` : newName
    }
    await explorer.createFileOrFolder(finalPath, addFileMode.value)
  } catch (error) {
    console.error('Failed to create file/folder:', error)
  }
}

function onAddCanceled() {
  showAddDialog.value = false
}

const onDragStart = (event: DragEvent) => {
  event.stopPropagation()
  if (event.target === fileItemRef.value && event.dataTransfer) {
    isDragging.value = true
    isDragOver.value = false
    isGlobalDragging.value = true

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
  
  if (!isValidDropTarget.value) return
  
  isDragOver.value = true
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()

  if (!isValidDropTarget.value) {
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'none'
    }
    return
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isDragOver.value = true
}

const onDragLeave = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()

  if (!isValidDropTarget.value) return

  const relatedTarget = event.relatedTarget as HTMLElement
  if (!fileItemRef.value?.contains(relatedTarget)) {
    isDragOver.value = false
  }
}

const onDragEnd = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isDragging.value = false
  isDragOver.value = false
  isGlobalDragging.value = false
}

const onDrop = async (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (!isValidDropTarget.value) return
  
  isDragOver.value = false
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
  font-size: 14px;
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
