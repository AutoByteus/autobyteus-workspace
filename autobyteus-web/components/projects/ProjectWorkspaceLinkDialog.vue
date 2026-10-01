<template>
  <ProjectDialogFrame
    :title="link ? t('projects.components.projects.ProjectWorkspaceLinkDialog.editTitle') : t('projects.components.projects.ProjectWorkspaceLinkDialog.addTitle')"
    :busy="saving"
    size="lg"
    test-id="project-workspace-link-dialog"
    @close="emit('close')"
  >
    <form :id="formId" novalidate class="space-y-5" @submit.prevent="submit">
      <div v-if="link" data-testid="project-link-workspace-readonly">
        <p class="text-sm font-medium text-slate-700">{{ t('projects.components.projects.ProjectWorkspaceLinkDialog.workspaceLabel') }}</p>
        <p class="mt-1 text-sm font-semibold text-slate-900">{{ link.displayName }}</p>
        <p class="break-words font-mono text-xs text-slate-500">
          <template v-for="(segment, index) in linkPathSegments" :key="index">{{ segment }}<wbr /></template>
        </p>
      </div>

      <WorkspaceSelector
        v-else
        :model="selectorModel"
        :auto-select-default="false"
        :candidate-workspace-ids="candidateWorkspaceIds"
        :disabled="saving"
        @update:model-value="selection = $event"
      />

      <div>
        <label :for="descriptionId" class="block text-sm font-medium text-slate-700">
          {{ t('projects.components.projects.ProjectWorkspaceLinkDialog.descriptionLabel') }}
        </label>
        <textarea
          :id="descriptionId"
          v-model="description"
          rows="3"
          :data-dialog-initial-focus="link ? '' : undefined"
          data-testid="project-link-description-input"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectWorkspaceLinkDialog.descriptionPlaceholder')"
          :disabled="saving"
        />
      </div>

      <p v-if="errorMessage" role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="project-link-error">
        {{ errorMessage }}
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
        data-testid="project-link-submit"
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!canSubmit"
      >
        {{ saving
          ? t('projects.common.saving')
          : link ? t('projects.components.projects.ProjectWorkspaceLinkDialog.saveChanges') : t('projects.components.projects.ProjectWorkspaceLinkDialog.addWorkspace') }}
      </button>
    </template>
  </ProjectDialogFrame>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ProjectDialogFrame from '~/components/projects/ProjectDialogFrame.vue'
import WorkspaceSelector from '~/components/workspace/config/WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useWorkspaceStore } from '~/stores/workspace'
import type { Project, ProjectWorkspace } from '~/types/project'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import type { WorkspaceSelectorModel } from '~/types/workspace/WorkspaceSelectorModel'
import { selectLinkableWorkspaceIds } from '~/utils/projects/linkableWorkspaces'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'
import { pathBreakSegments } from '~/utils/projects/pathBreakSegments'

const props = defineProps<{
  project: Project
  /** The link to edit; omit to add a new link. */
  link?: ProjectWorkspace | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', project: Project): void
}>()

const { t } = useLocalization()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()

const selection = ref<WorkspaceSelectionState>({ mode: 'existing', existingWorkspaceId: null, newWorkspacePath: '' })
const description = ref(props.link?.description ?? '')
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const uid = Math.random().toString(36).slice(2, 8)
const formId = `project-link-form-${uid}`
const descriptionId = `project-link-description-${uid}`

const linkPathSegments = computed(() => (props.link ? pathBreakSegments(props.link.workspaceRootPath) : []))

const candidateWorkspaceIds = computed(() =>
  selectLinkableWorkspaceIds(workspaceStore.allWorkspaces, props.project.workspaces))

const selectorModel = computed<WorkspaceSelectorModel>(() => ({
  mode: 'editable',
  selection: selection.value,
  isLoading: saving.value,
  error: null,
}))

const hasWorkspaceChoice = computed(() => (
  selection.value.mode === 'existing'
    ? Boolean(selection.value.existingWorkspaceId)
    : selection.value.newWorkspacePath.trim().length > 0
))

const canSubmit = computed(() => !saving.value && (Boolean(props.link) || hasWorkspaceChoice.value))

const resolveWorkspaceId = async (): Promise<string> => {
  if (selection.value.mode === 'existing') {
    return selection.value.existingWorkspaceId!
  }
  return workspaceStore.createWorkspace({ root_path: selection.value.newWorkspacePath.trim() })
}

const submit = async (): Promise<void> => {
  if (!canSubmit.value) {
    return
  }
  saving.value = true
  errorMessage.value = null

  try {
    const trimmedDescription = description.value.trim()
    if (props.link) {
      emit('saved', await projectStore.updateWorkspace(props.project.projectId, props.link.workspaceId, trimmedDescription))
      return
    }

    let workspaceId: string
    try {
      workspaceId = await resolveWorkspaceId()
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      errorMessage.value = t('projects.components.projects.ProjectWorkspaceLinkDialog.registrationFailed', { reason })
      return
    }
    emit('saved', await projectStore.addWorkspace(props.project.projectId, workspaceId, trimmedDescription))
  } catch (error) {
    errorMessage.value = t(projectErrorMessageKey(error))
    if ((error as { code?: string | null }).code === 'WORKSPACE_NOT_REGISTERED' && selection.value.mode === 'existing') {
      // The candidate list was stale (e.g. the workspace was removed elsewhere); reload it.
      selection.value = { ...selection.value, existingWorkspaceId: null }
      void workspaceStore.fetchAllWorkspaces(true).catch(() => undefined)
    }
  } finally {
    saving.value = false
  }
}
</script>
