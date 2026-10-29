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
    <template v-if="isToolsReopenFailure">
      <p data-testid="system-task-notification-reopen-failed">
        {{ $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.toolsReopenFailed') }}
      </p>
      <button
        v-if="runId"
        type="button"
        class="mt-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
        data-testid="system-task-notification-restart-run"
        :disabled="restarting"
        @click="restartRun"
      >
        {{ restarting
          ? $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.restartingWithNewTools')
          : $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.restartWithNewTools') }}
      </button>
      <p
        v-if="restartFailed"
        class="mt-1 text-sm text-red-600 dark:text-red-400"
        data-testid="system-task-notification-restart-failed"
      >
        {{ $t('workspace.components.conversation.segments.SystemTaskNotificationSegment.restartFailed') }}
      </p>
    </template>
    <MarkdownRenderer
      v-else
      :content="body"
      :enable-event-monitor-file-actions="enableEventMonitorFileActions"
      @file-path-action="emit('file-path-action', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SystemTaskNotificationSegment } from '~/types/segments';
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useLocalization } from '~/composables/useLocalization';

/** The platform's skill update notice: its sender, or its header (replayed history, Team streams). */
const SKILL_UPDATE_NOTICE_SENDER_ID = 'system.skill_update_notifier';
const SKILL_UPDATE_NOTICE_HEADER = '[Platform notice — skill updated]';
/** The platform's tool list notices: the update (sender or header), and the failed reopen (action or text). */
const TOOL_LIST_UPDATE_NOTICE_SENDER_ID = 'system.tool_list_update_notifier';
const TOOL_LIST_UPDATE_NOTICE_HEADER = '[Platform notice — tools updated]';
const TOOL_LIST_UPDATE_NOTICE_LEAD = 'Your tools changed.';
const RESTART_RUN_ACTION = 'restart_run';
const TOOLS_REOPEN_FAILED_TEXT = "Couldn't give this run its new tools.";

const props = withDefaults(defineProps<{
  segment: SystemTaskNotificationSegment;
  /** The run the notice belongs to (enables its restart action). */
  runId?: string | null;
  enableEventMonitorFileActions?: boolean;
}>(), { runId: null, enableEventMonitorFileActions: false });

const emit = defineEmits<{
  (event: 'file-path-action', action: AbsoluteFilePathAction): void;
}>();

const { t } = useLocalization();

const isSkillUpdate = computed(() =>
  props.segment.senderId === SKILL_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(SKILL_UPDATE_NOTICE_HEADER));

const isToolsReopenFailure = computed(() =>
  props.segment.action === RESTART_RUN_ACTION
  || props.segment.content.trim() === TOOLS_REOPEN_FAILED_TEXT);

const isToolsUpdate = computed(() => !isToolsReopenFailure.value && (
  props.segment.senderId === TOOL_LIST_UPDATE_NOTICE_SENDER_ID
  || props.segment.content.startsWith(TOOL_LIST_UPDATE_NOTICE_HEADER)));

const label = computed(() => {
  if (isSkillUpdate.value) return t('workspace.components.conversation.segments.SystemTaskNotificationSegment.skillUpdated');
  if (isToolsUpdate.value || isToolsReopenFailure.value) {
    return t('workspace.components.conversation.segments.SystemTaskNotificationSegment.toolsUpdated');
  }
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

const restarting = ref(false);
const restartFailed = ref(false);

const restartRun = async (): Promise<void> => {
  if (!props.runId || restarting.value) return;
  restarting.value = true;
  restartFailed.value = false;
  try {
    restartFailed.value = !(await useAgentRunStore().restartRunWithNewTools(props.runId));
  } catch {
    restartFailed.value = true;
  } finally {
    restarting.value = false;
  }
};
</script>
