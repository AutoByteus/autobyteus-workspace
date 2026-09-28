<template>
  <div class="flex flex-col bg-white">
    <div class="relative flex-grow">
      <textarea
        :value="internalRequirement"
        @input="handleInput"
        ref="textarea"
        class="w-full px-3 py-2.5 pr-14 border-0 focus:ring-0 focus:outline-none resize-none bg-transparent text-[0.9375rem] leading-6"
        :style="{
          height: `${textareaHeight}px`,
          minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
          maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
        }"
        :placeholder="$t('agentInput.components.agentInput.AgentUserInputTextArea.type_a_message')"
        @keydown="handleKeyDown"
        :disabled="!target"
        @dragover.prevent
        @drop.prevent="handleDrop"
        data-file-drop-target="true"
      ></textarea>

      <VoiceInputButton :target="target" class="absolute bottom-2 right-14" />

      <MessagePrimaryActionButton
        class="absolute bottom-2 right-2"
        :kind="primaryAction.kind === 'interrupt' ? 'interrupt' : 'send'"
        :disabled="isActionDisabled"
        @activate="handlePrimaryAction"
      />
    </div>

    <VoiceInputStatusRow class="mx-3 mb-2" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { getFilePathsFromFolder } from '~/utils/fileExplorer/fileUtils';
import type { TreeNode } from '~/utils/fileExplorer/TreeNode';
import type { AgentContext } from '~/types/agent/AgentContext';
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget';
import VoiceInputButton from '~/components/agentInput/VoiceInputButton.vue';
import VoiceInputStatusRow from '~/components/agentInput/VoiceInputStatusRow.vue';
import MessagePrimaryActionButton from '~/components/agentInput/MessagePrimaryActionButton.vue';

const props = defineProps<{
  target: ComposerTarget | null;
  beforeSend?: () => void | Promise<void>;
}>();

const windowNodeContextStore = useWindowNodeContextStore();
const contextFileUploadStore = useContextFileUploadStore();
const workspaceStore = useWorkspaceStore();
const internalRequirement = ref('');

const targetContext = computed<AgentContext | null>(() => props.target?.context ?? null);
const submissionPending = computed(() => targetContext.value?.submissionPending ?? false);

const primaryAction = computed(() => resolveAgentPrimaryAction({
  hasContext: Boolean(targetContext.value),
  status: targetContext.value?.state.currentStatus ?? AgentStatus.Offline,
  submissionPending: submissionPending.value,
  isUploading: contextFileUploadStore.isUploading,
  hasDraft: Boolean(internalRequirement.value.trim()),
}));
const isActionDisabled = computed(() => !primaryAction.value.enabled
  || props.target?.access === 'read_only');

// Local component state
const textarea = ref<HTMLTextAreaElement | null>(null);
const MIN_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 220;
const textareaHeight = ref(MIN_TEXTAREA_HEIGHT);
let pendingLocalAcknowledgementContext: AgentContext | null = null;

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

watch(
  targetContext,
  (context) => {
    syncInternalRequirement(context?.requirement ?? '');
  },
  { immediate: true },
);

watch(() => targetContext.value?.requirement ?? '', (requirement) => {
  syncInternalRequirement(requirement);
});

const syncPendingLocalAcknowledgement = () => {
  const context = targetContext.value;
  if (
    !pendingLocalAcknowledgementContext
    || context !== pendingLocalAcknowledgementContext
    || !submissionPending.value
  ) {
    return;
  }

  syncInternalRequirement(context.requirement);
  pendingLocalAcknowledgementContext = null;
};

watch(submissionPending, (pending) => {
  if (pending) {
    syncPendingLocalAcknowledgement();
  }
}, { flush: 'sync' });

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  internalRequirement.value = target.value;
  nextTick(adjustTextareaHeight);
  // The exact AgentContext owns every unsent edit, including deliberate clearing.
  // Do not buffer local-only state past submission or verified context replacement.
  if (targetContext.value) {
    targetContext.value.requirement = target.value;
  }
};

const handleSend = async () => {
  const target = props.target;
  if (!target) {
    return;
  }
  let submittedContext: AgentContext | null = null;
  try {
    if (props.beforeSend) {
      await props.beforeSend();
    }
    submittedContext = target.context;
    pendingLocalAcknowledgementContext = submittedContext;
    const sendPromise = target.send();
    syncPendingLocalAcknowledgement();
    await sendPromise;
  } catch (error) {
    console.error('Error sending requirement:', error);
  } finally {
    if (pendingLocalAcknowledgementContext === submittedContext) {
      pendingLocalAcknowledgementContext = null;
    }
  }
};

const handleStop = () => {
  try {
    void props.target?.interrupt?.();
  } catch (error) {
    console.error('Error interrupting generation:', error);
  }
};

const handlePrimaryAction = () => {
  const action = primaryAction.value;
  if (isActionDisabled.value) {
    return;
  }
  if (action.kind === 'interrupt') {
    handleStop();
    return;
  }
  void handleSend();
};

const insertFilePaths = (
  filePaths: string[],
  insertionContext: AgentContext | null = targetContext.value,
) => {
  if (!insertionContext || filePaths.length === 0) return;

  const textToInsert = filePaths.join(' ');
  const isTargetStillActive = targetContext.value === insertionContext;
  const baseRequirement = isTargetStillActive ? internalRequirement.value : insertionContext.requirement;
  const start = isTargetStillActive && textarea.value ? textarea.value.selectionStart : baseRequirement.length;
  const end = isTargetStillActive && textarea.value ? textarea.value.selectionEnd : baseRequirement.length;
  const newText = baseRequirement.substring(0, start) + textToInsert + baseRequirement.substring(end);

  insertionContext.requirement = newText;

  if (!isTargetStillActive) {
    return;
  }

  internalRequirement.value = newText;
  nextTick(adjustTextareaHeight);

  nextTick(() => {
    if (textarea.value && targetContext.value === insertionContext) {
      const newCursorPos = start + textToInsert.length;
      textarea.value.focus();
      textarea.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  });
};

const handleDrop = async (event: DragEvent) => {
  const dropContext = targetContext.value;
  if (!dropContext) return;

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

  insertFilePaths(filePaths, dropContext);
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

onMounted(async () => {
  await nextTick();
  adjustTextareaHeight();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
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
