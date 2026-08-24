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
        <TeamCommunicationReferenceViewer
          :team-run-id="teamRunId"
          :message-id="messageId"
          :reference="reference"
          :refresh-signal="refreshSignal"
          :disable-rich-text-preview="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import TeamCommunicationReferenceViewer from '~/components/workspace/team/TeamCommunicationReferenceViewer.vue';
import type { TeamCommunicationReferenceFile } from '~/stores/teamCommunicationTypes';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamCommunication/referenceFilePresentation';

defineProps<{
  teamRunId: string;
  messageId: string;
  reference: TeamCommunicationReferenceFile;
  refreshSignal?: number;
}>();

defineEmits<{
  close: [];
}>();
</script>
