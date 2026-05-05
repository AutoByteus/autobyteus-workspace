<template>
  <div class="flex h-full min-h-0 overflow-hidden bg-white">
    <div v-if="!teamRunId || !focusedMemberRunId" class="flex flex-1 items-center justify-center p-4 text-center text-sm text-gray-400">
      {{ $t('workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member') }}
    </div>

    <div v-else-if="perspective.messages.length === 0" class="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-400">
      <Icon icon="heroicons:chat-bubble-left-right" class="mb-2 h-9 w-9 text-gray-300" />
      <p class="text-sm font-medium text-gray-500">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_title') }}</p>
      <p class="mt-1 text-sm">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_detail') }}</p>
    </div>

    <div v-else class="flex min-h-0 flex-1 overflow-hidden" data-test="team-communication-split">
      <aside
        class="min-h-0 shrink-0 overflow-y-auto border-r border-gray-200 py-2"
        :style="{ width: `${leftPaneWidth}px` }"
        data-test="team-communication-left-list"
      >
        <template v-for="section in sections" :key="section.key">
          <section v-if="section.messages.length > 0" class="py-1" :data-test="`team-communication-${section.key}`">
            <div
              v-for="message in section.messages"
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
                      <div class="min-w-0 truncate">
                        <span class="text-sm font-semibold" :class="isMessageSelected(message) ? 'text-blue-700' : 'text-gray-800'">
                          {{ compactMessageLabel(message) }}
                        </span>
                        <span class="ml-1 text-xs text-gray-500">
                          · {{ counterpartMetadata(message) }}
                        </span>
                      </div>
                      <span class="shrink-0 text-xs text-gray-400">{{ formatTimestamp(message.createdAt) }}</span>
                    </div>
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
        </template>
      </aside>

      <div
        class="w-1 shrink-0 cursor-col-resize bg-gray-100 transition-colors hover:bg-blue-200"
        role="separator"
        aria-orientation="vertical"
        data-test="team-communication-resize-handle"
        @mousedown="startResize"
      />

      <main class="min-h-0 min-w-0 flex-1 overflow-hidden" data-test="team-communication-detail-pane">
        <div v-if="selectedType === 'reference' && selectedMessage && selectedReference" class="h-full">
          <TeamCommunicationReferenceViewer
            :team-run-id="teamRunId"
            :message-id="selectedMessage.messageId"
            :reference="selectedReference"
            :refresh-signal="referenceRefreshSignal"
          />
        </div>
        <div v-else-if="selectedMessage" class="h-full overflow-y-auto p-4">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
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
              </div>
            </div>
            <span class="shrink-0 text-xs text-gray-400">{{ formatTimestamp(selectedMessage.createdAt) }}</span>
          </div>
          <MarkdownRenderer
            :content="selectedMessage.content"
            class="team-communication-message-markdown text-base leading-7 text-gray-700"
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTeamCommunicationStore, type TeamCommunicationPerspectiveMessage, type TeamCommunicationReferenceFile } from '~/stores/teamCommunicationStore';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import TeamCommunicationReferenceViewer from './TeamCommunicationReferenceViewer.vue';

const props = defineProps<{
  teamRunId: string;
  focusedMemberRunId: string;
  focusedMemberName?: string | null;
}>();

const { t } = useLocalization();
const teamCommunicationStore = useTeamCommunicationStore();
const selectedMessageId = ref<string | null>(null);
const selectedReferenceId = ref<string | null>(null);
const selectedType = ref<'message' | 'reference'>('message');
const referenceRefreshSignal = ref(0);
const leftPaneWidth = ref(232);
let removeResizeListeners: (() => void) | null = null;

const perspective = computed(() =>
  teamCommunicationStore.getPerspectiveForMember(props.teamRunId, props.focusedMemberRunId),
);
const sections = computed(() => [
  {
    key: 'sent',
    label: t('workspace.components.workspace.team.TeamCommunicationPanel.sent_messages'),
    messages: perspective.value.messages.filter((message) => message.direction === 'sent'),
  },
  {
    key: 'received',
    label: t('workspace.components.workspace.team.TeamCommunicationPanel.received_messages'),
    messages: perspective.value.messages.filter((message) => message.direction === 'received'),
  },
]);
const selectedMessage = computed(() =>
  perspective.value.messages.find((message) => message.messageId === selectedMessageId.value) || null,
);
const selectedReference = computed(() =>
  selectedMessage.value?.referenceFiles.find((reference) => reference.referenceId === selectedReferenceId.value) || null,
);

const compactMessageLabel = (message: TeamCommunicationPerspectiveMessage): string => {
  const normalized = (message.messageType || 'agent_message').trim();
  if (!normalized || normalized === 'agent_message') {
    return 'Message';
  }
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const counterpartMetadata = (message: TeamCommunicationPerspectiveMessage): string => {
  return message.direction === 'sent'
    ? `${t('workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart')} ${counterpartName(message)}`
    : `${t('workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart')} ${counterpartName(message)}`;
};
const counterpartName = (message: TeamCommunicationPerspectiveMessage): string =>
  message.counterpartMemberName || message.counterpartRunId || t('workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate');
const referenceFileName = (filePath: string): string => filePath.split('/').pop() || filePath;
const fileExtension = (filePath: string): string => {
  const name = referenceFileName(filePath).toLowerCase();
  const parts = name.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
};
const referenceFileIcon = (reference: TeamCommunicationReferenceFile): string => {
  const ext = fileExtension(reference.path);
  if (['.js', '.jsx', '.cjs', '.mjs'].includes(ext)) return 'vscode-icons:file-type-js';
  if (['.ts', '.tsx'].includes(ext)) return 'vscode-icons:file-type-typescript';
  if (ext === '.vue') return 'vscode-icons:file-type-vue';
  if (['.html', '.htm'].includes(ext)) return 'vscode-icons:file-type-html';
  if (['.css', '.scss', '.less'].includes(ext)) return 'vscode-icons:file-type-css';
  if (['.md', '.markdown'].includes(ext)) return 'vscode-icons:file-type-markdown';
  if (ext === '.json') return 'vscode-icons:file-type-json';
  if (ext === '.py') return 'vscode-icons:file-type-python';
  if (['.yaml', '.yml'].includes(ext)) return 'vscode-icons:file-type-yaml';
  if (['.sh', '.bash', '.zsh'].includes(ext)) return 'vscode-icons:file-type-shell';
  if (ext === '.xml') return 'vscode-icons:file-type-xml';
  if (ext === '.pdf' || reference.type === 'pdf') return 'vscode-icons:file-type-pdf';
  if (['.xlsx', '.xls', '.csv'].includes(ext) || reference.type === 'excel' || reference.type === 'csv') return 'vscode-icons:file-type-excel';
  if (['.txt', '.log'].includes(ext)) return 'vscode-icons:file-type-text';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext) || reference.type === 'image') return 'vscode-icons:file-type-image';
  if (['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'].includes(ext) || reference.type === 'audio') return 'vscode-icons:file-type-audio';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext) || reference.type === 'video') return 'vscode-icons:file-type-video';
  return 'vscode-icons:default-file';
};
const directionIcon = (message: TeamCommunicationPerspectiveMessage): string =>
  message.direction === 'sent' ? 'heroicons:paper-airplane' : 'heroicons:inbox-arrow-down';
const directionIconClass = (message: TeamCommunicationPerspectiveMessage): string =>
  message.direction === 'sent' ? 'text-blue-500' : 'text-emerald-500';
const isMessageSelected = (message: TeamCommunicationPerspectiveMessage): boolean =>
  selectedMessageId.value === message.messageId;
const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const selectMessage = (message: TeamCommunicationPerspectiveMessage) => {
  selectedMessageId.value = message.messageId;
  selectedReferenceId.value = null;
  selectedType.value = 'message';
};

const selectReference = (
  message: TeamCommunicationPerspectiveMessage,
  reference: TeamCommunicationReferenceFile,
) => {
  if (selectedMessageId.value === message.messageId && selectedReferenceId.value === reference.referenceId) {
    referenceRefreshSignal.value += 1;
  }
  selectedMessageId.value = message.messageId;
  selectedReferenceId.value = reference.referenceId;
  selectedType.value = 'reference';
};

const stopResize = () => {
  removeResizeListeners?.();
  removeResizeListeners = null;
};

const startResize = (event: MouseEvent) => {
  if (typeof window === 'undefined') return;
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = leftPaneWidth.value;
  const onMove = (moveEvent: MouseEvent) => {
    const nextWidth = Math.min(360, Math.max(168, startWidth + moveEvent.clientX - startX));
    leftPaneWidth.value = nextWidth;
  };
  const onUp = () => stopResize();
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp, { once: true });
  removeResizeListeners = () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
};

watch(
  () => perspective.value.messages.map((message) => message.messageId).join('\n'),
  () => {
    if (perspective.value.messages.length === 0) {
      selectedMessageId.value = null;
      selectedReferenceId.value = null;
      selectedType.value = 'message';
      return;
    }
    if (!selectedMessage.value) {
      selectedMessageId.value = perspective.value.messages[0].messageId;
      selectedReferenceId.value = null;
      selectedType.value = 'message';
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => stopResize());
</script>

<style scoped>
.team-communication-message-markdown :deep(.markdown-body) {
  font-size: 1rem;
  line-height: 1.5rem;
  color: rgb(17 24 39);
}

.team-communication-message-markdown :deep(.markdown-body > :first-child) {
  margin-top: 0;
}

.team-communication-message-markdown :deep(.markdown-body > :last-child) {
  margin-bottom: 0;
}
</style>
