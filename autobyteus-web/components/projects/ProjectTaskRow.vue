<template>
  <!-- The row opens the Task (a stretched link); the Task's root sits beneath the text and opens the
       worker. A Task that just arrived or moved live is highlighted for 2.4 s (project-manager-ux). -->
  <div
    class="project-task-row relative px-4 py-3.5 transition-colors hover:bg-slate-50"
    :class="live ? `is-live-${live}` : ''"
    :data-testid="`project-task-row-${task.taskId}`"
    :data-live="live || undefined"
  >
    <NuxtLink
      :to="taskRoute"
      class="block w-full text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-blue-500"
      :aria-label="summary"
      data-testid="project-task-row-link"
    >
      <span class="block line-clamp-2 break-words text-sm font-medium leading-6 text-slate-800" data-testid="project-task-row-text">{{ summary }}</span>
      <span v-if="preview" class="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{{ preview }}</span>
      <span v-if="fileCount" class="mt-2 inline-flex items-center gap-1 text-xs text-slate-500" data-testid="task-row-file-count"><Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5" aria-hidden="true" />{{ t(fileCount === 1 ? 'projects.ui.fileCountOne' : 'projects.ui.fileCount', {count: fileCount}) }}</span>
    </NuxtLink>
    <ProjectTaskWorkers v-if="task.root" class="relative z-10" density="row" :root="task.root" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ProjectTask, TaskWithoutProject } from '~/types/project'
import ProjectTaskWorkers from './ProjectTaskWorkers.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { taskSummary } from '~/utils/projects/taskSummary'

// The first line is the summary; remaining lines are a quieter context preview.
const props = defineProps<{ task: ProjectTask | TaskWithoutProject }>()

const {t} = useLocalization()
const store = useProjectTaskStore()
const summary = computed(() => taskSummary(props.task.description))
const preview = computed(() => props.task.description.trim().split(/\r?\n/).slice(1).filter(line => line.trim()).join(' '))
const taskRoute = computed(() => 'projectId' in props.task
  ? `/projects/${props.task.projectId}/tasks/${props.task.taskId}`
  : `/projects/temp-tasks/tasks/${props.task.taskId}`)
const fileCount = computed(() => 'contextFiles' in props.task ? props.task.contextFiles?.length ?? 0 : 0)
const live = computed(() => store.liveChanges[props.task.taskId] ?? null)
</script>

<style scoped>
/* A Task an agent just wrote (or moved) shows a soft indigo wash and left bar that fade over 2.4 s. */
.project-task-row.is-live-moved { animation: task-live 2400ms ease-out both; }
.project-task-row.is-live-arrived { animation: task-arrive 2400ms ease-out both; }
@keyframes task-live {
  0%, 35% { background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  100% { background-color: transparent; box-shadow: inset 2px 0 transparent; }
}
@keyframes task-arrive {
  0% { opacity: 0; transform: translateY(-4px); background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  8% { opacity: 1; transform: none; }
  35% { background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  100% { background-color: transparent; box-shadow: inset 2px 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .project-task-row.is-live-moved, .project-task-row.is-live-arrived { animation: none; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
}
</style>
