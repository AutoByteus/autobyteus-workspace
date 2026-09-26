<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm" :aria-labelledby="headingId" data-testid="project-tasks-panel">
    <h2 :id="headingId" class="sr-only">{{ t('projects.components.projects.ProjectDetail.tabs.tasks') }}</h2>

    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
      <div class="relative min-w-0 flex-1">
        <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectTasksPanel.searchLabel') }}</label>
        <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          :id="searchId"
          v-model="searchQuery"
          type="search"
          data-testid="project-tasks-search-input"
          class="block w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectTasksPanel.searchPlaceholder')"
        />
      </div>
      <div class="flex items-center gap-3">
        <label :for="filterId" class="sr-only">{{ t('projects.components.projects.ProjectTasksPanel.statusFilterLabel') }}</label>
        <select
          :id="filterId"
          v-model="statusFilter"
          data-testid="project-tasks-status-filter"
          class="rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">{{ t('projects.components.projects.ProjectTasksPanel.statusAll') }}</option>
          <option v-for="status in PROJECT_TASK_STATUSES" :key="status" :value="status">{{ t(TASK_STATUS_LABEL_KEYS[status]) }}</option>
        </select>
        <button
          type="button"
          class="inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          data-testid="project-tasks-new-button"
          @click="openDialog(null)"
        >
          <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
          {{ t('projects.components.projects.ProjectTasksPanel.newTask') }}
        </button>
      </div>
    </div>

    <div v-if="listState === 'loading'" class="px-5 py-12 text-center text-sm text-slate-500" role="status" data-testid="project-tasks-loading">
      {{ t('projects.components.projects.ProjectTasksPanel.loading') }}
    </div>

    <div v-else-if="listState === 'error'" class="m-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="project-tasks-error">
      <p class="font-semibold">{{ t('projects.components.projects.ProjectTasksPanel.loadFailed') }}</p>
      <p class="mt-1">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="load(true)"
      >
        {{ t('projects.common.retry') }}
      </button>
    </div>

    <p v-else-if="tasks.length === 0" class="px-5 py-12 text-center text-sm text-slate-500" data-testid="project-tasks-empty">
      {{ t('projects.components.projects.ProjectTasksPanel.empty') }}
    </p>

    <div v-else-if="visibleTasks.length === 0" class="px-5 py-12 text-center" role="status" data-testid="project-tasks-no-match">
      <p class="text-sm text-slate-600">{{ t('projects.components.projects.ProjectTasksPanel.noMatch') }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="project-tasks-clear-filters"
        @click="clearFilters"
      >
        {{ t('projects.components.projects.ProjectTasksPanel.clearFilters') }}
      </button>
    </div>

    <ul v-else class="divide-y divide-slate-100" data-testid="project-task-list">
      <ProjectTaskRow v-for="task in visibleTasks" :key="task.taskId" :task="task" :now="now" @open="openDialog" />
    </ul>

    <ProjectTaskDialog
      v-if="dialog.open"
      :project-id="projectId"
      :task="dialog.task"
      @close="closeDialog"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ProjectTaskDialog from '~/components/projects/ProjectTaskDialog.vue'
import ProjectTaskRow from '~/components/projects/ProjectTaskRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusLabelKey'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { PROJECT_TASK_STATUSES, type ProjectTask, type ProjectTaskStatus } from '~/types/project'

const props = defineProps<{ projectId: string }>()

const { t } = useLocalization()
const projectTaskStore = useProjectTaskStore()
const windowNodeContextStore = useWindowNodeContextStore()

const uid = Math.random().toString(36).slice(2, 8)
const headingId = `project-tasks-heading-${uid}`
const searchId = `project-tasks-search-${uid}`
const filterId = `project-tasks-filter-${uid}`

const searchQuery = ref('')
const statusFilter = ref<ProjectTaskStatus | 'ALL'>('ALL')
const dialog = reactive<{ open: boolean; task: ProjectTask | null }>({ open: false, task: null })
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

const list = computed(() => projectTaskStore.getList(props.projectId))
const tasks = computed(() => list.value?.tasks ?? [])
const listState = computed(() => {
  if (!list.value || (list.value.status === 'loading' && tasks.value.length === 0)) return 'loading'
  return list.value.status === 'error' ? 'error' : 'ready'
})
const loadError = computed(() => list.value?.error?.message ?? null)

// Client-side filtering over the loaded, already sorted list (QR-002).
const visibleTasks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return tasks.value.filter((task) => (
    (statusFilter.value === 'ALL' || task.status === statusFilter.value)
    && (!query || task.description.toLocaleLowerCase().includes(query))
  ))
})

const load = (force = false): void => {
  void projectTaskStore.fetchTasks(props.projectId, force).catch(() => undefined)
}

const clearFilters = (): void => {
  searchQuery.value = ''
  statusFilter.value = 'ALL'
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

onMounted(() => {
  load(true)
  clock = setInterval(() => { now.value = Date.now() }, 60_000)
})

onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
})

watch(() => props.projectId, () => {
  searchQuery.value = ''
  statusFilter.value = 'ALL'
  closeDialog()
  load(true)
})

// The store drops its lists when the window is rebound to another node; reload for the new node.
watch(() => windowNodeContextStore.bindingRevision, () => load(true))
</script>
