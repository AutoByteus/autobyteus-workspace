<template>
  <!-- A Task inside the Projects tab (REQ-010): read only and live; editing stays on the Task page. -->
  <div data-testid="projects-panel-task">
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="projects-panel-task-back"
        @click="emit('back')"
      >
        <Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />{{ t('projects.panel.back') }}
      </button>
      <NuxtLink
        :to="pageRoute"
        class="inline-flex min-h-9 items-center gap-1 rounded-md px-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="projects-panel-task-open-page"
      >
        {{ t('projects.panel.openInProjects') }}<Icon icon="heroicons:arrow-top-right-on-square" class="h-4 w-4" aria-hidden="true" />
      </NuxtLink>
    </div>

    <p v-if="!task && listLoaded" class="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status" data-testid="projects-panel-task-missing">{{ t('projects.panel.taskMissing') }}</p>
    <template v-else-if="task">
      <section class="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="projects-panel-task-description">
        <div class="p-4">
          <div class="flex items-center justify-between gap-2">
            <h2 id="projects-panel-task-description" class="text-xs font-medium text-slate-500">{{ t('projects.ui.description') }}</h2>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700" data-testid="projects-panel-task-status">{{ statusLabel }}</span>
          </div>
          <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800" data-testid="projects-panel-task-description">{{ task.description }}</p>
          <section v-if="contextFiles.length" class="mt-4 border-t border-slate-100 pt-3" data-testid="projects-panel-task-context-files">
            <h3 class="mb-2 text-xs font-medium text-slate-600">{{ t('projects.ui.contextFiles') }} ({{ contextFiles.length }})</h3>
            <TaskContextFiles v-if="client" :files="contextFiles" :client="client" :saved-filenames="contextFiles.map((file) => file.storedFilename)" />
          </section>
          <section v-if="referenceFiles.length" class="mt-4 border-t border-slate-100 pt-3" data-testid="projects-panel-task-reference-files">
            <h3 class="mb-2 text-xs font-medium text-slate-600">{{ t('projects.temp.referenceFiles') }} ({{ referenceFiles.length }})</h3>
            <ul class="space-y-1">
              <li v-for="path in referenceFiles" :key="path" class="flex min-w-0 items-center gap-2 text-xs text-slate-700">
                <Icon icon="heroicons:document-text" class="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" /><span class="truncate font-mono" :title="path">{{ path }}</span>
              </li>
            </ul>
          </section>
        </div>
      </section>
      <TaskRootSection :root="task.root ?? null" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import TaskContextFiles from '~/components/projects/TaskContextFiles.vue'
import TaskRootSection from '~/components/projects/TaskRootSection.vue'
import { useLocalization } from '~/composables/useLocalization'
import { createProjectTaskContextClient } from '~/services/projects/projectTaskContextClient'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectsPanelChoice } from '~/stores/projectsPanelStore'
import type { ProjectTask, TaskWithoutProject } from '~/types/project'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusLabelKey'

const props = defineProps<{ choice: ProjectsPanelChoice; taskId: string }>()
const emit = defineEmits<{ (event: 'back'): void }>()
const { t } = useLocalization()
const store = useProjectTaskStore()

const list = computed(() => props.choice.kind === 'project' ? store.getList(props.choice.projectId) : store.getTempList())
const listLoaded = computed(() => Boolean(list.value?.hasLoaded))
const task = computed<ProjectTask | TaskWithoutProject | null>(() => (list.value?.tasks as Array<ProjectTask | TaskWithoutProject> | undefined)
  ?.find((item) => item.taskId === props.taskId) ?? null)
const contextFiles = computed(() => task.value && 'contextFiles' in task.value ? task.value.contextFiles ?? [] : [])
const referenceFiles = computed(() => task.value && 'referenceFiles' in task.value ? task.value.referenceFiles : [])
const client = computed(() => props.choice.kind === 'project' ? createProjectTaskContextClient(props.choice.projectId, props.taskId) : null)
const pageRoute = computed(() => props.choice.kind === 'project'
  ? `/projects/${props.choice.projectId}/tasks/${props.taskId}`
  : `/projects/temp-tasks/tasks/${props.taskId}`)
// Literal keys (localization audit): a Project Task shows its status; a Temp task Open or Done.
const statusLabel = computed(() => {
  if (!task.value) return ''
  if (props.choice.kind === 'project') return t(TASK_STATUS_LABEL_KEYS[task.value.status])
  return t(task.value.status === 'DONE' ? 'projects.temp.lane.done' : 'projects.temp.lane.open')
})
</script>
