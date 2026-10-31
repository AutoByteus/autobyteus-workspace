<template>
  <div
    class="system-task-notification mb-4 text-gray-900 dark:text-slate-100"
    data-testid="system-task-notification-segment"
    role="note"
    :aria-label="label || $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.system_task_notification')"
  >
    <div
      v-if="label"
      class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400"
      data-testid="system-task-notification-label"
    >
      {{ label }}
    </div>
    <MarkdownRenderer
      :content="body"
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
import { useLocalization } from '~/composables/useLocalization';

/** The platform's skill update notice: its sender, or its header (replayed history, Team streams). */
const SKILL_UPDATE_NOTICE_SENDER_ID = 'system.skill_update_notifier';
const SKILL_UPDATE_NOTICE_HEADER = '[Platform notice — skill updated]';
/** The platform's tool list notice: its sender, or its header (replayed history, Team streams). */
const TOOL_LIST_UPDATE_NOTICE_SENDER_ID = 'system.tool_list_update_notifier';
const TOOL_LIST_UPDATE_NOTICE_HEADER = '[Platform notice — tools updated]';
const TOOL_LIST_UPDATE_NOTICE_LEAD = 'Your tools changed.';
/** The agent runtime switch marker: its sender (live notice and recorded marker). */
const RUNTIME_HANDOVER_NOTICE_SENDER_ID = 'system.runtime_handover';

const props = withDefaults(defineProps<{
  segment: SystemTaskNotificationSegment;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();

const { t } = useLocalization();

const isSkillUpdate = computed(() =>
  props.segment.senderId === SKILL_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(SKILL_UPDATE_NOTICE_HEADER));

const isToolsUpdate = computed(() =>
  props.segment.senderId === TOOL_LIST_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(TOOL_LIST_UPDATE_NOTICE_HEADER));

const isRuntimeChange = computed(() => props.segment.senderId === RUNTIME_HANDOVER_NOTICE_SENDER_ID);

const label = computed(() => {
  if (isRuntimeChange.value) return t('workspace.components.conversation.segments.SystemTaskNotificationSegment.runtimeChanged');
  if (isSkillUpdate.value) return t('workspace.components.conversation.segments.SystemTaskNotificationSegment.skillUpdated');
  if (isToolsUpdate.value) return t('workspace.components.conversation.segments.SystemTaskNotificationSegment.toolsUpdated');
  return '';
});

/** A tool list notice shows only what changed: "Now available: a, b. No longer available: c." */
const body = computed(() => {
  if (!isToolsUpdate.value) return props.segment.content;
  let text = props.segment.content;
  if (text.startsWith(TOOL_LIST_UPDATE_NOTICE_HEADER)) text = text.slice(TOOL_LIST_UPDATE_NOTICE_HEADER.length);
  text = text.trim();
  if (text.startsWith(TOOL_LIST_UPDATE_NOTICE_LEAD)) text = text.slice(TOOL_LIST_UPDATE_NOTICE_LEAD.length).trim();
  return text;
});
</script>
