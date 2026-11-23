<template>
  <!-- A platform notice is its own conversation row (autobyteus-585): a small icon where an avatar would be, the label
       as its speaker line, and a muted body. Light, not an alert card. -->
  <div
    class="system-task-notification conv-turn flex items-start gap-3 pr-8"
    data-testid="system-task-notification-segment"
    role="note"
    :aria-label="label"
  >
    <div
      class="conv-avatar flex h-9 w-9 shrink-0 items-center justify-center text-slate-400 dark:text-slate-500"
      aria-hidden="true"
    >
      <Icon icon="heroicons:information-circle" class="h-5 w-5" />
    </div>
    <!-- The phone's speaker line; hidden on the desktop, which shows the label above the body. -->
    <span class="conv-speaker" aria-hidden="true">{{ label }}</span>
    <div class="conv-body min-w-0 flex-1 pt-0.5">
      <div
        class="system-task-notification-label mb-1 text-xs font-medium text-slate-500 dark:text-slate-400"
        data-testid="system-task-notification-label"
        aria-hidden="true"
      >
        {{ label }}
      </div>
      <div class="system-task-notification-body" data-testid="system-task-notification-body">
        <MarkdownRenderer
          :content="body"
          :enable-event-monitor-file-actions="enableEventMonitorFileActions"
          @file-path-action="emit('file-path-action', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import type { SystemTaskNotificationSegment } from '~/types/segments';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import type { ConversationFileLink } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { useLocalization } from '~/composables/useLocalization';
import {
  RESTART_REMINDER_NOTICE_HEADER,
  RESTART_REMINDER_NOTICE_SENDER_ID,
  restartReminderInLocalTime,
} from '~/utils/restartReminderLocalTime';

/** The platform's skill update notice: its sender, or its header (replayed history, Team streams). */
const SKILL_UPDATE_NOTICE_SENDER_ID = 'system.skill_update_notifier';
const SKILL_UPDATE_NOTICE_HEADER = '[Platform notice — skill updated]';
/** The platform's tool list notice: its sender, or its header (replayed history, Team streams). */
const TOOL_LIST_UPDATE_NOTICE_SENDER_ID = 'system.tool_list_update_notifier';
const TOOL_LIST_UPDATE_NOTICE_HEADER = '[Platform notice — tools updated]';
const TOOL_LIST_UPDATE_NOTICE_LEAD = 'Your tools changed.';
/** The agent runtime switch marker: its sender (live notice and recorded marker). */
const RUNTIME_HANDOVER_NOTICE_SENDER_ID = 'system.runtime_handover';
/** The platform's background task notice: its sender, or its header (replayed history, Team streams). */
const BACKGROUND_TASK_NOTICE_SENDER_ID = 'system.background_task_notifier';
const BACKGROUND_TASK_NOTICE_HEADER = '[Platform notice — background tasks finished]';
/** A platform notice's first line names it for the agent; the row's label names it for the reader. */
const PLATFORM_NOTICE_HEADER_LINE = /^\[Platform notice — [^\]]+\]$/;

const props = withDefaults(defineProps<{
  segment: SystemTaskNotificationSegment;
  enableEventMonitorFileActions?: boolean;
}>(), { enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: ConversationFileLink): void;
}>();

const { t, resolvedLocale } = useLocalization();

const isSkillUpdate = computed(() =>
  props.segment.senderId === SKILL_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(SKILL_UPDATE_NOTICE_HEADER));

const isToolsUpdate = computed(() =>
  props.segment.senderId === TOOL_LIST_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(TOOL_LIST_UPDATE_NOTICE_HEADER));

const isRuntimeChange = computed(() => props.segment.senderId === RUNTIME_HANDOVER_NOTICE_SENDER_ID);

const isRestartReminder = computed(() =>
  props.segment.senderId === RESTART_REMINDER_NOTICE_SENDER_ID
  || props.segment.content.startsWith(RESTART_REMINDER_NOTICE_HEADER));

const isBackgroundTasksFinished = computed(() =>
  props.segment.senderId === BACKGROUND_TASK_NOTICE_SENDER_ID
  || props.segment.content.startsWith(BACKGROUND_TASK_NOTICE_HEADER));

/** Every notice is labelled: by its sender, then by its header, otherwise "Platform notice" (autobyteus-585). */
const label = computed(() => {
  const key = 'workspace.components.conversation.segments.SystemTaskNotificationSegment';
  if (isRuntimeChange.value) return t(`${key}.runtimeChanged`);
  if (isRestartReminder.value) return t(`${key}.applicationRestarted`);
  if (isSkillUpdate.value) return t(`${key}.skillUpdated`);
  if (isToolsUpdate.value) return t(`${key}.toolsUpdated`);
  if (isBackgroundTasksFinished.value) return t(`${key}.backgroundTasksFinished`);
  return t(`${key}.platformNotice`);
});

/** The notice without its bracketed `[Platform notice — …]` first line (and the blank line after it). */
const withoutHeaderLine = (content: string): string => {
  const lines = content.split('\n');
  if (!PLATFORM_NOTICE_HEADER_LINE.test(lines[0]!.trim())) return content;
  const rest = lines.slice(1);
  if (rest.length > 0 && rest[0]!.trim() === '') rest.shift();
  return rest.join('\n');
};

/**
 * The header line is not repeated (the label names the notice). A tool list notice shows only what changed: "Now
 * available: a, b. No longer available: c." The restart reminder shows its restart time in the viewer's time zone
 * (autobyteus-526); the agent's text keeps UTC.
 */
const body = computed(() => {
  const text = withoutHeaderLine(props.segment.content);
  if (isRestartReminder.value) return restartReminderInLocalTime(text, resolvedLocale.value);
  if (!isToolsUpdate.value) return text;
  const changes = text.trim();
  return changes.startsWith(TOOL_LIST_UPDATE_NOTICE_LEAD) ? changes.slice(TOOL_LIST_UPDATE_NOTICE_LEAD.length).trim() : changes;
});
</script>

<style scoped>
/* The notice's text is muted against the agent's: the markdown body sets its own color, so it is set here. */
.system-task-notification-body :deep(.markdown-body) { color: rgb(71 85 105); } /* slate-600 */
@media (prefers-color-scheme: dark) {
  .system-task-notification-body :deep(.markdown-body) { color: rgb(203 213 225); } /* slate-300 */
}
</style>
