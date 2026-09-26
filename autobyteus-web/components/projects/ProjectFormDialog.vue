<template>
  <ProjectDialogFrame
    :title="isEdit ? t('projects.components.projects.ProjectFormDialog.editTitle') : t('projects.components.projects.ProjectFormDialog.createTitle')"
    :busy="saving"
    test-id="project-form-dialog"
    @close="emit('close')"
  >
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="submit">
      <div>
        <label :for="nameId" class="block text-sm font-medium text-slate-700">
          {{ t('projects.components.projects.ProjectFormDialog.nameLabel') }}
        </label>
        <input
          :id="nameId"
          v-model="name"
          type="text"
          required
          maxlength="200"
          data-dialog-initial-focus
          data-testid="project-name-input"
          class="mt-1 block w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2"
          :class="nameError ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'"
          :aria-invalid="nameError ? 'true' : 'false'"
          :aria-describedby="nameError ? nameErrorId : undefined"
          :disabled="saving"
        />
        <p v-if="nameError" :id="nameErrorId" role="alert" class="mt-1 text-sm text-red-600" data-testid="project-name-error">
          {{ nameError }}
        </p>
      </div>

      <div>
        <label :for="descriptionId" class="block text-sm font-medium text-slate-700">
          {{ t('projects.components.projects.ProjectFormDialog.descriptionLabel') }}
        </label>
        <textarea
          :id="descriptionId"
          v-model="description"
          rows="4"
          data-testid="project-description-input"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectFormDialog.descriptionPlaceholder')"
          :disabled="saving"
        />
      </div>

      <p v-if="formError" role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="project-form-error">
        {{ formError }}
      </p>
    </form>

    <template #actions>
      <button
        type="button"
        class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        :disabled="saving"
        @click="emit('close')"
      >
        {{ t('projects.common.cancel') }}
      </button>
      <button
        type="submit"
        :form="formId"
        data-testid="project-form-submit"
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving"
      >
        {{ saving
          ? t('projects.common.saving')
          : isEdit ? t('projects.components.projects.ProjectFormDialog.saveChanges') : t('projects.components.projects.ProjectFormDialog.create') }}
      </button>
    </template>
  </ProjectDialogFrame>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import ProjectDialogFrame from '~/components/projects/ProjectDialogFrame.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import type { Project } from '~/types/project'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'

const NAME_ERROR_CODES = new Set(['PROJECT_NAME_REQUIRED', 'PROJECT_NAME_TAKEN'])

const props = defineProps<{
  /** The Project to edit; omit to create a new one. */
  project?: Project | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', project: Project): void
}>()

const { t } = useLocalization()
const projectStore = useProjectStore()

const isEdit = computed(() => Boolean(props.project))
const name = ref(props.project?.name ?? '')
const description = ref(props.project?.description ?? '')
const saving = ref(false)
const nameError = ref<string | null>(null)
const formError = ref<string | null>(null)

const uid = Math.random().toString(36).slice(2, 8)
const formId = `project-form-${uid}`
const nameId = `project-name-${uid}`
const nameErrorId = `project-name-error-${uid}`
const descriptionId = `project-description-${uid}`

const focusNameInput = (): void => {
  document.getElementById(nameId)?.focus()
}

const submit = async (): Promise<void> => {
  if (saving.value) {
    return
  }
  nameError.value = null
  formError.value = null

  const trimmedName = name.value.trim()
  if (!trimmedName) {
    nameError.value = t('projects.errors.nameRequired')
    focusNameInput()
    return
  }

  saving.value = true
  try {
    const saved = props.project
      ? await projectStore.updateProject({
        projectId: props.project.projectId,
        name: trimmedName,
        description: description.value.trim(),
      })
      : await projectStore.createProject({ name: trimmedName, description: description.value.trim() })
    emit('saved', saved)
  } catch (error) {
    const message = t(projectErrorMessageKey(error))
    const code = (error as { code?: string | null }).code
    if (code && NAME_ERROR_CODES.has(code)) {
      nameError.value = message
    } else {
      formError.value = message
    }
  } finally {
    saving.value = false
  }

  if (nameError.value) {
    await nextTick()
    focusNameInput()
  }
}
</script>
