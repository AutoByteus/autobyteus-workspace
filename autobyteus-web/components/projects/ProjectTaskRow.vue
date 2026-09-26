<template>
  <li :data-testid="`project-task-row-${task.taskId}`" :data-status="task.status">
    <button
      type="button"
      class="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      :aria-label="t('projects.components.projects.ProjectTaskRow.openAriaLabel', { summary, status: statusLabel })"
      data-testid="project-task-open"
      @click="emit('open', task)"
    >
      <span
        class="inline-flex w-24 flex-shrink-0 justify-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
        :class="statusClass"
        data-testid="project-task-status"
      >
        {{ statusLabel }}
      </span>
      <span class="min-w-0 flex-1 truncate text-sm text-slate-900" data-testid="project-task-summary">{{ summary }}</span>
      <span class="flex-shrink-0 text-xs text-slate-500" data-testid="project-task-updated">
        <time :datetime="task.updatedAt">{{ updatedLabel }}</time>
      </span>
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusLabelKey'
import type { ProjectTask } from '~/types/project'
import { taskSummary } from '~/utils/projects/taskSummary'
import { relativeTimeMessage } from '~/utils/projects/relativeTime'

const props = defineProps<{
  task: ProjectTask
  /** Current time in ms; passed in so a list can refresh all rows together. */
  now: number
}>()

const emit = defineEmits<{ (e: 'open', task: ProjectTask): void }>()

const { t } = useLocalization()

const STATUS_CLASSES: Record<ProjectTask['status'], string> = {
  TODO: 'bg-slate-50 text-slate-700 ring-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  DONE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const summary = computed(() => taskSummary(props.task.description))
const statusLabel = computed(() => t(TASK_STATUS_LABEL_KEYS[props.task.status]))
const statusClass = computed(() => STATUS_CLASSES[props.task.status])
const updatedLabel = computed(() => {
  const message = relativeTimeMessage(props.task.updatedAt, props.now)
  return message ? t(message.key, message.params) : new Date(props.task.updatedAt).toLocaleDateString()
})
</script>
