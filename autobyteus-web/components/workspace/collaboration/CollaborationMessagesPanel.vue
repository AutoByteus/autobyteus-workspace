<template>
  <div class="flex h-full min-h-0 overflow-hidden bg-white">
    <div v-if="!teamRunId || !hasFocusedMemberIdentity" class="flex flex-1 items-center justify-center p-4 text-center text-sm text-gray-400">
      {{ $t('workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member') }}
    </div>

    <div v-else-if="displayMessages.length === 0" class="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-400">
      <Icon icon="heroicons:chat-bubble-left-right" class="mb-2 h-9 w-9 text-gray-300" />
      <p class="text-sm font-medium text-gray-500">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_title') }}</p>
      <p class="mt-1 text-sm">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_detail') }}</p>
    </div>

    <div v-else class="collaboration-message-split flex min-h-0 flex-1 overflow-hidden" data-test="team-communication-split">
      <aside
        class="collaboration-message-list min-h-0 shrink-0 overflow-y-auto border-r border-gray-200 pb-2"
        :style="{ width: `${leftPaneWidth}px` }"
        data-test="team-communication-left-list"
      >
        <section class="pb-1" data-test="team-communication-message-list">
          <div
            v-for="message in displayMessages"
            :key="message.messageId"
            class="border-l-2 transition-colors"
            :class="isMessageSelected(message) ? 'border-blue-500 bg-blue-50' : 'border-transparent'"
            data-test="team-communication-message-row"
          >
            <button
              class="w-full px-3 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50"
              data-test="team-communication-message-summary"
              @click="selectMessage(message)"
            >
              <div class="flex items-start gap-2">
                <Icon
                  :icon="directionIcon(message)"
                  class="mt-0.5 h-4 w-4 shrink-0"
                  :class="directionIconClass(message)"
                  data-test="team-communication-direction-icon"
                  :data-icon="directionIcon(message)"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="min-w-0 truncate text-sm font-semibold" :class="isMessageSelected(message) ? 'text-blue-700' : 'text-gray-800'">
                      {{ compactMessageLabel(message) }}
                    </span>
                    <span class="shrink-0 text-xs text-gray-400">{{ formatTimestamp(message.createdAt) }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-gray-500">
                    {{ counterpartMetadata(message) }}
                  </p>
                  <p class="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-5 text-gray-600">
                    {{ message.content }}
                  </p>
                </div>
              </div>
            </button>
            <div v-if="message.referenceFiles.length" class="space-y-1 px-3 pb-2 pl-9">
              <button
                v-for="reference in message.referenceFiles"
                :key="reference.referenceId"
                class="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-white focus:outline-none focus-visible:bg-white"
                :class="selectedReferenceId === reference.referenceId && selectedMessageId === message.messageId ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'"
                data-test="team-communication-reference-row"
                @click="selectReference(message, reference)"
              >
                <Icon
                  :icon="referenceFileIcon(reference)"
                  class="h-4 w-4 shrink-0"
                  data-test="team-communication-reference-icon"
                  :data-icon="referenceFileIcon(reference)"
                />
                <span class="truncate">{{ referenceFileName(reference.path) }}</span>
              </button>
            </div>
          </div>
        </section>
      </aside>

      <div
        class="collaboration-message-resize-handle w-1 shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-blue-200"
        role="separator"
        aria-orientation="vertical"
        data-test="team-communication-resize-handle"
        @mousedown="startResize"
      />

      <main class="collaboration-message-detail min-h-0 min-w-0 flex-1 overflow-hidden" data-test="team-communication-detail-pane">
        <div v-if="selectedType === 'reference' && selectedMessage && selectedReference" class="h-full">
          <CollaborationMessageReferenceViewer
            :content-path="messages.referenceContentPath(selectedMessage.messageId, selectedReference.referenceId)"
            :reference="selectedReference"
            :refresh-signal="referenceRefreshSignal"
          />
        </div>
        <div v-else-if="selectedMessage" class="h-full overflow-y-auto p-4">
          <div class="mb-3">
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div class="flex min-w-0 max-w-full items-center gap-2">
                <Icon
                  :icon="directionIcon(selectedMessage)"
                  class="h-4 w-4 shrink-0"
                  :class="directionIconClass(selectedMessage)"
                />
                <span class="truncate text-base font-semibold text-gray-900">{{ compactMessageLabel(selectedMessage) }}</span>
                <span class="flex min-w-0 items-center gap-1 text-sm text-gray-500">
                  <Icon
                    :icon="selectedMessage.direction === 'sent' ? 'heroicons:arrow-right' : 'heroicons:arrow-left'"
                    class="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span class="truncate">{{ counterpartName(selectedMessage) }}</span>
                </span>
                <button type="button" class="shrink-0 rounded p-1 text-gray-400 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500"
                  :aria-label="t('workspace.collaboration.identity.details')" :aria-expanded="identityOpen" :aria-controls="identityId"
                  data-test="message-identity-toggle" @click="identityOpen = !identityOpen">
                  <Icon icon="heroicons:information-circle" class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <span class="shrink-0 text-xs text-gray-400">{{ formatTimestamp(selectedMessage.createdAt) }}</span>
            </div>
            <div v-if="identityOpen" :id="identityId" class="mt-2 space-y-1 break-all rounded bg-gray-50 p-2 text-xs text-gray-600" data-test="message-identity-detail">
              <p>{{ t('workspace.collaboration.identity.address') }}: {{ selectedMessage.counterpart.address }}</p>
              <p>{{ t('workspace.collaboration.identity.agentRun') }}: {{ selectedMessage.counterpartAgentRunId }}</p>
              <template v-if="selectedMessage.counterpart.kind === 'task'">
                <p>{{ t('workspace.collaboration.identity.task') }}: {{ selectedMessage.counterpart.taskId }}</p>
                <p>{{ t('workspace.collaboration.identity.hostRun') }}: {{ selectedMessage.counterpart.hostRunId }}</p>
                <p>{{ t('workspace.collaboration.identity.executionRun') }}: {{ selectedMessage.counterpart.executionRunId }}</p>
              </template>
            </div>
          </div>
          <MarkdownRenderer
            :content="selectedMessage.content"
            class="team-communication-message-markdown text-[0.9375rem] leading-6 text-gray-700"
            data-test="team-communication-message-markdown"
          />
        </div>
        <div v-else class="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
          {{ $t('workspace.components.workspace.team.TeamCommunicationPanel.select_message') }}
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, useId } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useHorizontalSplitResize } from '~/composables/useHorizontalSplitResize';
import type {
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import {
  referenceFileIcon,
  referenceFileName,
} from '~/utils/teamCommunication/referenceFilePresentation';
import CollaborationMessageReferenceViewer from './CollaborationMessageReferenceViewer.vue';

const props = defineProps<{
  messages: CollaborationMessagesContextView;
}>();

const { t } = useLocalization();
const identityOpen = ref(false);
const identityId = useId();
const selectedMessageId = ref<string | null>(null);
const selectedReferenceId = ref<string | null>(null);
const selectedType = ref<'message' | 'reference'>('message');
const referenceRefreshSignal = ref(0);
const { paneWidth: leftPaneWidth, startResize } = useHorizontalSplitResize({
  initialWidth: 232,
  minWidth: 168,
  maxWidth: 360,
});

const hasFocusedMemberIdentity = computed(() => Boolean(
  props.messages.focusedAgentRunId
    && props.messages.memberIdentityByAgentRunId()[props.messages.focusedAgentRunId],
));
const teamRunId = computed(() => props.messages.rootRunId);
const displayMessages = computed(() => props.messages.listMessages());
const selectedMessage = computed(() =>
  displayMessages.value.find((message) => message.messageId === selectedMessageId.value) || null,
);
const selectedReference = computed(() =>
  selectedMessage.value?.referenceFiles.find((reference) => reference.referenceId === selectedReferenceId.value) || null,
);

watch([() => props.messages.rootKind, () => props.messages.rootRunId, () => props.messages.focusedAgentRunId,
  () => props.messages.focusedMemberAddress, selectedMessageId, selectedReferenceId, selectedType],
() => { identityOpen.value = false; });

const compactMessageLabel = (message: CollaborationMessagePerspectiveRow): string => {
  const normalized = (message.messageType || 'agent_message').trim();
  if (!normalized || normalized === 'agent_message') {
    return 'Message';
  }
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const counterpartMetadata = (message: CollaborationMessagePerspectiveRow): string => {
  return message.direction === 'sent'
    ? `${t('workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart')} ${counterpartName(message)}`
    : `${t('workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart')} ${counterpartName(message)}`;
};
const counterpartName = (message: CollaborationMessagePerspectiveRow): string => {
  return message.counterpart.label || t('workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate');
};
const directionIcon = (message: CollaborationMessagePerspectiveRow): string =>
  message.direction === 'sent' ? 'heroicons:paper-airplane' : 'heroicons:inbox-arrow-down';
const directionIconClass = (message: CollaborationMessagePerspectiveRow): string =>
  message.direction === 'sent' ? 'text-blue-500' : 'text-emerald-500';
const isMessageSelected = (message: CollaborationMessagePerspectiveRow): boolean =>
  selectedMessageId.value === message.messageId;
const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const selectMessage = (message: CollaborationMessagePerspectiveRow) => {
  selectedMessageId.value = message.messageId;
  selectedReferenceId.value = null;
  selectedType.value = 'message';
};

const selectReference = (
  message: CollaborationMessagePerspectiveRow,
  reference: TeamReferenceFile,
) => {
  if (selectedMessageId.value === message.messageId && selectedReferenceId.value === reference.referenceId) {
    referenceRefreshSignal.value += 1;
  }
  selectedMessageId.value = message.messageId;
  selectedReferenceId.value = reference.referenceId;
  selectedType.value = 'reference';
};

watch(
  () => displayMessages.value.map((message) => message.messageId).join('\n'),
  () => {
    if (displayMessages.value.length === 0) {
      selectedMessageId.value = null;
      selectedReferenceId.value = null;
      selectedType.value = 'message';
      return;
    }
    if (!selectedMessage.value) {
      selectedMessageId.value = displayMessages.value[0].messageId;
      selectedReferenceId.value = null;
      selectedType.value = 'message';
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.team-communication-message-markdown :deep(.markdown-body) {
  font-size: 0.9375rem;
  line-height: 1.5rem;
  color: rgb(17 24 39);
}

.team-communication-message-markdown :deep(.markdown-body > :first-child) {
  margin-top: 0;
}

.team-communication-message-markdown :deep(.markdown-body > :last-child) {
  margin-bottom: 0;
}

@media (max-width: 639px) {
  .collaboration-message-split {
    flex-direction: column;
  }

  .collaboration-message-list {
    width: 100% !important;
    max-height: 48%;
    border-right: 0;
    border-bottom: 1px solid rgb(229 231 235);
  }

  .collaboration-message-resize-handle {
    display: none;
  }

  .collaboration-message-detail {
    min-height: 0;
  }
}
</style>
