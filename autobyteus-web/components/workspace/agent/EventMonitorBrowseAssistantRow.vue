<template>
  <div class="conv-turn flex items-start gap-3 pr-8">
    <DefinitionAvatar
      class="conv-avatar h-9 w-9 shrink-0 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-semibold tracking-wide text-slate-600"
      kind="agent"
      :name="displayAgentName"
      :avatar-url="avatarUrl"
      :initials="avatarInitials"
    />
    <!-- The phone's speaker line (autobyteus-506); hidden on the desktop. -->
    <span class="conv-speaker" aria-hidden="true">{{ displayAgentName }}</span>
    <div class="conv-body min-w-0 flex-1 pt-0.5">
      <span class="sr-only">{{ displayAgentName }}</span>
      <div
        v-for="visual in visuals"
        :key="visual.visualId"
        :data-event-monitor-visual-key="visual.visualId"
      >
        <TextSegment
          v-if="visual.kind === 'text'"
          :content="visual.content"
          :enable-event-monitor-file-actions="enableEventMonitorFileActions"
          @file-path-action="emit('file-path-action', $event)"
        />
        <ThinkSegment
          v-else-if="visual.kind === 'thinking'"
          :content="visual.content"
          :enable-event-monitor-file-actions="enableEventMonitorFileActions"
          @file-path-action="emit('file-path-action', $event)"
        />
        <ToolCallIndicator v-else-if="visual.kind === 'tool'" :presentation="visual.presentation" />
        <InterAgentMessageSegment
          v-else-if="visual.kind === 'inter_agent'"
          :segment="visual.segment"
          :enable-event-monitor-file-actions="enableEventMonitorFileActions"
          @file-path-action="emit('file-path-action', $event)"
        />
        <MediaSegment v-else :segment="visual.segment" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import ThinkSegment from '~/components/conversation/segments/ThinkSegment.vue';
import MediaSegment from '~/components/conversation/segments/MediaSegment.vue';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import InterAgentMessageSegment from '~/components/conversation/segments/InterAgentMessageSegment.vue';
import type { EventMonitorBrowseAssistantVisual } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import type { ConversationFileLink } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import DefinitionAvatar from '~/components/common/DefinitionAvatar.vue';

const props = withDefaults(defineProps<{
  visuals: EventMonitorBrowseAssistantVisual[];
  agentName?: string;
  agentAvatarUrl?: string | null;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });
const emit = defineEmits<{
  (event: 'file-path-action', action: ConversationFileLink): void;
}>();
const displayAgentName = computed(() => props.agentName?.trim() || 'Agent');
const avatarUrl = computed(() => props.agentAvatarUrl || null);
const avatarInitials = computed(() => displayAgentName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  .map(part => part[0]?.toUpperCase() || '').join('') || 'AI');
</script>
