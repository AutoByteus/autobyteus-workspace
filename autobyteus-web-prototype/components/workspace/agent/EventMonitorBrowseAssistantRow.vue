<template>
  <div class="flex items-start gap-3 pr-8">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-50">
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
        <MediaSegment v-else :segment="visual.segment" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';
import ThinkSegment from '~/components/conversation/segments/ThinkSegment.vue';
import MediaSegment from '~/components/conversation/segments/MediaSegment.vue';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import type { EventMonitorBrowseAssistantVisual } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

const props = withDefaults(defineProps<{
  visuals: EventMonitorBrowseAssistantVisual[];
  agentName?: string;
  agentAvatarUrl?: string | null;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });
const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();
const avatarLoadError = ref(false);
const displayAgentName = computed(() => props.agentName?.trim() || 'Agent');
const avatarUrl = computed(() => props.agentAvatarUrl || '');
const showAvatarImage = computed(() => Boolean(avatarUrl.value) && !avatarLoadError.value);
const avatarInitials = computed(() => displayAgentName.value.split(/\s+/).filter(Boolean).slice(0, 2)
  .map(part => part[0]?.toUpperCase() || '').join('') || 'AI');
watch(() => props.agentAvatarUrl, () => { avatarLoadError.value = false; });
</script>
