<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50" data-testid="project-task-page">
    <div class="w-full max-w-[1040px] px-4 py-5 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1"><NuxtLink :to="boardTarget" class="inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="task-back-to-board"><Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />{{ t('projects.ui.backTasks') }}</NuxtLink><span v-if="project" class="min-w-0 break-words border-l border-slate-300 pl-3 text-sm text-slate-500" data-testid="task-project-context">{{ project.name }}</span></div>
      <p v-if="loading" role="status" class="mt-5 text-sm text-slate-500">{{ t('projects.components.projects.ProjectTaskBoard.loading') }}</p>
      <div v-else-if="loadError" role="alert" class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ loadError }} <button type="button" @click="load">{{ t('projects.common.retry') }}</button></div>
      <div v-else-if="!project || !task" class="mt-5 rounded-xl border border-slate-200 bg-white p-6" role="status" data-testid="task-page-not-found"><h1 ref="heading" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">{{ t(project ? 'projects.ui.taskMissingTitle' : 'projects.components.projects.ProjectDetail.notFoundTitle') }}</h1><p class="mt-2 text-sm text-slate-600">{{ t(project ? 'projects.ui.taskMissingHelp' : 'projects.ui.projectMissingHelp') }}</p><NuxtLink :to="project ? boardTarget : '/projects'" class="mt-4 inline-block text-sm font-medium text-blue-700">{{ t(project ? 'projects.ui.backTasks' : 'projects.ui.backProjects') }}</NuxtLink></div>
      <template v-else>
        <header class="mb-4 mt-4 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3"><h1 ref="heading" tabindex="-1" class="text-2xl font-semibold tracking-tight text-slate-900 outline-none" data-testid="task-page-heading">{{ t('projects.ui.taskDetails') }}</h1><span class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(task.status)" data-testid="task-page-status">{{ t(TASK_STATUS_LABEL_KEYS[task.status]) }}</span></div>
          <div class="flex flex-wrap items-center gap-2"><NuxtLink :to="`${detailTarget}/edit`" :class="secondaryButton" data-testid="task-page-edit"><Icon icon="heroicons:pencil-square" class="mr-2 h-4 w-4" aria-hidden="true" />{{ t('projects.ui.editTask') }}</NuxtLink><button ref="deleteButton" type="button" :disabled="busy" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60" data-testid="task-page-delete" @click="requestDelete"><Icon icon="heroicons:trash" class="h-4 w-4" aria-hidden="true" />{{ t('projects.ui.deleteTask') }}</button></div>
        </header>
        <p v-if="notice" class="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" data-testid="task-page-save-notice">{{ notice }}</p>
        <section v-if="confirmingDelete" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4" aria-labelledby="task-delete-heading" data-testid="task-page-delete-confirmation" @keydown.esc.prevent="cancelDelete">
          <h2 id="task-delete-heading" class="font-semibold text-red-900">{{ t('projects.components.projects.ProjectTaskEditor.deleteTitle') }}</h2><p class="mt-2 break-words text-sm leading-6 text-red-800">{{ t('projects.components.projects.ProjectTaskEditor.deleteMessage', {summary: taskSummaryLabel(task.description)}) }}</p>
          <p v-if="deleteError" role="alert" class="mt-3 text-sm text-red-700">{{ deleteError }}</p>
          <div class="mt-4 flex flex-wrap justify-end gap-3"><button ref="deleteCancel" type="button" :disabled="busy" :class="secondaryButton" data-testid="task-page-delete-cancel" @click="cancelDelete">{{ t('projects.common.cancel') }}</button><button type="button" :disabled="busy" class="inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60" data-testid="task-page-delete-confirm" @click="remove">{{ t(busy ? 'projects.components.projects.ProjectTaskEditor.deleting' : 'projects.ui.deleteTask') }}</button></div>
        </section>
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="task-description-heading" data-testid="task-page-reading-surface">
          <div class="p-5 sm:p-6"><h2 id="task-description-heading" class="text-xs font-medium text-slate-500">{{ t('projects.ui.description') }}</h2><p class="mt-3 max-w-[80ch] whitespace-pre-wrap break-words text-base leading-7 text-slate-800" data-testid="task-page-description">{{ task.description }}</p><section v-if="task.contextFiles?.length" class="mt-6 border-t border-slate-100 pt-5" aria-labelledby="task-context-files-heading" data-testid="task-page-context-files"><h2 id="task-context-files-heading" class="mb-3 text-sm font-medium text-slate-600">{{ t('projects.ui.contextFiles') }} ({{ task.contextFiles.length }})</h2><TaskContextFiles :files="task.contextFiles" :client="client" :saved-filenames="task.contextFiles.map((f) => f.storedFilename)" /></section></div>
        </section>
        <TaskRootSection :root="task.root ?? null" />
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskPage } from '~/composables/projects/useProjectTaskPage'
import { useProjectNotice } from '~/composables/projects/useProjectNotice'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { createProjectTaskContextClient } from '~/services/projects/projectTaskContextClient'
import { TASK_STATUS_LABEL_KEYS, taskStatusPillClass } from '~/utils/projects/taskStatusPresentation'
import { taskSummaryLabel } from '~/utils/projects/taskSummary'
import TaskContextFiles from './TaskContextFiles.vue'
import TaskRootSection from './TaskRootSection.vue'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
const props = defineProps<{projectId: string; taskId: string}>()
const {t} = useLocalization(), router = useRouter(), store = useProjectTaskStore()
useProjectChangeFeed()
const {project, task, loading, error: loadError, heading, current, load} = useProjectTaskPage(props.projectId, props.taskId)
const client = createProjectTaskContextClient(props.projectId, props.taskId, current)
const boardTarget = `/projects/${props.projectId}`, detailTarget = `${boardTarget}/tasks/${props.taskId}`
const notice = useProjectNotice({saved: t('projects.ui.saved')})
const busy = ref(false), confirmingDelete = ref(false), deleteError = ref('')
const deleteCancel = ref<HTMLButtonElement | null>(null), deleteButton = ref<HTMLButtonElement | null>(null)
const secondaryButton = 'inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60'
const requestDelete = async () => {confirmingDelete.value = true; deleteError.value = ''; await nextTick(); deleteCancel.value?.focus()}
const cancelDelete = async () => {if (busy.value) return; confirmingDelete.value = false; await nextTick(); deleteButton.value?.focus()}
const remove = async () => {
  if (busy.value || !current()) return
  busy.value = true; deleteError.value = ''
  try {await store.deleteTask(props.projectId, props.taskId, current); if (current()) await router.push({path: boardTarget, query: {notice: 'task-deleted'}})}
  catch (e) {if (current()) deleteError.value = e instanceof Error ? e.message : t('projects.errors.requestFailed')}
  finally {if (current()) busy.value = false}
}
</script>
