<template>
  <div class="p-4 bg-gray-100 rounded-lg">
    <div v-if="displayedAttachments.length" class="space-y-2">
      <strong>Context Files:</strong>
      <ul class="flex flex-wrap gap-2 text-sm">
        <li v-for="item in displayedAttachments" :key="item.attachment.id">
          <button
            type="button"
            :class="
              item.previewUrl
                ? 'message-attachment-thumbnail-button h-12 w-12 overflow-hidden rounded-md border border-sky-200 bg-sky-50 hover:bg-sky-100'
                : 'message-attachment-chip px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
            "
            :title="item.label"
            :aria-label="`Open ${item.label}`"
            @click="handleAttachmentClick(item)"
          >
            <img
              v-if="item.previewUrl"
              :src="item.previewUrl"
              :alt="item.label"
              class="message-attachment-thumbnail h-full w-full object-cover"
              @error="markAttachmentPreviewAsFailed(item.attachment.id)"
            />
            <span v-else>{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </div>
    <div class="mt-2">
      <strong>You:</strong>
      <div class="whitespace-pre-wrap">{{ message.text }}</div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import { contextAttachmentPresentation } from '~/utils/contextFiles/contextAttachmentPresentation';

const props = defineProps<{
  message: UserMessage;
}>();

const fileExplorerStore = useFileExplorerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const workspaceStore = useWorkspaceStore();
const failedAttachmentPreviewKeys = ref(new Set<string>());
const workspaceId = computed(() => workspaceStore.activeWorkspace?.workspaceId ?? null);
const isEmbeddedElectronRuntime = computed(
  () => windowNodeContextStore.isEmbeddedWindow && typeof window !== 'undefined' && Boolean(window.electronAPI),
);
const displayedAttachments = computed(() =>
  (props.message.contextFilePaths ?? []).map((attachment) => ({
    attachment,
    label: contextAttachmentPresentation.getDisplayLabel(attachment),
    previewUrl: contextAttachmentPresentation.resolveImagePreviewUrl(attachment, {
      workspaceId: workspaceId.value,
      isEmbeddedElectronRuntime: isEmbeddedElectronRuntime.value,
      failedKeys: failedAttachmentPreviewKeys.value,
    }),
  })),
);

watch(
  () => (props.message.contextFilePaths ?? []).map((attachment) => attachment.id),
  (attachmentIds) => {
    const activeIds = new Set(attachmentIds);
    const nextFailedKeys = Array.from(failedAttachmentPreviewKeys.value).filter((key) => activeIds.has(key));
    if (nextFailedKeys.length !== failedAttachmentPreviewKeys.value.size) {
      failedAttachmentPreviewKeys.value = new Set(nextFailedKeys);
    }
  },
);

const markAttachmentPreviewAsFailed = (attachmentId: string): void => {
  if (failedAttachmentPreviewKeys.value.has(attachmentId)) {
    return;
  }
  failedAttachmentPreviewKeys.value = new Set([...failedAttachmentPreviewKeys.value, attachmentId]);
};

const handleAttachmentClick = (item: (typeof displayedAttachments.value)[number]): void => {
  openAttachment(item.attachment);
};

const openAttachment = (attachment: ContextAttachment): void => {
  contextAttachmentPresentation.openAttachment(attachment, {
    workspaceId: workspaceId.value,
    isEmbeddedElectronRuntime: isEmbeddedElectronRuntime.value,
    failedKeys: failedAttachmentPreviewKeys.value,
    preferFileViewerForPreviewableImages: true,
    openWorkspaceFile: (locator, resolvedWorkspaceId) => fileExplorerStore.openFile(locator, resolvedWorkspaceId),
    openFilePreview: (url, resolvedWorkspaceId) => fileExplorerStore.openFilePreview(url, resolvedWorkspaceId),
  });
};
</script>
