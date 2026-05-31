<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden overscroll-none p-4" data-testid="agent-event-monitor">
    <AgentConversationFeed
      class="min-h-0 flex-1"
      :conversation="conversation"
      :run-id="effectiveRunId"
      :agent-name="agentName"
      :agent-avatar-url="agentAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      :compaction-activities="compactionActivities"
    />

    <div class="shrink-0">
      <slot name="composerContext" />
      <AgentUserInputForm :before-send="beforeSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Conversation } from '~/types/conversation';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

const props = defineProps<{
  conversation: Conversation;
  runId?: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  beforeSend?: () => void | Promise<void>;
}>();

const activityStore = useAgentActivityStore();
const effectiveRunId = computed(() => props.runId || props.conversation.id);
const compactionActivities = computed(() => activityStore.getCompactionActivities(effectiveRunId.value));
</script>
