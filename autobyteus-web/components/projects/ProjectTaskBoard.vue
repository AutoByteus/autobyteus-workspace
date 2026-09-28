<template>
  <div class="project-task-board" data-testid="project-task-board">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative min-w-0 flex-1">
        <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectTaskBoard.searchLabel') }}</label>
        <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          :id="searchId"
          v-model="searchQuery"
          type="search"
          data-testid="project-tasks-search-input"
          class="block w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectTaskBoard.searchPlaceholder')"
        />
      </div>
      <button
        type="button"
        class="inline-flex flex-shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 sm:self-auto"
        data-testid="project-tasks-new-button"
        @click="openDialog(null)"
      >
        <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
        {{ t('projects.components.projects.ProjectTaskBoard.newTask') }}
      </button>
    </div>

    <p v-if="boardState === 'loading'" class="mt-6 py-10 text-center text-sm text-slate-500" role="status" data-testid="project-tasks-loading">
      {{ t('projects.components.projects.ProjectTaskBoard.loading') }}
    </p>

    <div v-else-if="boardState === 'error'" class="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="project-tasks-error">
      <p class="font-semibold">{{ t('projects.components.projects.ProjectTaskBoard.loadFailed') }}</p>
      <p class="mt-1">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="load(true)"
      >
        {{ t('projects.common.retry') }}
      </button>
    </div>

    <div v-else-if="isNoMatch" class="mt-6 py-10 text-center" role="status" data-testid="project-tasks-no-match">
      <p class="text-sm text-slate-600">{{ t('projects.components.projects.ProjectTaskBoard.noMatch') }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="project-tasks-clear-search"
        @click="clearSearch"
      >
        {{ t('projects.components.projects.ProjectTaskBoard.clearSearch') }}
      </button>
    </div>

    <div v-else class="project-task-board__columns mt-5" data-testid="project-task-columns">
      <section
        v-for="status in PROJECT_TASK_STATUSES"
        :key="status"
        class="min-w-0"
        :aria-labelledby="columnHeadingId(status)"
        :data-testid="`project-task-column-${status}`"
      >
        <h2 :id="columnHeadingId(status)" class="flex items-baseline gap-2 px-1 pb-2 text-sm font-semibold text-slate-700">
          <span>{{ t(TASK_STATUS_LABEL_KEYS[status]) }}</span>
          <span class="font-normal text-slate-500" data-testid="project-task-column-count">{{ columns[status].length }}</span>
        </h2>
        <p v-if="columns[status].length === 0" class="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400" data-testid="project-task-column-empty">
          {{ t('projects.components.projects.ProjectTaskBoard.noTasks') }}
        </p>
        <ul v-else class="space-y-2">
          <li v-for="task in columns[status]" :key="task.taskId">
            <ProjectTaskCard :task="task" @open="openDialog" />
          </li>
        </ul>
      </section>
    </div>

    <ProjectTaskDialog
      v-if="dialog.open"
      :project-id="projectId"
      :task="dialog.task"
      @close="closeDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ProjectTaskCard from '~/components/projects/ProjectTaskCard.vue'
import ProjectTaskDialog from '~/components/projects/ProjectTaskDialog.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { PROJECT_TASK_STATUSES, type ProjectTask, type ProjectTaskStatus } from '~/types/project'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusLabelKey'

const props = defineProps<{ projectId: string }>()

const { t } = useLocalization()
const projectTaskStore = useProjectTaskStore()
const windowNodeContextStore = useWindowNodeContextStore()

const uid = Math.random().toString(36).slice(2, 8)
const searchId = `project-tasks-search-${uid}`
const columnHeadingId = (status: ProjectTaskStatus) => `project-task-column-${status}-${uid}`

const searchQuery = ref('')
const dialog = reactive<{ open: boolean; task: ProjectTask | null }>({ open: false, task: null })

const list = computed(() => projectTaskStore.getList(props.projectId))
const tasks = computed(() => list.value?.tasks ?? [])
const boardState = computed(() => {
  if (!list.value || (list.value.status === 'loading' && tasks.value.length === 0)) return 'loading'
  return list.value.status === 'error' ? 'error' : 'ready'
})
const loadError = computed(() => list.value?.error?.message ?? null)

// Search applies to all Tasks; the (already newest-first) result is split into the three columns (QR-002).
const matchingTasks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return query ? tasks.value.filter((task) => task.description.toLocaleLowerCase().includes(query)) : tasks.value
})

const columns = computed<Record<ProjectTaskStatus, ProjectTask[]>>(() => {
  const grouped: Record<ProjectTaskStatus, ProjectTask[]> = { TODO: [], IN_PROGRESS: [], DONE: [] }
  for (const task of matchingTasks.value) {
    grouped[task.status].push(task)
  }
  return grouped
})

const isNoMatch = computed(() => searchQuery.value.trim().length > 0 && tasks.value.length > 0 && matchingTasks.value.length === 0)

const load = (force = false): void => {
  void projectTaskStore.fetchTasks(props.projectId, force).catch(() => undefined)
}

const clearSearch = (): void => {
  searchQuery.value = ''
  document.getElementById(searchId)?.focus()
}

const openDialog = (task: ProjectTask | null): void => {
  dialog.task = task
  dialog.open = true
}

const closeDialog = (): void => {
  dialog.open = false
  dialog.task = null
}

onMounted(() => load(true))

watch(() => props.projectId, () => {
  searchQuery.value = ''
  closeDialog()
  load(true)
})

// The store drops its lists when the window is rebound to another node; reload for the new node.
watch(() => windowNodeContextStore.bindingRevision, () => load(true))
</script>

<style scoped>
/*
 * The columns sit side by side only when the board itself is wide enough for three
 * columns of at least 240px (3 × 240px + 2 × 16px gap = 752px); otherwise they stack.
 * This follows the board's own width (a widened side panel or a small window), not the viewport.
 */
.project-task-board {
  container-type: inline-size;
  container-name: project-task-board;
}

.project-task-board__columns {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
}

@container project-task-board (min-width: 752px) {
  .project-task-board__columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
