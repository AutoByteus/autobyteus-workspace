<template>
  <div>
    <div class="flex items-start gap-3 pr-8">
      <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
        <img
          v-if="showAvatarImage"
          :src="avatarUrl"
          :alt="`${displayAgentName} avatar`"
          class="h-full w-full object-cover"
          @error="avatarLoadError = true"
        />
        <span v-else class="text-xs font-semibold tracking-wide text-slate-600">{{ avatarInitials }}</span>
      </div>

      <div class="min-w-0 flex-1 pt-0.5">
        <span class="sr-only">{{ displayAgentName }}</span>
        <div>
          <template v-for="(segment, segmentIndex) in message.segments" :key="segmentIndex">
            <TextSegment
              v-if="segment.type === 'text'"
              :content="segment.content"
            />
            <WriteFileCommandSegment
              v-else-if="segment.type === 'write_file'"
              :segment="segment"
              :conversation-id="agentId"
            />
            <EditFileCommandSegment
              v-else-if="segment.type === 'edit_file'"
              :segment="segment"
              :conversation-id="agentId"
            />
            <TerminalCommandSegment
              v-else-if="segment.type === 'terminal_command'"
              :segment="segment"
              :conversation-id="agentId"
            />
            <ThinkSegment
              v-else-if="segment.type === 'think'"
              :content="segment.content"
            />
            <ToolCallSegment
              v-else-if="segment.type === 'tool_call'"
              :segment="segment"
              :conversation-id="agentId"
            />
            <SystemTaskNotificationSegment
              v-else-if="segment.type === 'system_task_notification'"
              :segment="segment"
            />
            <InterAgentMessageSegment
              v-else-if="segment.type === 'inter_agent_message'"
              :segment="segment"
              :sender-display-name="resolveInterAgentSenderDisplayName(segment.senderAgentId)"
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
import { computed, ref, watch } from 'vue';
import type { AIMessage } from '~/types/conversation';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import TerminalCommandSegment from '~/components/conversation/segments/TerminalCommandSegment.vue';
import ThinkSegment from '~/components/conversation/segments/ThinkSegment.vue';
import ToolCallSegment from '~/components/conversation/segments/ToolCallSegment.vue';
import WriteFileCommandSegment from '~/components/conversation/segments/WriteFileCommandSegment.vue';
import SystemTaskNotificationSegment from '~/components/conversation/segments/SystemTaskNotificationSegment.vue';
import InterAgentMessageSegment from '~/components/conversation/segments/InterAgentMessageSegment.vue';
import MediaSegment from '~/components/conversation/segments/MediaSegment.vue';
import ErrorSegment from '~/components/conversation/segments/ErrorSegment.vue';
import EditFileCommandSegment from '~/components/conversation/segments/EditFileCommandSegment.vue';

const props = defineProps<{
  message: AIMessage;
  agentId: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  messageIndex: number;
}>();

const avatarLoadError = ref(false);

const displayAgentName = computed(() => {
  const raw = props.agentName?.trim() || '';
  return raw || 'Agent';
});

const avatarUrl = computed(() => props.agentAvatarUrl || '');
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);

const avatarInitials = computed(() => {
  const parts = displayAgentName.value.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map(part => part[0]?.toUpperCase() || '').join('');
  return initials || 'AI';
});

watch(() => props.agentAvatarUrl, () => {
  avatarLoadError.value = false;
});

const resolveInterAgentSenderDisplayName = (senderAgentId: string): string | undefined => {
  const normalizedSenderId = String(senderAgentId || '').trim();
  if (!normalizedSenderId) {
    return undefined;
  }
  return props.interAgentSenderNameById?.[normalizedSenderId];
};

</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
