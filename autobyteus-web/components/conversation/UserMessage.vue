<template>
  <div>
    <div class="flex items-start gap-3 pr-8">
      <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white border border-sky-200 flex items-center justify-center">
        <img
          v-if="showAvatarImage"
          :src="userAvatarUrl || ''"
          :alt="`${displayUserName} avatar`"
          class="h-full w-full object-cover"
          @error="avatarLoadError = true"
        />
        <svg v-else class="h-8 w-8 text-sky-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.86 0-7 2.24-7 5a1 1 0 1 0 2 0c0-1.42 2.22-3 5-3s5 1.58 5 3a1 1 0 1 0 2 0c0-2.76-3.14-5-7-5Z" />
        </svg>
      </div>

      <div class="min-w-0 flex-1 pt-0.5">
        <span class="sr-only">{{ displayUserName }}</span>
        <div class="whitespace-pre-wrap break-words text-gray-900 leading-6">{{ message.text }}</div>

        <div v-if="displayedAttachments.length" class="mt-2">
          <p class="text-xs font-medium text-gray-500">{{ $t('workspace.components.conversation.UserMessage.context_files') }}</p>
          <ul class="mt-1 flex flex-wrap gap-2">
            <li v-for="item in displayedAttachments" :key="item.attachment.id">
              <button
                type="button"
                :class="
                  item.previewUrl
                    ? 'message-attachment-thumbnail-button h-12 w-12 overflow-hidden rounded-md border border-sky-200 bg-sky-50 hover:bg-sky-100'
                    : 'message-attachment-chip max-w-full text-xs px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 truncate'
                "
                :title="`Open ${item.label}`"
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
      </div>
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
  userDisplayName?: string;
  userAvatarUrl?: string | null;
}>();

const fileExplorerStore = useFileExplorerStore();
const windowNodeContextStore = useWindowNodeContextStore();
const workspaceStore = useWorkspaceStore();
const avatarLoadError = ref(false);
const failedAttachmentPreviewKeys = ref(new Set<string>());

const displayUserName = computed(() => props.userDisplayName?.trim() || 'You');
const showAvatarImage = computed(() => Boolean(props.userAvatarUrl) && !avatarLoadError.value);
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

watch(() => props.userAvatarUrl, () => {
  avatarLoadError.value = false;
});

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
