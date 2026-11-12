<template>
  <!-- autobyteus-473 REQ-001: the open agent's background tasks above the tool calls; read-only, the desktop panel's data. -->
  <section class="border-b border-slate-200" data-testid="mobile-background-tasks">
    <header class="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Background tasks</h2>
      <span class="text-xs font-medium text-slate-500" data-testid="mobile-background-tasks-counts">{{ countsLabel }}</span>
    </header>
    <ul>
      <li
        v-for="task in tasks"
        :key="task.taskId"
        class="border-b border-slate-100 px-4 py-3 last:border-b-0"
        data-testid="mobile-background-task"
        :data-status="task.status"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="min-w-0 line-clamp-2 break-words text-[0.9375rem] font-semibold text-slate-900">{{ titleOf(task) }}</p>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="STATUS_CLASS[task.status]">{{ STATUS_LABEL[task.status] }}</span>
        </div>
        <p v-if="commandOf(task)" class="mt-1 line-clamp-2 break-all font-mono text-xs text-slate-500" data-testid="mobile-background-task-command">{{ commandOf(task) }}</p>
        <p v-if="endOf(task)" class="mt-1 line-clamp-3 break-words text-sm text-slate-700" data-testid="mobile-background-task-end">{{ endOf(task) }}</p>
        <p class="mt-1 text-xs text-slate-500" data-testid="mobile-background-task-started">Started {{ startedLabel(task.startedAt) }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { BackgroundTaskPanelRow, BackgroundTaskPanelStatus } from '~/types/backgroundTaskView';

/** Rows as the desktop panel shows them (`useBackgroundTaskPanelView`), newest first. */
const props = defineProps<{ tasks: readonly BackgroundTaskPanelRow[] }>();
const { resolvedLocale } = useLocalization();

const STATUS_LABEL: Record<BackgroundTaskPanelStatus, string> = {
  running: 'Running', completed: 'Completed', failed: 'Failed', stopped: 'Stopped', unknown: 'Unknown',
};
const STATUS_CLASS: Record<BackgroundTaskPanelStatus, string> = {
  running: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  stopped: 'bg-slate-100 text-slate-600',
  unknown: 'bg-amber-50 text-amber-800',
};

const countsLabel = computed(() => {
  const running = props.tasks.filter((task) => task.status === 'running').length;
  return running ? `${running} running` : `${props.tasks.length} ended`;
});

/** Its description, else its command, else a plain name. */
const titleOf = (task: BackgroundTaskPanelRow): string => task.description.trim() || task.command?.trim() || 'Background task';

/** The command, unless unknown or already the title (Antigravity and native titles are the command). */
const commandOf = (task: BackgroundTaskPanelRow): string | null => {
  const command = task.command?.trim();
  return command && command !== titleOf(task) ? command : null;
};

/** How an ended task ended: the runtime's summary (for example "exit code 1"), or a polled task's exit code. */
const endOf = (task: BackgroundTaskPanelRow): string | null => {
  if (task.status === 'running') return null;
  if ('exitCode' in task && task.exitCode !== null) return `exit code ${task.exitCode}`;
  return task.summary?.trim() || null;
};

const startedLabel = (iso: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  const sameDay = at.toDateString() === new Date().toDateString();
  return sameDay
    ? at.toLocaleTimeString(resolvedLocale.value, { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleString(resolvedLocale.value, { dateStyle: 'short', timeStyle: 'short' });
};
</script>
