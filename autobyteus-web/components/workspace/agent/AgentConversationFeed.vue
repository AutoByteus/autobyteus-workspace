<template>
  <div class="relative h-full min-h-0">
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

    <div v-if="hasUnseenActivity" class="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-3">
      <button
        type="button"
        class="pointer-events-auto min-h-10 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-md transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        @click="jumpToLatest"
      >
        {{ $t('workspace.components.workspace.agent.AgentConversationFeed.jump_to_latest') }}
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
}>(), {
  compactionActivities: () => [],
  showTokenCosts: true,
  showTotalUsage: true,
  presentationRevision: 0,
});

type ConversationMessage = Conversation['messages'][number];

const runId = computed(() => props.runId || props.conversation.id);
const instanceUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000);
const conversationScrollContainerId = computed(() => `agent-conversation-scroll-${runId.value}-${instanceUid}`);
const shouldStickToBottom = ref(true);
const hasUnseenActivity = ref(false);
const revisionBaseline = ref(props.presentationRevision);
const NEAR_BOTTOM_THRESHOLD_PX = 40;
const feedItems = computed(() => buildRecentEventMonitorPresentation(
  props.conversation,
  props.compactionActivities,
));

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
  shouldStickToBottom.value = true;
  hasUnseenActivity.value = false;
  scrollToBottom();
  updatePinnedStateFromScrollPosition();
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
  if (shouldStickToBottom.value) {
    void nextTick(() => {
      scrollToBottom();
      updatePinnedStateFromScrollPosition();
    });
    return;
  }
  hasUnseenActivity.value = true;
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
  feedItems.value.forEach((item) => {
    if (item.kind !== 'message') return;
    const message = item.message;
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
