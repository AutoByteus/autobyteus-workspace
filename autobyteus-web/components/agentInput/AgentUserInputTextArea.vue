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
        :placeholder="$t('agentInput.components.agentInput.AgentUserInputTextArea.type_a_message')"
        @keydown="handleKeyDown"
        @blur="handleBlur"
        :disabled="!activeContextStore.activeAgentContext"
        @dragover.prevent
        @drop.prevent="handleDrop"
        data-file-drop-target="true"
      ></textarea>

      <button
        v-if="voiceInputStore.isAvailable || voiceInputStore.isRecording || voiceInputStore.isTranscribing"
        type="button"
        @click="handleVoiceAction"
        :disabled="voiceInputStore.isTranscribing || !activeContextStore.activeAgentContext"
        :title="voiceButtonTitle"
        class="absolute bottom-2 right-14 flex items-center justify-center p-2 rounded-full focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :class="voiceButtonClass"
      >
        <Icon
          :icon="voiceInputStore.isRecording ? 'heroicons:stop-solid' : 'heroicons:microphone-solid'"
          class="h-5 w-5"
        />
      </button>

      <button
        @click="handlePrimaryAction"
        :disabled="isActionDisabled"
        :title="isSending ? 'Stop generation' : 'Send message'"
        class="absolute bottom-2 right-2 flex items-center justify-center p-2 text-white rounded-full focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isSending
          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50'
          : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/50'"
      >
        <Icon v-if="isSending" icon="heroicons:stop-solid" class="h-5 w-5" />
        <Icon v-else icon="heroicons:paper-airplane-solid" class="h-5 w-5" />
      </button>
    </div>

    <div
      v-if="voiceInputStore.isRecording || voiceInputStore.isTranscribing"
      class="mx-3 mb-2 flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium"
      :class="voiceStatusClass"
    >
      <div class="flex items-center gap-2">
        <span
          class="h-2.5 w-2.5 rounded-full"
          :class="voiceInputStore.isRecording ? 'animate-pulse bg-red-500' : 'bg-blue-500'"
        ></span>
        <span>{{ voiceStatusText }}</span>
      </div>
      <span v-if="voiceInputStore.isRecording" class="tabular-nums text-[11px] text-current/80">
        {{ recordingDurationLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { Icon } from '@iconify/vue';
import { getFilePathsFromFolder } from '~/utils/fileExplorer/fileUtils';
import type { TreeNode } from '~/utils/fileExplorer/TreeNode';
import type { AgentContext } from '~/types/agent/AgentContext';

// Initialize stores
const activeContextStore = useActiveContextStore();
const voiceInputStore = useVoiceInputStore();
const windowNodeContextStore = useWindowNodeContextStore();
const contextFileUploadStore = useContextFileUploadStore();
const workspaceStore = useWorkspaceStore();

// Store refs
const { isSending, currentRequirement: storeCurrentRequirement } = storeToRefs(activeContextStore);
const isActionDisabled = computed(() => {
  if (!activeContextStore.activeAgentContext) {
    return true;
  }
  if (isSending.value) {
    return false;
  }
  return contextFileUploadStore.isUploading || !internalRequirement.value.trim();
});
const voiceButtonTitle = computed(() => {
  if (voiceInputStore.isTranscribing) {
    return 'Transcribing...';
  }
  return voiceInputStore.isRecording ? 'Stop recording' : 'Start voice input';
});
const voiceButtonClass = computed(() => {
  if (voiceInputStore.isRecording) {
    return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50';
  }
  return 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400/50';
});
const voiceStatusText = computed(() => {
  if (voiceInputStore.isRecording) {
    return 'Recording... Tap stop when you are done.';
  }
  return 'Transcribing voice input...';
});
const voiceStatusClass = computed(() => {
  if (voiceInputStore.isRecording) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  return 'border-blue-200 bg-blue-50 text-blue-700';
});

// Local component state
const internalRequirement = ref(''); // Local state for textarea
const textarea = ref<HTMLTextAreaElement | null>(null);
const MIN_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 220;
const textareaHeight = ref(MIN_TEXTAREA_HEIGHT);
const recordingElapsedSeconds = ref(0);
let recordingStartedAt = 0;
let recordingTimer: ReturnType<typeof setInterval> | null = null;

const recordingDurationLabel = computed(() => {
  const minutes = Math.floor(recordingElapsedSeconds.value / 60);
  const seconds = recordingElapsedSeconds.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

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
        func(...lastArgs);
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
        func(...lastArgs);
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

const syncInternalRequirement = (nextRequirement: string) => {
  if (nextRequirement === internalRequirement.value) {
    return;
  }

  internalRequirement.value = nextRequirement;
  nextTick(adjustTextareaHeight);
};

const { call: debouncedUpdateStore, cancel: cancelDebouncedUpdateStore, flush: flushDebouncedUpdateStore } =
  debounce(({ context, text }: { context: AgentContext | null; text: string }) => {
    if (context && text !== context.requirement) {
      activeContextStore.updateRequirementForContext(context, text);
    }
  }, 750);

watch(
  () => activeContextStore.activeAgentContext,
  (activeContext, previousContext) => {
    if (previousContext && previousContext !== activeContext) {
      flushDebouncedUpdateStore();
    }
    syncInternalRequirement(activeContext?.requirement ?? '');
  },
  { immediate: true },
);

watch(storeCurrentRequirement, (newValFromStore) => {
  syncInternalRequirement(newValFromStore);
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  internalRequirement.value = target.value;
  nextTick(adjustTextareaHeight);
  debouncedUpdateStore({
    context: activeContextStore.activeAgentContext,
    text: internalRequirement.value,
  });
};

const syncStoreImmediately = () => {
  const activeContext = activeContextStore.activeAgentContext;
  cancelDebouncedUpdateStore();
  if (activeContext && internalRequirement.value !== activeContext.requirement) {
    activeContextStore.updateRequirementForContext(activeContext, internalRequirement.value);
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

const handleStop = () => {
  try {
    activeContextStore.stopGeneration();
  } catch (error) {
    console.error('Error stopping generation:', error);
  }
};

const handlePrimaryAction = () => {
  if (isSending.value) {
    handleStop();
    return;
  }
  void handleSend();
};

const handleVoiceAction = async () => {
  try {
    await voiceInputStore.toggleRecording();
  } catch (error) {
    console.error('Error toggling voice input:', error);
  }
};

const insertFilePaths = (
  filePaths: string[],
  targetContext: AgentContext | null = activeContextStore.activeAgentContext,
) => {
  if (!targetContext || filePaths.length === 0) return;

  const textToInsert = filePaths.join(' ');
  const isTargetStillActive = activeContextStore.activeAgentContext === targetContext;
  const baseRequirement = isTargetStillActive ? internalRequirement.value : targetContext.requirement;
  const start = isTargetStillActive && textarea.value ? textarea.value.selectionStart : baseRequirement.length;
  const end = isTargetStillActive && textarea.value ? textarea.value.selectionEnd : baseRequirement.length;
  const newText = baseRequirement.substring(0, start) + textToInsert + baseRequirement.substring(end);

  activeContextStore.updateRequirementForContext(targetContext, newText);

  if (!isTargetStillActive) {
    return;
  }

  internalRequirement.value = newText;
  nextTick(adjustTextareaHeight);

  nextTick(() => {
    if (textarea.value && activeContextStore.activeAgentContext === targetContext) {
      const newCursorPos = start + textToInsert.length;
      textarea.value.focus();
      textarea.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  });
};

const handleDrop = async (event: DragEvent) => {
  const targetContext = activeContextStore.activeAgentContext;
  if (!targetContext) return;

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

  insertFilePaths(filePaths, targetContext);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    handlePrimaryAction();
  }
};

const handleResize = () => {
  adjustTextareaHeight();
};

const stopRecordingTimer = () => {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
};

watch(
  () => voiceInputStore.isRecording,
  (isRecording) => {
    stopRecordingTimer();
    if (!isRecording) {
      recordingElapsedSeconds.value = 0;
      return;
    }

    recordingStartedAt = Date.now();
    recordingElapsedSeconds.value = 0;
    recordingTimer = setInterval(() => {
      recordingElapsedSeconds.value = Math.floor((Date.now() - recordingStartedAt) / 1000);
    }, 250);
  },
);

onMounted(async () => {
  await nextTick();
  await voiceInputStore.initialize();
  adjustTextareaHeight();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  flushDebouncedUpdateStore();
  void voiceInputStore.cleanup();
  stopRecordingTimer();
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
