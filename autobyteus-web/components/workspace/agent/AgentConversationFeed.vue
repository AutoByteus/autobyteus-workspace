<template>
  <div class="relative h-full min-h-0">
    <div
      :id="conversationScrollContainerId"
      class="h-full min-h-0 overflow-y-auto overscroll-contain"
      data-testid="agent-conversation-feed"
      @scroll="handleConversationScroll"
    >
      <div
        v-if="showBoundaryControl"
        class="sticky top-0 z-10 flex justify-center bg-white/95 px-3 py-2 backdrop-blur"
        :aria-busy="browseState === 'loading'"
      >
        <button
          v-if="canLoadEarlier && browseState !== 'loading' && browseState !== 'error'"
          type="button"
          class="min-h-9 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-testid="event-monitor-load-earlier"
          @click="requestEarlierPage"
        >
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.load_50_earlier') }}
        </button>
        <span v-else-if="browseState === 'loading'" class="text-sm text-slate-500" role="status">
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.loading_earlier') }}
        </span>
        <button
          v-else-if="browseState === 'error'"
          type="button"
          class="min-h-9 rounded-full border border-red-200 bg-white px-4 py-1.5 text-sm font-medium text-red-700"
          @click="requestEarlierPage"
        >
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.retry_earlier') }}
        </button>
        <span v-else-if="browseState === 'beginning'" class="text-sm text-slate-500" data-testid="event-monitor-active-beginning">
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.active_trace_beginning') }}
        </span>
        <button
          v-else-if="browseState === 'expired'"
          type="button"
          class="min-h-9 rounded-full border border-amber-200 bg-white px-4 py-1.5 text-sm font-medium text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          data-testid="event-monitor-expired-return"
          @click="jumpToLatest"
          @keydown="handleJumpKeydown"
        >
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.earlier_cursor_expired') }}
        </button>
      </div>
      <p v-if="browseState === 'error' && browseErrorMessage" class="px-4 pb-2 text-center text-xs text-red-600" role="alert">
        {{ browseErrorMessage }}
      </p>
      <p v-if="newerBrowseContentReleased" class="px-4 pb-2 text-center text-xs text-slate-500">
        {{ $t('workspace.components.workspace.agent.AgentConversationFeed.newer_browse_released') }}
      </p>
      <div class="rounded-xl bg-white">
      <template v-if="showBrowsePresentation">
        <div
          v-for="item in browseItems"
          :key="item.key"
          class="px-2 py-3 break-words"
        >
          <div
            v-if="item.kind === 'user'"
            :data-event-monitor-visual-key="item.visualId"
          >
            <UserMessage :message="item.message" user-display-name="You" />
          </div>
          <EventMonitorBrowseAssistantRow
            v-else-if="item.kind === 'assistant'"
            :visuals="item.visuals"
            :agent-name="agentName"
            :agent-avatar-url="agentAvatarUrl"
            :enable-event-monitor-file-actions="enableEventMonitorFileActions"
            @file-path-action="emit('file-path-action', $event)"
          />
          <div v-else :data-event-monitor-visual-key="item.visualId">
            <CompactionStatusRow :activity="item.activity" />
          </div>
        </div>
      </template>
      <template v-else>
      <div
        v-for="item in latestFeedItems"
        :key="item.key"
        class="px-2 py-3 break-words"
      >
        <template v-if="item.kind === 'message'">
          <div>
            <UserMessage
              v-if="item.message.type === 'user'"
              :message="item.message"
              user-display-name="You"
            />
            <AIMessage
              v-else
              :message="item.message"
              :run-id="runId"
              :agent-name="agentName"
              :agent-avatar-url="agentAvatarUrl"
              :inter-agent-sender-name-by-id="interAgentSenderNameById"
              :message-index="item.messageIndex"
              :enable-event-monitor-file-actions="enableEventMonitorFileActions"
              @file-path-action="emit('file-path-action', $event)"
            />
          </div>

          <span
            v-if="showTokenCosts && getRecentEventMonitorMessageUsageText(item.message)"
            class="block mt-1 text-[0.6875rem] text-gray-400 font-medium text-right pr-8"
          >
            {{ getRecentEventMonitorMessageUsageText(item.message) }}
          </span>
        </template>

        <CompactionStatusRow v-else :activity="item.activity" />
      </div>
      </template>
      </div>

      <div
        v-if="!showBrowsePresentation && showTotalUsage && totalUsageText"
        class="text-xs text-gray-500 font-medium mt-2 text-right"
      >
        {{ totalUsageText }}
      </div>
    </div>

    <div v-if="showJumpToLatest" class="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
      <button
        type="button"
        class="pointer-events-auto min-h-10 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-md transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        data-testid="event-monitor-jump-to-latest"
        @click="jumpToLatest"
        @keydown="handleJumpKeydown"
      >
        <span v-if="browseState === 'latest'">
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.jump_to_latest') }}
        </span>
        <span v-else>
          {{ $t('workspace.components.workspace.agent.AgentConversationFeed.return_to_latest') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUpdated, ref, watch } from 'vue';
import type { Conversation } from '~/types/conversation';
import type { CompactionActivity } from '~/stores/agentActivityStore';
import UserMessage from '~/components/conversation/UserMessage.vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import CompactionStatusRow from '~/components/workspace/agent/CompactionStatusRow.vue';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import {
  getRecentEventMonitorMessageUsageText,
  getRecentEventMonitorTotalUsageText,
} from '~/services/eventMonitor/recentEventMonitorUsagePresentation';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import EventMonitorBrowseAssistantRow from './EventMonitorBrowseAssistantRow.vue';
import type {
  EventMonitorActiveTraceBrowsePresentationItem,
} from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import type { EventMonitorActiveTraceBrowseState } from '~/services/eventMonitor/eventMonitorActiveTraceBrowse';

const props = withDefaults(defineProps<{
  conversation: Conversation;
  runId?: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  compactionActivities?: CompactionActivity[];
  showTokenCosts?: boolean;
  showTotalUsage?: boolean;
  presentationRevision?: number;
  enableEventMonitorFileActions?: boolean;
  browseItems?: EventMonitorActiveTraceBrowsePresentationItem[];
  browseState?: EventMonitorActiveTraceBrowseState;
  canLoadEarlier?: boolean;
  browseErrorMessage?: string;
  newerBrowseContentReleased?: boolean;
  browseHasNewerLiveActivity?: boolean;
}>(), {
  compactionActivities: () => [],
  showTokenCosts: true,
  showTotalUsage: true,
  presentationRevision: 0,
  enableEventMonitorFileActions: false,
  browseItems: () => [],
  browseState: 'latest',
  canLoadEarlier: false,
  browseErrorMessage: '',
  newerBrowseContentReleased: false,
  browseHasNewerLiveActivity: false,
});

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
  (event: 'load-earlier'): void;
  (event: 'jump-to-latest'): void;
}>();

const runId = computed(() => props.runId || props.conversation.id);
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000);
const conversationScrollContainerId = computed(() => `agent-conversation-scroll-${runId.value}-${instanceUid}`);
const shouldStickToBottom = ref(true);
const hasUnseenActivity = ref(false);
const revisionBaseline = ref(props.presentationRevision);
const NEAR_BOTTOM_THRESHOLD_PX = 40;
const latestFeedItems = computed(() => buildRecentEventMonitorPresentation(
  props.conversation,
  props.compactionActivities,
));
const showBrowsePresentation = computed(() => props.browseState !== 'latest' && props.browseItems.length > 0);
const showBoundaryControl = computed(() => props.canLoadEarlier || props.browseState !== 'latest');
const showJumpToLatest = computed(() => hasUnseenActivity.value
  || props.browseHasNewerLiveActivity
  || props.newerBrowseContentReleased
  || (props.browseState !== 'latest' && props.browseState !== 'expired'));

type BrowseAnchor = { scrollHeight: number; scrollTop: number; visualId: string | null; offset: number };
const pendingBrowseAnchor = ref<BrowseAnchor | null>(null);

const getConversationScrollContainer = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById(conversationScrollContainerId.value);
};

const getDistanceFromBottom = (el: HTMLElement): number => {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
};

const isNearBottom = (el: HTMLElement): boolean => {
  return getDistanceFromBottom(el) <= NEAR_BOTTOM_THRESHOLD_PX;
};

const updatePinnedStateFromScrollPosition = (el?: HTMLElement | null) => {
  const target = el ?? getConversationScrollContainer();
  if (!target) return;
  shouldStickToBottom.value = isNearBottom(target);
  if (shouldStickToBottom.value) hasUnseenActivity.value = false;
};

const scrollToBottom = () => {
  const el = getConversationScrollContainer();
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const jumpToLatest = () => {
  if (props.browseState !== 'latest') {
    emit('jump-to-latest');
    void nextTick(() => {
      scrollToBottom();
      updatePinnedStateFromScrollPosition();
    });
  }
  shouldStickToBottom.value = true;
  hasUnseenActivity.value = false;
  if (props.browseState === 'latest') {
    scrollToBottom();
    updatePinnedStateFromScrollPosition();
  }
};

const handleJumpKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  jumpToLatest();
};

const captureBrowseAnchor = (): BrowseAnchor | null => {
  const el = getConversationScrollContainer();
  if (!el) return null;
  const containerTop = el.getBoundingClientRect().top;
  const visuals = Array.from(el.querySelectorAll<HTMLElement>('[data-event-monitor-visual-key]'));
  const first = visuals.find(visual => visual.getBoundingClientRect().bottom >= containerTop) ?? null;
  return {
    scrollHeight: el.scrollHeight,
    scrollTop: el.scrollTop,
    visualId: first?.dataset.eventMonitorVisualKey ?? null,
    offset: first ? first.getBoundingClientRect().top - containerTop : 0,
  };
};

const requestEarlierPage = () => {
  pendingBrowseAnchor.value = captureBrowseAnchor();
  emit('load-earlier');
};

const restoreBrowseAnchor = async () => {
  const anchor = pendingBrowseAnchor.value;
  if (!anchor) return;
  await nextTick();
  const el = getConversationScrollContainer();
  if (!el) return;
  if (anchor.visualId) {
    const retained = Array.from(el.querySelectorAll<HTMLElement>('[data-event-monitor-visual-key]'))
      .find(visual => visual.dataset.eventMonitorVisualKey === anchor.visualId);
    if (retained) {
      el.scrollTop += retained.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.offset;
      pendingBrowseAnchor.value = null;
      updatePinnedStateFromScrollPosition(el);
      return;
    }
  }
  el.scrollTop = anchor.scrollTop + (el.scrollHeight - anchor.scrollHeight);
  pendingBrowseAnchor.value = null;
  updatePinnedStateFromScrollPosition(el);
};

const handleConversationScroll = (event: Event) => {
  updatePinnedStateFromScrollPosition(event.currentTarget as HTMLElement | null);
};

const syncAutoScrollIfPinned = () => {
  if (!shouldStickToBottom.value) return;
  scrollToBottom();
  updatePinnedStateFromScrollPosition();
};

onMounted(() => {
  scrollToBottom();
  updatePinnedStateFromScrollPosition();
});

onUpdated(() => {
  syncAutoScrollIfPinned();
});

watch(() => [props.conversation.id, props.runId], () => {
  shouldStickToBottom.value = true;
  hasUnseenActivity.value = false;
  revisionBaseline.value = props.presentationRevision;
  void nextTick(jumpToLatest);
});

watch(() => props.presentationRevision, (revision) => {
  if (revision <= revisionBaseline.value) {
    revisionBaseline.value = revision;
    hasUnseenActivity.value = false;
    return;
  }
  revisionBaseline.value = revision;
  if (showBrowsePresentation.value) return;
  if (shouldStickToBottom.value) {
    void nextTick(() => {
      scrollToBottom();
      updatePinnedStateFromScrollPosition();
    });
    return;
  }
  hasUnseenActivity.value = true;
});

watch(() => props.browseState, (state, previous) => {
  if (previous === 'loading' && state !== 'loading') void restoreBrowseAnchor();
});

const totalUsageText = computed(() => getRecentEventMonitorTotalUsageText(latestFeedItems.value));
</script>
