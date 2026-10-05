<template>
  <div class="h-full bg-white flex flex-col">
    <!-- Header -->
    <div
      class="px-3 py-2 bg-white border-b border-gray-200 flex justify-between items-center gap-2 flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors select-none"
      data-test="background-tasks-header"
      @click="$emit('toggle')"
    >
      <div class="flex min-w-0 items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="flex-shrink-0 text-gray-500 transition-transform duration-300 transform"
          :class="collapsed ? '-rotate-90' : ''"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <h3 class="truncate text-xs font-bold text-gray-900 tracking-wider leading-none">{{ $t('workspace.components.progress.BackgroundTaskPanel.title') }}</h3>
      </div>
      <span class="flex-shrink-0 whitespace-nowrap text-xs text-gray-600 font-medium" data-test="background-tasks-counts">{{ countsLabel }}</span>
    </div>

    <!-- Content -->
    <div v-show="!collapsed" class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <ul v-if="tasks.length > 0" data-test="background-tasks-list">
        <li
          v-for="task in tasks"
          :key="task.taskId"
          class="px-3 py-2.5 border-b border-gray-100 last:border-b-0"
          data-test="background-task-row"
          :data-status="task.status"
        >
          <div class="flex items-center gap-2 min-w-0">
            <Icon
              :icon="statusVisuals[task.status].icon"
              class="w-4 h-4 flex-shrink-0"
              :class="statusVisuals[task.status].iconClass"
              aria-hidden="true"
            />
            <p class="flex-1 min-w-0 truncate text-sm text-gray-800" :title="descriptionOf(task)">
              {{ descriptionOf(task) }}
            </p>
            <span
              class="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
              :class="statusVisuals[task.status].chipClass"
            >
              {{ $t(`workspace.components.progress.BackgroundTaskPanel.status.${task.status}`) }}
            </span>
          </div>
          <div class="mt-1 pl-6 flex min-w-0 items-start gap-1 text-xs text-gray-500" data-test="background-task-kind-line">
            <span class="flex-shrink-0">{{ $t(`workspace.components.progress.BackgroundTaskPanel.kind.${task.kind}`) }}</span>
            <template v-if="commandOf(task)">
              <span class="flex-shrink-0">·</span>
              <button
                type="button"
                class="flex-1 min-w-0 text-left font-mono text-gray-500 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="expandedCommands.has(task.taskId) ? 'whitespace-pre-wrap break-all' : 'truncate'"
                :title="commandOf(task) ?? undefined"
                :aria-expanded="expandedCommands.has(task.taskId)"
                data-test="background-task-command"
                @click="toggle(expandedCommands, task.taskId)"
              >{{ commandOf(task) }}</button>
            </template>
          </div>
          <button
            v-if="task.status !== 'running' && task.summary"
            type="button"
            class="mt-1 ml-6 max-w-[calc(100%-1.5rem)] text-left text-xs text-gray-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="expandedSummaries.has(task.taskId) ? 'whitespace-pre-wrap break-words' : 'line-clamp-2 break-words'"
            :title="task.summary"
            :aria-expanded="expandedSummaries.has(task.taskId)"
            data-test="background-task-summary"
            @click="toggle(expandedSummaries, task.taskId)"
          >
            {{ task.summary }}
          </button>
        </li>
      </ul>

      <div v-else class="p-8 text-center text-gray-700 text-sm" data-test="background-tasks-empty">
        {{ $t('workspace.components.progress.BackgroundTaskPanel.empty') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Icon } from '@iconify/vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentBackgroundTaskStore } from '~/stores/agentBackgroundTaskStore';
import { useLocalization } from '~/composables/useLocalization';
import type { BackgroundTask, BackgroundTaskStatus } from '~/types/backgroundTask';

defineProps<{
  collapsed?: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const backgroundTaskStore = useAgentBackgroundTaskStore();
const activeContextStore = useActiveContextStore();
const { t } = useLocalization();

const currentAgentRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? '');

const tasks = computed(() => currentAgentRunId.value ? backgroundTaskStore.getTasks(currentAgentRunId.value) : []);
const counts = computed(() => currentAgentRunId.value
  ? backgroundTaskStore.getCounts(currentAgentRunId.value)
  : { running: 0, total: 0 });
const countsLabel = computed(() => t('workspace.components.progress.BackgroundTaskPanel.counts', {
  running: counts.value.running,
  total: counts.value.total,
}));

const descriptionOf = (task: BackgroundTask): string =>
  task.description.trim() || t('workspace.components.progress.BackgroundTaskPanel.untitled');

/** The command, unless unknown, blank, or already shown as the title (AGY titles are the command). */
const commandOf = (task: BackgroundTask): string | null => {
  const command = task.command?.trim();
  return command && command !== descriptionOf(task) ? task.command : null;
};

const statusVisuals: Record<BackgroundTaskStatus, { icon: string; iconClass: string; chipClass: string }> = {
  running: {
    icon: 'heroicons:arrow-path',
    iconClass: 'text-blue-500 motion-safe:animate-spin',
    chipClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  completed: {
    icon: 'heroicons:check-circle-solid',
    iconClass: 'text-green-500',
    chipClass: 'bg-green-50 text-green-700 border-green-200',
  },
  failed: {
    icon: 'heroicons:x-circle-solid',
    iconClass: 'text-red-500',
    chipClass: 'bg-red-50 text-red-700 border-red-200',
  },
  stopped: {
    icon: 'heroicons:stop-circle-solid',
    iconClass: 'text-gray-400',
    chipClass: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const expandedSummaries = reactive(new Set<string>());
const expandedCommands = reactive(new Set<string>());
const toggle = (expanded: Set<string>, taskId: string) => {
  if (expanded.has(taskId)) expanded.delete(taskId);
  else expanded.add(taskId);
};
</script>
