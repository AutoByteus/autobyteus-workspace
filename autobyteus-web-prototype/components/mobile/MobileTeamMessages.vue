<template>
  <section class="space-y-2" data-testid="mobile-team-messages-detail">
    <article v-if="!activeTeamContext" class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
      Select a team run to see team messages.
    </article>
    <article v-else-if="!messages.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No team messages yet for the focused member.
    </article>
    <template v-else>
      <article
        v-for="message in messages.slice(0, 8)"
        :key="message.messageId"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-3"
        data-testid="mobile-team-message-row"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-semibold text-slate-900">{{ messageLabel(message) }}</p>
          <span class="shrink-0 text-xs text-slate-500">{{ formatTime(message.createdAt) }}</span>
        </div>
        <p class="mt-1 text-xs font-semibold text-slate-500">{{ counterpart(message) }}</p>
        <p class="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-slate-700">{{ message.content }}</p>

        <div v-if="message.referenceFiles.length" class="mt-3 space-y-2" data-testid="mobile-team-reference-list">
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {{ message.referenceFiles.length }} reference file{{ message.referenceFiles.length === 1 ? '' : 's' }}
          </p>
          <button
            v-for="reference in message.referenceFiles"
            :key="reference.referenceId"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            data-testid="mobile-team-reference-row"
            @click="openReference(message, reference)"
          >
            <Icon :icon="referenceFileIcon(reference)" class="h-5 w-5 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-slate-900">{{ referenceFileName(reference.path) }}</span>
              <span class="block truncate text-xs text-slate-500">{{ reference.path }}</span>
            </span>
            <span class="shrink-0 text-xs font-semibold text-blue-700">Open</span>
          </button>
        </div>
      </article>
    </template>

    <MobileTeamReferenceViewer
      v-if="selectedReferenceContext && activeTeamContext"
      :team-run-id="activeTeamContext.view.getRootTeamRunId()"
      :message-id="selectedReferenceContext.message.messageId"
      :reference="selectedReferenceContext.reference"
      :refresh-signal="referenceRefreshSignal"
      @close="selectedReferenceContext = null"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import MobileTeamReferenceViewer from '~/components/mobile/MobileTeamReferenceViewer.vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type {
  TeamCommunicationPerspectiveMessage,
  TeamCommunicationReferenceFile,
} from '~/stores/teamCommunicationTypes';
import type { MobileWorkContext } from '~/types/mobileWork';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamCommunication/referenceFilePresentation';
import { projectTeamCommunicationPerspective } from '~/utils/teamCommunication/teamCommunicationPerspective';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const selectionStore = useAgentSelectionStore();
const teamContextsStore = useAgentTeamContextsStore();
const selectedReferenceContext = ref<{
  message: TeamCommunicationPerspectiveMessage;
  reference: TeamCommunicationReferenceFile;
} | null>(null);
const referenceRefreshSignal = ref(0);

const activeTeamContext = computed(() => {
  if (props.context?.kind !== 'team-run') return null;
  if (selectionStore.selectedType !== 'team' || selectionStore.selectedRunId !== props.context.teamRunId) return null;
  return teamContextsStore.getTeamContextById(props.context.teamRunId) ?? null;
});
const messages = computed(() => {
  const team = activeTeamContext.value;
  if (!team) return [];
  return projectTeamCommunicationPerspective({
    view: team.view,
    messages: team.view.listCommunicationMessages(),
    focusedAgentRunId: team.view.getFocusedAgentRunId(),
  }).messages;
});

function openReference(
  message: TeamCommunicationPerspectiveMessage,
  reference: TeamCommunicationReferenceFile,
): void {
  if (
    selectedReferenceContext.value?.message.messageId === message.messageId
    && selectedReferenceContext.value.reference.referenceId === reference.referenceId
  ) {
    referenceRefreshSignal.value += 1;
  }
  selectedReferenceContext.value = { message, reference };
}

function messageLabel(message: TeamCommunicationPerspectiveMessage): string {
  const raw = (message.messageType || 'message').replace(/[_-]+/g, ' ');
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function counterpart(message: TeamCommunicationPerspectiveMessage): string {
  const name = message.counterpartLabel || 'teammate';
  return message.direction === 'sent' ? `To ${name}` : `From ${name}`;
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>
