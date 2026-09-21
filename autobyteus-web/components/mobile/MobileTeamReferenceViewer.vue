<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-white" data-testid="mobile-team-reference-viewer">
    <header class="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
      <button
        type="button"
        class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
        data-testid="mobile-team-reference-back"
        @click="$emit('close')"
      >
        Back
      </button>
      <Icon :icon="referenceFileIcon(reference)" class="h-5 w-5 shrink-0" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="truncate font-bold text-slate-950">{{ referenceFileName(reference.path) }}</p>
        <p class="truncate text-xs text-slate-500">{{ reference.path }}</p>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden bg-slate-50 p-3">
      <div class="h-full min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <CollaborationMessageReferenceViewer
          :content-path="contentPath"
          :reference="reference"
          :refresh-signal="refreshSignal"
          :disable-rich-text-preview="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import CollaborationMessageReferenceViewer from '~/components/workspace/collaboration/CollaborationMessageReferenceViewer.vue';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamCommunication/referenceFilePresentation';

const props = defineProps<{
  teamRunId: string;
  messageId: string;
  reference: TeamReferenceFile;
  refreshSignal?: number;
}>();

const contentPath = computed(() =>
  `team-runs/${encodeURIComponent(props.teamRunId)}/team-communication/messages/${encodeURIComponent(props.messageId)}/references/${encodeURIComponent(props.reference.referenceId)}/content`,
);

defineEmits<{
  close: [];
}>();
</script>
