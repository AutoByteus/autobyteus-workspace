<template>
  <!-- A file a message refers to, full screen (TR-009, VIS-011): a 48px bar (← and the name) and the file. -->
  <section class="fixed inset-0 z-30 flex h-[100dvh] flex-col bg-white" data-testid="mobile-team-reference-viewer">
    <MobileScreenBar :title="referenceFileName(reference.path)" @back="$emit('close')" />
    <div class="min-h-0 flex-1 overflow-hidden">
      <CollaborationMessageReferenceViewer
        :content-path="contentPath"
        :reference="reference"
        :disable-rich-text-preview="true"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import CollaborationMessageReferenceViewer from '~/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import { referenceFileName } from '~/utils/teamCommunication/referenceFilePresentation';

defineProps<{
  /** The read path of the reference's content, from the open target's messages view. */
  contentPath: string;
  reference: TeamReferenceFile;
}>();
defineEmits<{ close: [] }>();
</script>
