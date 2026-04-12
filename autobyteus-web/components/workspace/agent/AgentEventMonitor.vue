<template>
  <div class="flex flex-col h-full p-4 gap-3">
    <CompactionStatusBanner :status="compactionStatus ?? null" />

    <AgentConversationFeed
      class="flex-1"
      :conversation="conversation"
      :agent-name="agentName"
      :agent-avatar-url="agentAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
    />

    <div>
      <AgentUserInputForm />
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
}>();
</script>
