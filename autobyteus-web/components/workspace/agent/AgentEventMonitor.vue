<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden overscroll-none p-4" data-testid="agent-event-monitor">
    <CompactionStatusBanner class="shrink-0" :status="compactionStatus ?? null" />

    <AgentConversationFeed
      class="min-h-0 flex-1"
      :conversation="conversation"
      :agent-name="agentName"
      :agent-avatar-url="agentAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
    />

    <div class="shrink-0">
      <slot name="composerContext" />
      <AgentUserInputForm :before-send="beforeSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Conversation } from '~/types/conversation';
import type { AgentCompactionStatus } from '~/types/agent/AgentRunState';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import CompactionStatusBanner from '~/components/workspace/agent/CompactionStatusBanner.vue';

defineProps<{
  conversation: Conversation;
  compactionStatus?: AgentCompactionStatus | null;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  beforeSend?: () => void | Promise<void>;
}>();
</script>
