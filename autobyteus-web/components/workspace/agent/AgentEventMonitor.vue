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
      :enable-event-monitor-file-actions="true"
      @file-path-action="handleFilePathAction"
    />

    <div class="shrink-0">
      <p
        v-if="filePreviewStatus"
        class="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        role="status"
        aria-live="polite"
        data-testid="event-monitor-file-preview-status"
      >
        {{ filePreviewStatus }}
      </p>
      <slot name="composerContext" />
      <AgentUserInputForm :before-send="beforeSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Conversation } from '~/types/conversation';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

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
const filePreviewStatus = ref('');

const handleFilePathAction = async (action: AbsoluteFilePathAction): Promise<void> => {
  // Keep the launcher effect boundary out of Markdown rendering and out of
  // passive message arrival. It is created only for explicit activation.
  const { useEventMonitorFilePreview } = await import('~/composables/useEventMonitorFilePreview');
  const result = await useEventMonitorFilePreview().openPath(action);
  filePreviewStatus.value = result.status === 'opened' ? '' : result.message;
};
</script>
