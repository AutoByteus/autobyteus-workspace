<template>
  <!-- Messages (UIS-006, VIS-010, 027): the messages between the open member and its Team's or Org's other members,
       with their file references; a reference opens full screen (a history entry, so Back closes it first). -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-messages">
    <MobileScreenBar title="Messages" @back="$emit('back')" />
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
      <!-- The source's loading and unavailable states (autobyteus-358). -->
      <p v-if="!messagesView" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-messages-empty">No messages yet</p>
      <div v-else-if="messagesStatus?.state === 'error'" class="m-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-testid="mobile-team-messages-unavailable">
        <p class="font-semibold">{{ statusText.unavailable() }}</p>
        <p class="mt-1 break-words">{{ messagesStatus.error }}</p>
      </div>
      <p v-else-if="!messages.length && messagesStatus?.state !== 'loaded'" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-team-messages-loading">{{ statusText.loading() }}</p>
      <p v-else-if="!messages.length" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-messages-empty">No messages yet</p>
      <ul v-else>
        <li v-for="message in messages" :key="message.messageId" class="border-b border-slate-100 p-4" data-testid="mobile-team-message-row">
          <div class="flex items-baseline justify-between gap-3">
            <p class="min-w-0 truncate text-[0.9375rem] font-semibold text-slate-900">{{ counterpart(message) }}</p>
            <span class="flex-shrink-0 text-xs text-slate-400">{{ formatTime(message.createdAt) }}</span>
          </div>
          <p class="mt-1 whitespace-pre-wrap break-words text-[0.9375rem] leading-6 text-slate-700">{{ message.content }}</p>
          <button
            v-for="reference in message.referenceFiles"
            :key="reference.referenceId"
            type="button"
            class="mt-1 flex min-h-[2.75rem] w-full items-center gap-3 text-left active:bg-slate-50"
            data-testid="mobile-team-reference-row"
            @click="navigation.openMessageReference({ messageId: message.messageId, referenceId: reference.referenceId })"
          >
            <Icon :icon="referenceFileIcon(reference)" class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{{ referenceFileName(reference.path) }}</span>
          </button>
        </li>
      </ul>
    </div>

    <MobileTeamReferenceViewer
      v-if="openReference && messagesView"
      :content-path="messagesView.referenceContentPath(openReference.message.messageId, openReference.reference.referenceId)"
      :reference="openReference.reference"
      @close="navigation.back()"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Icon } from '@iconify/vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import MobileTeamReferenceViewer from '~/components/mobile/views/MobileTeamReferenceViewer.vue';
import { useMobileNavigation } from '~/composables/mobile/useMobileNavigation';
import { participantMessagesStatusText } from '~/services/collaborationMessages/participantMessagesStatusText';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';
import type { CollaborationMessagePerspectiveRow } from '~/types/workspace/collaborationMessagesContextView';
import { referenceFileIcon, referenceFileName } from '~/utils/teamCommunication/referenceFilePresentation';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget }>();
defineEmits<{ (event: 'back'): void }>();

const navigation = useMobileNavigation();
const messagesView = computed(() => ('collaborationMessages' in props.target ? props.target.collaborationMessages : null));
// The open member's messages are loaded when this screen shows them (autobyteus-358).
watch(messagesView, (view) => view?.loadMessages(), { immediate: true });
const messages = computed(() => messagesView.value?.listMessages() ?? []);
const messagesStatus = computed(() => messagesView.value?.messagesStatus() ?? null);
const statusText = participantMessagesStatusText();

/** The reference the route opens, while its message is listed. */
const openReference = computed(() => {
  const opened = navigation.openReference.value;
  if (!opened) return null;
  const message = messages.value.find((candidate) => candidate.messageId === opened.messageId);
  const reference = message?.referenceFiles.find((candidate) => candidate.referenceId === opened.referenceId);
  return message && reference ? { message, reference } : null;
});

const counterpart = (message: CollaborationMessagePerspectiveRow): string =>
  `${message.direction === 'sent' ? 'To' : 'From'} ${message.counterpart.label || 'teammate'}`;
const formatTime = (value: string): string => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
};
</script>
