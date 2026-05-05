<template>
  <div class="flex h-full min-h-0 overflow-hidden bg-white">
    <div v-if="!teamRunId || !focusedMemberRunId" class="flex flex-1 items-center justify-center p-4 text-center text-xs text-gray-400">
      {{ $t('workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member') }}
    </div>

    <div v-else-if="perspective.messages.length === 0" class="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-400">
      <Icon icon="heroicons:chat-bubble-left-right" class="mb-2 h-9 w-9 text-gray-300" />
      <p class="text-sm font-medium text-gray-500">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_title') }}</p>
      <p class="mt-1 text-xs">{{ $t('workspace.components.workspace.team.TeamCommunicationPanel.empty_detail') }}</p>
    </div>

    <div v-else class="flex min-h-0 flex-1 overflow-hidden" data-test="team-communication-split">
      <aside
        class="min-h-0 shrink-0 overflow-y-auto border-r border-gray-200 py-2"
        :style="{ width: `${leftPaneWidth}px` }"
        data-test="team-communication-left-list"
      >
        <template v-for="section in sections" :key="section.key">
          <section v-if="section.groups.length > 0" class="mb-4" :data-test="`team-communication-${section.key}`">
            <h4 class="px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-widest text-gray-900">
              {{ section.label }}
            </h4>
            <div v-for="group in section.groups" :key="`${section.key}:${group.counterpartRunId}`" class="mb-2">
              <div class="px-3 pb-1 pt-1 text-xs font-semibold text-gray-700">
                {{ counterpartLabel(group) }}
              </div>
              <button
                v-for="message in group.messages"
                :key="message.messageId"
                class="w-full border-l-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
                :class="selectedMessageId === message.messageId && selectedType === 'message' ? 'border-blue-500 bg-blue-50' : 'border-transparent'"
                @click="selectMessage(message)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-xs font-semibold" :class="selectedMessageId === message.messageId ? 'text-blue-700' : 'text-gray-800'">
                    {{ compactMessageLabel(message) }}
                  </span>
                  <span class="shrink-0 text-[0.625rem] text-gray-400">{{ formatTimestamp(message.createdAt) }}</span>
                </div>
                <p class="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-snug text-gray-600">
                  {{ message.content }}
                </p>
                <div v-if="message.referenceFiles.length" class="mt-2 space-y-1">
                  <button
                    v-for="reference in message.referenceFiles"
                    :key="reference.referenceId"
                    class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[0.6875rem] hover:bg-white"
                    :class="selectedReferenceId === reference.referenceId && selectedMessageId === message.messageId ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'"
                    @click.stop="selectReference(message, reference)"
                  >
                    <Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span class="truncate">{{ referenceFileName(reference.path) }}</span>
                  </button>
                </div>
              </button>
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
          <div class="mb-2 text-sm font-semibold text-gray-900">{{ directionLabel(selectedMessage) }}</div>
          <div class="mb-3 flex flex-wrap gap-2 text-[0.6875rem] text-gray-500">
            <span>{{ selectedMessage.messageType }}</span>
            <span>{{ formatTimestamp(selectedMessage.createdAt) }}</span>
          </div>
          <pre class="whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{{ selectedMessage.content }}</pre>
        </div>
        <div v-else class="flex h-full items-center justify-center p-4 text-center text-xs text-gray-400">
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
import { useTeamCommunicationStore, type TeamCommunicationPerspectiveGroup, type TeamCommunicationPerspectiveMessage, type TeamCommunicationReferenceFile } from '~/stores/teamCommunicationStore';
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
    groups: perspective.value.sentGroups,
  },
  {
    key: 'received',
    label: t('workspace.components.workspace.team.TeamCommunicationPanel.received_messages'),
    groups: perspective.value.receivedGroups,
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

const counterpartLabel = (group: TeamCommunicationPerspectiveGroup): string =>
  group.counterpartMemberName
  || group.counterpartRunId
  || t('workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate');

const directionLabel = (message: TeamCommunicationPerspectiveMessage): string => {
  const counterpart = message.counterpartMemberName || message.counterpartRunId || t('workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate');
  return message.direction === 'sent'
    ? `${t('workspace.components.workspace.team.TeamCommunicationPanel.sent_to')} ${counterpart}`
    : `${t('workspace.components.workspace.team.TeamCommunicationPanel.received_from')} ${counterpart}`;
};
const referenceFileName = (filePath: string): string => filePath.split('/').pop() || filePath;
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
