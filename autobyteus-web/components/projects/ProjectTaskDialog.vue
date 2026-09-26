<template>
  <ProjectDialogFrame :title="title" :busy="busy" size="lg" test-id="project-task-dialog" @close="emit('close')">
    <!-- View: full description, status and times -->
    <div v-if="mode === 'view' && current" data-testid="project-task-view">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span class="rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-700 ring-1 ring-inset ring-slate-200" data-testid="project-task-view-status">
          {{ t(TASK_STATUS_LABEL_KEYS[current.status]) }}
        </span>
        <span>{{ t('projects.components.projects.ProjectTaskDialog.updated', { time: formatDateTime(current.updatedAt) }) }}</span>
      </div>
      <p class="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800" data-testid="project-task-view-description">{{ current.description }}</p>
    </div>

    <!-- Delete confirmation -->
    <div v-else-if="mode === 'confirmDelete' && current" data-testid="project-task-delete-confirm">
      <p class="text-sm text-slate-700">{{ t('projects.components.projects.ProjectTaskDialog.deleteMessage', { summary: currentSummary }) }}</p>
    </div>

    <!-- Create / edit: one multi-line description -->
    <form v-else :id="formId" novalidate @submit.prevent="save">
      <label :for="descriptionId" class="block text-sm font-medium text-slate-700">
        {{ t('projects.components.projects.ProjectTaskDialog.descriptionLabel') }}
      </label>
      <textarea
        :id="descriptionId"
        v-model="draft"
        rows="10"
        data-dialog-initial-focus
        data-testid="project-task-description-input"
        class="mt-1 block w-full rounded-md border px-3 py-2 text-sm leading-6 text-slate-900 shadow-sm focus:outline-none focus:ring-2"
        :class="fieldError ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'"
        :placeholder="t('projects.components.projects.ProjectTaskDialog.descriptionPlaceholder')"
        :aria-invalid="fieldError ? 'true' : 'false'"
        :aria-describedby="fieldError ? fieldErrorId : helpId"
        :disabled="busy"
        @keydown.enter.ctrl.exact.prevent="save"
        @keydown.enter.meta.exact.prevent="save"
      />
      <p v-if="fieldError" :id="fieldErrorId" role="alert" class="mt-1 text-sm text-red-600" data-testid="project-task-description-error">
        {{ fieldError }}
      </p>
      <p v-else :id="helpId" class="mt-1 text-xs text-slate-500">
        {{ t('projects.components.projects.ProjectTaskDialog.descriptionHelp') }}
      </p>
    </form>

    <p v-if="formError" role="alert" class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="project-task-error">
      {{ formError }}
    </p>

    <template #actions>
      <template v-if="mode === 'view'">
        <button type="button" :class="dangerButton" data-testid="project-task-delete" @click="setMode('confirmDelete')">
          {{ t('projects.components.projects.ProjectTaskDialog.delete') }}
        </button>
        <button type="button" :class="secondaryButton" data-testid="project-task-close" @click="emit('close')">
          {{ t('projects.components.projects.ProjectTaskDialog.close') }}
        </button>
        <button type="button" :class="primaryButton" data-dialog-initial-focus data-testid="project-task-edit" @click="setMode('edit')">
          {{ t('projects.components.projects.ProjectTaskDialog.edit') }}
        </button>
      </template>
      <template v-else-if="mode === 'confirmDelete'">
        <button type="button" :class="secondaryButton" :disabled="busy" data-dialog-initial-focus data-testid="project-task-delete-cancel" @click="setMode('view')">
          {{ t('projects.common.cancel') }}
        </button>
        <button type="button" :class="dangerSolidButton" :disabled="busy" data-testid="project-task-delete-confirm-button" @click="confirmDelete">
          {{ busy ? t('projects.components.projects.ProjectTaskDialog.deleting') : t('projects.components.projects.ProjectTaskDialog.confirmDelete') }}
        </button>
      </template>
      <template v-else>
        <button type="button" :class="secondaryButton" :disabled="busy" data-testid="project-task-cancel" @click="cancelEditing">
          {{ t('projects.common.cancel') }}
        </button>
        <button type="submit" :form="formId" :class="primaryButton" :disabled="busy" data-testid="project-task-save">
          {{ busy
            ? t('projects.common.saving')
            : mode === 'create' ? t('projects.components.projects.ProjectTaskDialog.create') : t('projects.components.projects.ProjectTaskDialog.save') }}
        </button>
      </template>
    </template>
  </ProjectDialogFrame>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import ProjectDialogFrame from '~/components/projects/ProjectDialogFrame.vue'
import { useLocalization } from '~/composables/useLocalization'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusLabelKey'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { ProjectTask } from '~/types/project'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'
import { taskSummary } from '~/utils/projects/taskSummary'

type Mode = 'create' | 'view' | 'edit' | 'confirmDelete'

const props = defineProps<{
  projectId: string
  /** The Task to show; omit to create a new one. */
  task?: ProjectTask | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'deleted', taskId: string): void
}>()

const { t } = useLocalization()
const projectTaskStore = useProjectTaskStore()

const current = ref<ProjectTask | null>(props.task ?? null)
const mode = ref<Mode>(props.task ? 'view' : 'create')
const draft = ref('')
const busy = ref(false)
const fieldError = ref<string | null>(null)
const formError = ref<string | null>(null)

const uid = Math.random().toString(36).slice(2, 8)
const formId = `project-task-form-${uid}`
const descriptionId = `project-task-description-${uid}`
const fieldErrorId = `project-task-description-error-${uid}`
const helpId = `project-task-description-help-${uid}`

const secondaryButton = 'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60'
const primaryButton = 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60'
const dangerButton = 'mr-auto rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1'
const dangerSolidButton = 'rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-60'

const currentSummary = computed(() => (current.value ? taskSummary(current.value.description) : ''))

const title = computed(() => {
  switch (mode.value) {
    case 'create':
      return t('projects.components.projects.ProjectTaskDialog.createTitle')
    case 'edit':
      return t('projects.components.projects.ProjectTaskDialog.editTitle')
    case 'confirmDelete':
      return t('projects.components.projects.ProjectTaskDialog.deleteTitle')
    default:
      return currentSummary.value
  }
})

const formatDateTime = (iso: string): string => new Date(iso).toLocaleString()

/** Moves focus to the new mode's preferred control after its markup renders. */
const focusInitialControl = async (): Promise<void> => {
  await nextTick()
  const panel = document.querySelector('[data-testid="project-task-dialog"]')
  const initial = panel?.querySelector<HTMLElement>('[data-dialog-initial-focus]:not([disabled])')
  initial?.focus()
}

const setMode = (next: Mode): void => {
  fieldError.value = null
  formError.value = null
  if (next === 'edit' && current.value) {
    draft.value = current.value.description
  }
  mode.value = next
  void focusInitialControl()
}

const cancelEditing = (): void => {
  if (mode.value === 'create') {
    emit('close')
    return
  }
  setMode('view')
}

const save = async (): Promise<void> => {
  if (busy.value) {
    return
  }
  fieldError.value = null
  formError.value = null
  const description = draft.value.trim()
  if (!description) {
    fieldError.value = t('projects.errors.taskDescriptionRequired')
    void focusInitialControl()
    return
  }

  busy.value = true
  try {
    current.value = mode.value === 'create'
      ? await projectTaskStore.createTask(props.projectId, description)
      : await projectTaskStore.updateTaskDescription(props.projectId, current.value!.taskId, description)
    if (mode.value === 'create') {
      emit('close')
      return
    }
    mode.value = 'view'
    void focusInitialControl()
  } catch (error) {
    const message = t(projectErrorMessageKey(error))
    if ((error as { code?: string | null }).code === 'TASK_DESCRIPTION_REQUIRED') {
      fieldError.value = message
    } else {
      formError.value = message
    }
  } finally {
    busy.value = false
  }
}

const confirmDelete = async (): Promise<void> => {
  if (!current.value || busy.value) {
    return
  }
  busy.value = true
  formError.value = null
  try {
    await projectTaskStore.deleteTask(props.projectId, current.value.taskId)
    emit('deleted', current.value.taskId)
    emit('close')
  } catch (error) {
    formError.value = t(projectErrorMessageKey(error))
  } finally {
    busy.value = false
  }
}
</script>
