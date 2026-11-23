<template>
  <template v-if="item.kind === 'message'">
    <div>
      <UserMessage v-if="item.message.type === 'user'" :message="item.message" user-display-name="You" />
      <AIMessage v-else :message="item.message" :run-id="runId"
        :agent-name="agentName"
        :agent-avatar-url="agentAvatarUrl"
        :inter-agent-sender-name-by-id="interAgentSenderNameById"
        :message-index="item.messageIndex"
        :enable-event-monitor-file-actions="enableEventMonitorFileActions"
        @file-path-action="emit('file-path-action', $event)" />
    </div>

    <!-- A message split into several rows shows its usage once, under its last row (autobyteus-585). -->
    <span v-if="showTokenCosts && item.showsUsage && usageText"
      class="mt-1 block pr-8 text-right text-[0.6875rem] font-medium text-gray-400">
      {{ usageText }}
    </span>
  </template>

  <!-- A platform notice is its own row, never part of the agent's message (autobyteus-585). -->
  <SystemTaskNotificationSegment v-else-if="item.kind === 'notice'" :segment="item.segment"
    :enable-event-monitor-file-actions="enableEventMonitorFileActions"
    @file-path-action="emit('file-path-action', $event)" />

  <CompactionStatusRow v-else :activity="item.activity" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UserMessage from '~/components/conversation/UserMessage.vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import SystemTaskNotificationSegment from '~/components/conversation/segments/SystemTaskNotificationSegment.vue';
import CompactionStatusRow from '~/components/workspace/agent/CompactionStatusRow.vue';
import type { RecentEventMonitorPresentationItem } from '~/services/eventMonitor/recentEventMonitorWindow';
import { getRecentEventMonitorMessageUsageText } from '~/services/eventMonitor/recentEventMonitorUsagePresentation';
import type { ConversationFileLink } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

/** One row of the latest feed: an agent or user message with its usage line, a platform notice, or a compaction. */
const props = defineProps<{
  item: RecentEventMonitorPresentationItem;
  runId: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  showTokenCosts: boolean;
  enableEventMonitorFileActions: boolean;
}>();

const emit = defineEmits<{
  (event: 'file-path-action', action: ConversationFileLink): void;
}>();

const usageText = computed(() => (props.item.kind === 'message' ? getRecentEventMonitorMessageUsageText(props.item.message) : ''));
</script>
