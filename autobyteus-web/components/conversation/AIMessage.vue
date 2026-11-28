<template>
  <div>
    <div class="conv-turn flex items-start gap-3 pr-8">
      <DefinitionAvatar
        class="conv-avatar h-9 w-9 shrink-0 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold tracking-wide text-slate-600"
        kind="agent"
        :name="displayAgentName"
        :avatar-url="avatarUrl"
        :initials="avatarInitials"
      />

      <!-- The phone's speaker line (autobyteus-506); hidden on the desktop. -->
      <span class="conv-speaker" aria-hidden="true">{{ displayAgentName }}</span>
      <div class="conv-body min-w-0 flex-1 pt-0.5">
        <span class="sr-only">{{ displayAgentName }}</span>
        <div>
          <template v-for="(segment, segmentIndex) in message.segments" :key="segmentIndex">
            <TextSegment
              v-if="segment.type === 'text'"
              :content="segment.content"
              :enable-event-monitor-file-actions="enableEventMonitorFileActions"
              @file-path-action="emit('file-path-action', $event)"
            />
            <WriteFileCommandSegment
              v-else-if="segment.type === 'write_file'"
              :segment="segment"
              :conversation-id="runId"
            />
            <EditFileCommandSegment
              v-else-if="segment.type === 'edit_file'"
              :segment="segment"
              :conversation-id="runId"
            />
            <TerminalCommandSegment
              v-else-if="segment.type === 'terminal_command'"
              :segment="segment"
              :conversation-id="runId"
            />
            <ThinkSegment
              v-else-if="segment.type === 'think'"
              :content="segment.content"
              :enable-event-monitor-file-actions="enableEventMonitorFileActions"
              @file-path-action="emit('file-path-action', $event)"
            />
            <ToolCallSegment
              v-else-if="segment.type === 'tool_call'"
              :segment="segment"
              :conversation-id="runId"
            />
            <InterAgentMessageSegment
              v-else-if="segment.type === 'inter_agent_message'"
              :segment="segment"
              :sender-display-name="resolveInterAgentSenderDisplayName(segment.senderAgentRunId)"
              :enable-event-monitor-file-actions="enableEventMonitorFileActions"
              @file-path-action="emit('file-path-action', $event)"
            />
            <MediaSegment
              v-else-if="segment.type === 'media'"
              :segment="segment"
            />
            <ErrorSegment
              v-else-if="segment.type === 'error'"
              :segment="segment"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AIMessage } from '~/types/conversation';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import TerminalCommandSegment from '~/components/conversation/segments/TerminalCommandSegment.vue';
import ThinkSegment from '~/components/conversation/segments/ThinkSegment.vue';
import ToolCallSegment from '~/components/conversation/segments/ToolCallSegment.vue';
import WriteFileCommandSegment from '~/components/conversation/segments/WriteFileCommandSegment.vue';
import InterAgentMessageSegment from '~/components/conversation/segments/InterAgentMessageSegment.vue';
import MediaSegment from '~/components/conversation/segments/MediaSegment.vue';
import ErrorSegment from '~/components/conversation/segments/ErrorSegment.vue';
import EditFileCommandSegment from '~/components/conversation/segments/EditFileCommandSegment.vue';
import type { ConversationFileLink } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import DefinitionAvatar from '~/components/common/DefinitionAvatar.vue';

const props = defineProps<{
  message: AIMessage;
  runId: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  messageIndex: number;
  enableEventMonitorFileActions?: boolean;
}>();

const emit = defineEmits<{
  (event: 'file-path-action', action: ConversationFileLink): void;
}>();

const displayAgentName = computed(() => {
  const raw = props.agentName?.trim() || '';
  return raw || 'Agent';
});

const avatarUrl = computed(() => props.agentAvatarUrl || null);

const avatarInitials = computed(() => {
  const parts = displayAgentName.value.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'AI';
});

const resolveInterAgentSenderDisplayName = (senderAgentRunId: string): string | undefined => {
  const normalizedSenderRunId = String(senderAgentRunId || '').trim();
  if (!normalizedSenderRunId) {
    return undefined;
  }
  return props.interAgentSenderNameById?.[normalizedSenderRunId];
};

</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
