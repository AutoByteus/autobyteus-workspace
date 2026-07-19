<template>
  <main id="api-e2e-local-preview">
    <section id="video-subject">
      <VideoPlayer :url="videoUrl" />
    </section>
    <section id="file-subject">
      <FileViewer
        v-if="file"
        :file="file"
        mode="preview"
        :read-only="true"
      />
    </section>
    <section id="message-subject">
      <UserMessage v-if="message" :message="message" />
    </section>
    <section id="normalization-subject" />
  </main>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import FileViewer from '~/components/fileExplorer/FileViewer.vue';
import VideoPlayer from '~/components/fileExplorer/viewers/VideoPlayer.vue';
import UserMessage from '~/components/conversation/UserMessage.vue';
import type { ContextAttachment, UserMessage as UserMessageType } from '~/types/conversation';
import type { FileDataType } from '~/stores/fileExplorerState';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import { contextAttachmentPresentation } from '~/utils/contextFiles/contextAttachmentPresentation';
import { planContextAttachmentSubmission } from '~/utils/contextFiles/contextAttachmentSend';
import { handleMemberInputMessage } from '~/services/agentStreaming/handlers/memberInputMessageHandler';

definePageMeta({ layout: false });

const videoUrl = ref<string | null>(null);
const file = ref<{
  path: string;
  type: FileDataType;
  content: string | null;
  url: string | null;
} | null>(null);
const message = ref<UserMessageType | null>(null);

const attachmentSummary = (attachment: ContextAttachment) => ({
  kind: attachment.kind,
  id: attachment.id,
  locator: attachment.locator,
  displayName: attachment.displayName,
  type: attachment.type,
  isOpenable: contextAttachmentPresentation.isOpenable(attachment),
  previewUrl: contextAttachmentPresentation.resolveImagePreviewUrl(attachment, {
    isEmbeddedElectronRuntime: true,
  }),
});

onMounted(() => {
  (window as any).__apiE2ELocalPreview = {
    setVideoUrl: (value: string | null) => {
      videoUrl.value = value;
    },
    setFile: (value: typeof file.value) => {
      file.value = value;
    },
    runAttachmentLifecycle: async (input: {
      canonicalImage: string;
      legacyPosix: string;
      legacyWindows: string;
      embeddedImagePath: string;
      invalidLocators: string[];
    }) => {
      const canonicalImage = hydrateContextAttachment({ locator: input.canonicalImage, type: 'Image' });
      const validMarkdown = hydrateContextAttachment({ locator: '/tmp/current.md', type: 'Markdown' });
      const unsupported = hydrateContextAttachment({
        locator: 'local-file://opaque/image.png',
        type: 'Image',
        displayName: 'opaque image.png',
      });
      const canonicalHydration = hydrateContextAttachment({ locator: input.canonicalImage, type: 'Image' });
      const legacyPosix = hydrateContextAttachment({ locator: input.legacyPosix, type: 'Image' });
      const legacyWindows = hydrateContextAttachment({ locator: input.legacyWindows, type: 'Video' });
      const invalid = input.invalidLocators.map((locator) => attachmentSummary(
        hydrateContextAttachment({ locator, type: 'Image' }),
      ));
      const nonLocal = hydrateContextAttachment({ locator: 'https://cdn.example/current.png', type: 'Image' });
      const plan = planContextAttachmentSubmission([
        validMarkdown,
        canonicalImage,
        unsupported,
      ]);

      const currentContext: any = {
        conversation: {
          messages: [{
            type: 'user',
            text: 'current local message',
            timestamp: new Date('2026-07-19T00:00:00.000Z'),
            messageId: 'msg-current',
            dedupeKey: 'dedupe-current',
            contextFilePaths: [validMarkdown, unsupported],
          }],
        },
        isSending: false,
      };
      handleMemberInputMessage({
        content: 'identity-matched empty echo',
        message_id: 'msg-current',
        dedupe_key: 'dedupe-current',
        context_file_paths: [],
      }, currentContext);
      const emptyEcho = currentContext.conversation.messages[0].contextFilePaths.map(attachmentSummary);
      handleMemberInputMessage({
        content: 'identity-matched mixed echo',
        message_id: 'msg-current',
        dedupe_key: 'dedupe-current',
        context_file_paths: [
          { path: '/tmp/refreshed.md', type: 'markdown' },
          { path: input.canonicalImage, type: 'image' },
        ],
      }, currentContext);
      const mixedEcho = currentContext.conversation.messages[0].contextFilePaths.map(attachmentSummary);
      message.value = currentContext.conversation.messages[0];

      const historicalContext: any = { conversation: { messages: [] }, isSending: false };
      handleMemberInputMessage({
        content: 'historical unsupported row',
        message_id: 'msg-history',
        context_file_paths: [{ path: 'local-file://opaque/history.png', type: 'image' }],
      }, historicalContext);

      const freshContext: any = { conversation: { messages: [] }, isSending: false };
      handleMemberInputMessage({
        content: 'fresh durable projection',
        message_id: 'msg-fresh',
        context_file_paths: [
          ...plan.executable.contextFilePaths.map((path) => ({ path, type: 'markdown' })),
          ...plan.executable.imageUrls.map((path) => ({ path, type: 'image' })),
        ],
      }, freshContext);

      const embedded = hydrateContextAttachment({ locator: input.embeddedImagePath, type: 'Image' });
      await nextTick();
      return {
        canonicalHydration: attachmentSummary(canonicalHydration),
        legacyPosix: attachmentSummary(legacyPosix),
        legacyWindows: attachmentSummary(legacyWindows),
        invalid,
        nonLocal: attachmentSummary(nonLocal),
        embeddedImage: attachmentSummary(embedded),
        plan: {
          retained: plan.retainedMessageAttachments.map(attachmentSummary),
          executable: plan.executable,
        },
        optimisticCurrent: [validMarkdown, unsupported, canonicalImage].map(attachmentSummary),
        emptyEcho,
        mixedEcho,
        historicalReload: historicalContext.conversation.messages[0].contextFilePaths.map(attachmentSummary),
        freshReload: freshContext.conversation.messages[0].contextFilePaths.map(attachmentSummary),
      };
    },
    removeMessageAttachment: async (id: string) => {
      if (!message.value) return [];
      message.value = {
        ...message.value,
        contextFilePaths: (message.value.contextFilePaths ?? []).filter((item) => item.id !== id),
      };
      await nextTick();
      return (message.value.contextFilePaths ?? []).map(attachmentSummary);
    },
  };
});
</script>

<style scoped>
#api-e2e-local-preview {
  width: 920px;
  min-height: 1020px;
}
#video-subject,
#file-subject {
  width: 880px;
  height: 320px;
}
#message-subject {
  width: 880px;
  min-height: 120px;
  padding: 12px;
}
</style>
