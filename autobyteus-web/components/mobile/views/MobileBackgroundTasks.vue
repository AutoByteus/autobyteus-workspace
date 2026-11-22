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
        class="border-b border-slate-100 last:border-b-0"
        data-testid="mobile-background-task"
        :data-status="task.status"
      >
        <!-- A tap shows the full command and end summary, as the desktop panel's expand does (autobyteus-590 D-7). -->
        <button
          type="button"
          class="block min-h-[2.75rem] w-full px-4 py-3 text-left active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          :aria-expanded="isExpanded(task)"
          data-testid="mobile-background-task-toggle"
          @click="toggle(task)"
        >
          <span class="flex items-start justify-between gap-3">
            <!-- The title is often the command itself (Antigravity, native): it unfolds too. -->
            <span
              class="min-w-0 break-words text-[0.9375rem] font-semibold text-slate-900"
              :class="isExpanded(task) ? 'whitespace-pre-wrap' : 'line-clamp-2'"
              data-testid="mobile-background-task-title"
            >{{ titleOf(task) }}</span>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="STATUS_CLASS[task.status]">{{ STATUS_LABEL[task.status] }}</span>
          </span>
          <span
            v-if="commandOf(task)"
            class="mt-1 block break-all font-mono text-xs text-slate-500"
            :class="isExpanded(task) ? 'whitespace-pre-wrap' : 'line-clamp-2'"
            data-testid="mobile-background-task-command"
          >{{ commandOf(task) }}</span>
          <span
            v-if="endOf(task)"
            class="mt-1 block break-words text-sm text-slate-700"
            :class="isExpanded(task) ? 'whitespace-pre-wrap' : 'line-clamp-3'"
            data-testid="mobile-background-task-end"
          >{{ endOf(task) }}</span>
          <span class="mt-1 block text-xs text-slate-500" data-testid="mobile-background-task-started">Started {{ startedLabel(task.startedAt) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { describeBackgroundTaskEnd } from '~/utils/backgroundTaskEnd';
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

/** The tasks the reader opened; a task not listed any more drops out on its own. */
const expanded = ref(new Set<string>());
const isExpanded = (task: BackgroundTaskPanelRow): boolean => expanded.value.has(task.taskId);
const toggle = (task: BackgroundTaskPanelRow): void => {
  const next = new Set(expanded.value);
  if (!next.delete(task.taskId)) next.add(task.taskId);
  expanded.value = next;
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

const END_LINE = {
  time_limit: 'Stopped: it reached its time limit — not a failure of the command',
  low_memory: 'Stopped: the computer was low on memory',
  run_ended: 'Stopped: the run ended',
} as const;

/** How an ended task ended (`describeBackgroundTaskEnd`), else the runtime's summary as it is. */
const endOf = (task: BackgroundTaskPanelRow): string | null => {
  if (task.status === 'running') return null;
  const end = describeBackgroundTaskEnd(task);
  if (end) return end.kind === 'exit_code' ? `exit code ${end.code}` : END_LINE[end.kind];
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
