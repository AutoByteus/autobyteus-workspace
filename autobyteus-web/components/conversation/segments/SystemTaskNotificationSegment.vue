<template>
  <div
    class="system-task-notification mb-4 text-gray-900 dark:text-slate-100"
    data-testid="system-task-notification-segment"
    role="note"
    :aria-label="isSkillUpdate
      ? $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.skillUpdated')
      : $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.system_task_notification')"
  >
    <div
      v-if="isSkillUpdate"
      class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400"
      data-testid="system-task-notification-label"
    >
      {{ $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.skillUpdated') }}
    </div>
    <MarkdownRenderer
      :content="segment.content"
      :enable-event-monitor-file-actions="enableEventMonitorFileActions"
      @file-path-action="emit('file-path-action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SystemTaskNotificationSegment } from '~/types/segments';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';

/** The platform's skill update notice: its sender, or its header (replayed history). */
const SKILL_UPDATE_NOTICE_SENDER_ID = 'system.skill_update_notifier';
const SKILL_UPDATE_NOTICE_HEADER = '[Platform notice — skill updated]';

const props = withDefaults(defineProps<{
  segment: SystemTaskNotificationSegment;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();

const isSkillUpdate = computed(() =>
  props.segment.senderId === SKILL_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(SKILL_UPDATE_NOTICE_HEADER));
</script>
