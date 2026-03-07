<template>
  <div class="flex flex-col h-full p-4 gap-3">
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
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';

const props = defineProps<{
  conversation: Conversation;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
}>();
</script>
