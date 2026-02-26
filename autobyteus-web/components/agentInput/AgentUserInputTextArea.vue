<template>
  <div class="flex flex-col bg-white">
    <div class="relative flex-grow">
      <textarea
        :value="internalRequirement"
        @input="handleInput"
        ref="textarea"
        class="w-full px-3 py-2.5 pr-14 border-0 focus:ring-0 focus:outline-none resize-none bg-transparent text-[15px] leading-6"
        :style="{
          height: `${textareaHeight}px`,
          minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
          maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
        }"
        placeholder="Type a message..."
        @keydown="handleKeyDown"
        @blur="handleBlur"
        :disabled="!activeContextStore.activeAgentContext"
        @dragover.prevent
        @drop.prevent="handleDrop"
        data-file-drop-target="true"
      ></textarea>

      <button 
        @click="handleSend"
        :disabled="isSending || !internalRequirement.trim() || !activeContextStore.activeAgentContext"
        :title="isSending ? 'Sending...' : 'Send message'"
        class="absolute bottom-2 right-2 flex items-center justify-center p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="isSending" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <Icon v-else icon="heroicons:paper-airplane-solid" class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { Icon } from '@iconify/vue';
import { getFilePathsFromFolder } from '~/utils/fileExplorer/fileUtils';
import type { TreeNode } from '~/utils/fileExplorer/TreeNode';

// Initialize stores
const activeContextStore = useActiveContextStore();
const windowNodeContextStore = useWindowNodeContextStore();
const workspaceStore = useWorkspaceStore();

// Store refs
const { isSending, currentRequirement: storeCurrentRequirement } = storeToRefs(activeContextStore);

// Local component state
const internalRequirement = ref(''); // Local state for textarea
const textarea = ref<HTMLTextAreaElement | null>(null);
const MIN_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 220;
const textareaHeight = ref(MIN_TEXTAREA_HEIGHT);

// Enhanced Debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): { call: (...args: Parameters<T>) => void; cancel: () => void; flush: () => void; } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | undefined;

  const call = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (lastArgs) {
        func.apply(this, lastArgs);
      }
      timeoutId = null;
      lastArgs = undefined;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = undefined;
    }
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      if (lastArgs) {
        func.apply(this, lastArgs);
        lastArgs = undefined;
      }
    }
  };

  return { call, cancel, flush };
}

const adjustTextareaHeight = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto';
    const scrollHeight = textarea.value.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
    textarea.value.style.height = `${newHeight}px`;
    textarea.value.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    textareaHeight.value = newHeight;
  }
};

const { call: debouncedUpdateStore, cancel: cancelDebouncedUpdateStore, flush: flushDebouncedUpdateStore } = 
  debounce((text: string) => {
    if (text !== storeCurrentRequirement.value) {
      activeContextStore.updateRequirement(text);
    }
  }, 750);

watch(storeCurrentRequirement, (newValFromStore) => {
  if (newValFromStore !== internalRequirement.value) {
    internalRequirement.value = newValFromStore;
    nextTick(adjustTextareaHeight); 
  }
}, { immediate: true }); 

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  internalRequirement.value = target.value; 
  nextTick(adjustTextareaHeight);
  debouncedUpdateStore(internalRequirement.value);
};

const syncStoreImmediately = () => {
  cancelDebouncedUpdateStore(); 
  if (internalRequirement.value !== storeCurrentRequirement.value) {
    activeContextStore.updateRequirement(internalRequirement.value);
  }
};

const handleBlur = () => {
  flushDebouncedUpdateStore(); 
};

const handleSend = async () => {
  syncStoreImmediately(); 
  try {
    await activeContextStore.send();
  } catch (error) {
    console.error('Error sending requirement:', error);
  }
};

const insertFilePaths = (filePaths: string[]) => {
  if (!textarea.value || filePaths.length === 0) return;

  const textToInsert = filePaths.join(' ');
  const start = textarea.value.selectionStart;
  const end = textarea.value.selectionEnd;
  
  const newText = internalRequirement.value.substring(0, start) + textToInsert + internalRequirement.value.substring(end);
  internalRequirement.value = newText;

  nextTick(adjustTextareaHeight);
  debouncedUpdateStore(internalRequirement.value);

  nextTick(() => {
    if (textarea.value) {
      const newCursorPos = start + textToInsert.length;
      textarea.value.focus();
      textarea.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  });
};

const handleDrop = async (event: DragEvent) => {
  if (!activeContextStore.activeAgentContext) return;
  
  const dataTransfer = event.dataTransfer;
  if (!dataTransfer) return;

  let filePaths: string[] = [];
  const dragData = dataTransfer.getData('application/json');

  if (dragData) {
    console.log('[INFO] Drop event is from internal file explorer.');
    try {
      const droppedNode: TreeNode = JSON.parse(dragData);
      filePaths = getFilePathsFromFolder(droppedNode);

      if (workspaceStore.activeWorkspace?.absolutePath) {
        const basePath = workspaceStore.activeWorkspace.absolutePath;
        const separator = basePath.includes('\\') ? '\\' : '/';
        filePaths = filePaths.map(relativePath => {
          const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
          const parts = [basePath.replace(/[/\\]$/, ''), ...cleanRelativePath.split('/')];
          return parts.join(separator);
        });
      }
    } catch (error) {
      console.error('Failed to parse dropped node data:', error);
    }
  } else if (windowNodeContextStore.isEmbeddedWindow && dataTransfer.files.length > 0 && window.electronAPI) {
    console.log('[INFO] Drop event from native OS in Electron.');
    const files = Array.from(dataTransfer.files);
    const pathPromises = files.map(f => window.electronAPI.getPathForFile(f));
    const paths = (await Promise.all(pathPromises)).filter((p): p is string => Boolean(p));
    filePaths = paths;
    console.log('[INFO] Received native file paths from preload bridge:', filePaths);
  } else if (!windowNodeContextStore.isEmbeddedWindow && dataTransfer.files.length > 0) {
    console.log('[INFO] Drop event from native OS in browser, using filenames as fallback.');
    filePaths = Array.from(dataTransfer.files).map(file => file.name);
  }
  
  insertFilePaths(filePaths);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    handleSend();
  }
};

const handleResize = () => {
  adjustTextareaHeight();
};

onMounted(async () => {
  await nextTick();
  adjustTextareaHeight();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  flushDebouncedUpdateStore(); 
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
textarea {
  outline: none;
  overflow-y: hidden;
}
textarea::-webkit-scrollbar {
  width: 6px;
}
textarea::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.6);
  border-radius: 9999px;
}
textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.6) transparent;
}
</style>
