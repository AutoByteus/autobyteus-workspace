<template>
  <div
    :id="conversationScrollContainerId"
    class="h-full min-h-0 overflow-y-auto overscroll-contain"
    data-testid="agent-conversation-feed"
    @scroll="handleConversationScroll"
  >
    <div class="rounded-xl bg-white">
      <div
        v-for="item in feedItems"
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
            v-if="showTokenCosts && formatTokenCost(item.message)"
            class="block mt-1 text-[0.6875rem] text-gray-400 font-medium text-right pr-8"
          >
            {{ formatTokenCost(item.message) }}
          </span>
        </template>

        <CompactionStatusRow v-else :activity="item.activity" />
      </div>
    </div>

    <div
      v-if="showTotalUsage && totalUsage.totalTokens > 0"
      class="text-xs text-gray-500 font-medium mt-2 text-right"
    >
      Total: {{ totalUsage.totalTokens }} tokens / ${{ totalUsage.totalCost.toFixed(4) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUpdated, ref, watch } from 'vue';
import type { Conversation } from '~/types/conversation';
import type { CompactionActivity } from '~/stores/agentActivityStore';
import UserMessage from '~/components/conversation/UserMessage.vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import CompactionStatusRow from '~/components/workspace/agent/CompactionStatusRow.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

const props = withDefaults(defineProps<{
  conversation: Conversation;
  runId?: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  compactionActivities?: CompactionActivity[];
  showTokenCosts?: boolean;
  showTotalUsage?: boolean;
  enableEventMonitorFileActions?: boolean;
}>(), {
  compactionActivities: () => [],
  showTokenCosts: true,
  showTotalUsage: true,
  enableEventMonitorFileActions: false,
});

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();

type ConversationMessage = Conversation['messages'][number];

type MessageFeedItem = {
  kind: 'message';
  key: string;
  message: ConversationMessage;
  messageIndex: number;
  timestampMs: number;
  originalOrder: number;
};

type CompactionFeedItem = {
  kind: 'compaction';
  key: string;
  activity: CompactionActivity;
  timestampMs: number;
  originalOrder: number;
};

type FeedItem = MessageFeedItem | CompactionFeedItem;

const runId = computed(() => props.runId || props.conversation.id);
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000);
const conversationScrollContainerId = computed(() => `agent-conversation-scroll-${runId.value}-${instanceUid}`);
const shouldStickToBottom = ref(true);
const NEAR_BOTTOM_THRESHOLD_PX = 40;

const toTimestampMs = (value: Date | string | number | null | undefined): number => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isCenterFeedCompactionActivity = (activity: CompactionActivity): boolean =>
  Boolean(activity.centerTimelineTimestamp) &&
  (activity.phase === 'started' || activity.phase === 'completed' || activity.phase === 'failed');

const feedItems = computed<FeedItem[]>(() => {
  const messageItems: MessageFeedItem[] = props.conversation.messages.map((message, index) => ({
    kind: 'message',
    key: `message-${message.timestamp}-${message.type}-${index}`,
    message,
    messageIndex: index,
    timestampMs: toTimestampMs(message.timestamp),
    originalOrder: index * 2,
  }));

  const compactionItems: CompactionFeedItem[] = props.compactionActivities
    .filter(isCenterFeedCompactionActivity)
    .map((activity, index) => ({
      kind: 'compaction',
      key: `compaction-${activity.activityId}`,
      activity,
      timestampMs: toTimestampMs(activity.centerTimelineTimestamp),
      originalOrder: (props.conversation.messages.length + index) * 2 + 1,
    }));

  return [...messageItems, ...compactionItems].sort((left, right) => {
    const timeDelta = left.timestampMs - right.timestampMs;
    if (timeDelta !== 0) return timeDelta;
    return left.originalOrder - right.originalOrder;
  });
});

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
};

const scrollToBottom = () => {
  const el = getConversationScrollContainer();
  if (!el) return;
  el.scrollTop = el.scrollHeight;
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
});

const formatTokenCost = (message: ConversationMessage) => {
  if (message.type === 'user') {
    if (message.promptTokens != null && message.promptCost != null) {
      return `${message.promptTokens} tokens / $${message.promptCost.toFixed(4)}`;
    }
    return '';
  }

  if (message.completionTokens != null && message.completionCost != null) {
    return `${message.completionTokens} tokens / $${message.completionCost.toFixed(4)}`;
  }
  return '';
};

const totalUsage = computed(() => {
  let totalTokens = 0;
  let totalCost = 0;
  props.conversation.messages.forEach((message) => {
    if (message.type === 'user') {
      if (message.promptTokens) {
        totalTokens += message.promptTokens;
      }
      if (message.promptCost) {
        totalCost += message.promptCost;
      }
      return;
    }

    if (message.completionTokens) {
      totalTokens += message.completionTokens;
    }
    if (message.completionCost) {
      totalCost += message.completionCost;
    }
  });
  return { totalTokens, totalCost };
});
</script>
