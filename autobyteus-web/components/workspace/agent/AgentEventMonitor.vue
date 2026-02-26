<template>
  <div class="flex flex-col h-full p-4 gap-3">
    <div
      :id="conversationScrollContainerId"
      class="flex-1 min-h-0 overflow-y-auto"
      @scroll="handleConversationScroll"
    >
      <div class="rounded-xl bg-white">
        <div
          v-for="(message, index) in conversation.messages"
          :key="message.timestamp + '-' + message.type + '-' + index"
          class="px-2 py-3 break-words"
        >
          <div>
            <UserMessage
              v-if="message.type === 'user'"
              :message="message"
              user-display-name="You"
            />
            <AIMessage
              v-else
              :message="message"
              :agent-id="agentId"
              :agent-name="agentName"
              :agent-avatar-url="agentAvatarUrl"
              :inter-agent-sender-name-by-id="interAgentSenderNameById"
              :message-index="index"
            />
          </div>

          <span
            v-if="formatTokenCost(message)"
            class="block mt-1 text-[11px] text-gray-400 font-medium text-right pr-8"
          >
            {{ formatTokenCost(message) }}
          </span>
        </div>
      </div>

      <div
        v-if="totalUsage.totalTokens > 0"
        class="text-xs text-gray-500 font-medium mt-2 text-right"
      >
        Total: {{ totalUsage.totalTokens }} tokens / ${{ totalUsage.totalCost.toFixed(4) }}
      </div>
    </div>

    <div>
      <AgentUserInputForm />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUpdated, ref, watch } from 'vue';
import type { Conversation, Message } from '~/types/conversation';
import UserMessage from '~/components/conversation/UserMessage.vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';

const props = defineProps<{
  conversation: Conversation;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
}>();

const agentId = computed(() => props.conversation.id);
const componentUid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 1_000_000);
const conversationScrollContainerId = computed(() => `agent-conversation-scroll-${agentId.value}-${componentUid}`);
const shouldStickToBottom = ref(true);
const NEAR_BOTTOM_THRESHOLD_PX = 40;

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

watch(() => props.conversation.id, () => {
  shouldStickToBottom.value = true;
});

const formatTokenCost = (message: Message) => {
  if (message.type === 'user') {
    const userMsg = message;
    if (userMsg.promptTokens != null && userMsg.promptCost != null) {
      return `${userMsg.promptTokens} tokens / $${userMsg.promptCost.toFixed(4)}`;
    }
    return '';
  } else if (message.type === 'ai') {
    const aiMsg = message;
    if (aiMsg.completionTokens != null && aiMsg.completionCost != null) {
      return `${aiMsg.completionTokens} tokens / $${aiMsg.completionCost.toFixed(4)}`;
    }
    return '';
  }
  return '';
};

/**
 * Computes the total tokens and total cost for the entire conversation.
 */
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
    } else if (message.type === 'ai') {
      if (message.completionTokens) {
        totalTokens += message.completionTokens;
      }
      if (message.completionCost) {
        totalCost += message.completionCost;
      }
    }
  });
  return { totalTokens, totalCost };
});
</script>

<style scoped>
</style>
