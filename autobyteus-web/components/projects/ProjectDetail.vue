<template>
  <div class="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8" data-testid="project-detail">
    <NuxtLink
      to="/projects"
      class="inline-flex items-center gap-1 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      data-testid="project-back-link"
    >
      <Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />
      {{ t('projects.components.projects.ProjectDetail.backToProjects') }}
    </NuxtLink>

    <div
      v-if="state === 'loading'"
      class="mt-6 rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm"
      role="status"
      data-testid="project-detail-loading"
    >
      <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" aria-hidden="true"></div>
      <p class="text-slate-600">{{ t('projects.components.projects.ProjectDetail.loading') }}</p>
    </div>

    <div
      v-else-if="state === 'error'"
      class="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
      data-testid="project-detail-error"
    >
      <p class="font-semibold">{{ t('projects.components.projects.ProjectDetail.loadFailed') }}</p>
      <p class="mt-1">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="load"
      >
        {{ t('projects.common.retry') }}
      </button>
    </div>

    <div
      v-else-if="!project"
      class="mt-6 rounded-xl border border-slate-200 bg-white py-16 text-center"
      data-testid="project-not-found"
    >
      <h1 class="text-lg font-semibold text-slate-900">{{ t('projects.components.projects.ProjectDetail.notFoundTitle') }}</h1>
      <p class="mt-2 text-sm text-slate-500">{{ t('projects.components.projects.ProjectDetail.notFoundHelp') }}</p>
      <NuxtLink
        to="/projects"
        class="mt-4 inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {{ t('projects.components.projects.ProjectDetail.backToProjects') }}
      </NuxtLink>
    </div>

    <template v-else>
      <header class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h1 class="break-words text-3xl font-semibold text-slate-900" data-testid="project-detail-name">{{ project.name }}</h1>
          <p
            class="mt-2 whitespace-pre-line text-sm"
            :class="project.description ? 'text-slate-600' : 'italic text-slate-400'"
            data-testid="project-detail-description"
          >
            {{ project.description || t('projects.common.noDescription') }}
          </p>
        </div>
        <div class="flex flex-shrink-0 gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            data-testid="project-edit-button"
            @click="showEditDialog = true"
          >
            {{ t('projects.components.projects.ProjectDetail.edit') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            data-testid="project-delete-button"
            @click="openDeleteDialog"
          >
            {{ t('projects.components.projects.ProjectDetail.delete') }}
          </button>
        </div>
      </header>

      <section class="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm" :aria-labelledby="workspacesHeadingId">
        <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 :id="workspacesHeadingId" class="text-base font-semibold text-slate-900">
              {{ t('projects.components.projects.ProjectDetail.workspacesTitle') }}
            </h2>
            <p class="mt-0.5 text-sm text-slate-500">{{ t('projects.components.projects.ProjectDetail.workspacesHelp') }}</p>
          </div>
          <button
            type="button"
            class="inline-flex flex-shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            data-testid="project-add-workspace-button"
            @click="openLinkDialog(null)"
          >
            <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
            {{ t('projects.components.projects.ProjectDetail.addWorkspace') }}
          </button>
        </div>

        <p v-if="rowError" role="alert" class="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="project-workspace-row-error">
          {{ rowError }}
        </p>

        <p v-if="project.workspaces.length === 0" class="px-5 py-10 text-center text-sm text-slate-500" data-testid="project-workspaces-empty">
          {{ t('projects.components.projects.ProjectDetail.noWorkspaces') }}
        </p>
        <ul v-else class="divide-y divide-slate-100" data-testid="project-workspace-list">
          <ProjectWorkspaceRow
            v-for="link in project.workspaces"
            :key="link.workspaceId"
            :link="link"
            :busy="unlinkingWorkspaceId === link.workspaceId"
            @edit="openLinkDialog"
            @unlink="unlink"
          />
        </ul>
      </section>
    </template>

    <ProjectFormDialog
      v-if="showEditDialog && project"
      :project="project"
      @close="showEditDialog = false"
      @saved="showEditDialog = false"
    />

    <ProjectWorkspaceLinkDialog
      v-if="linkDialog.open && project"
      :project="project"
      :link="linkDialog.link"
      @close="closeLinkDialog"
      @saved="closeLinkDialog"
    />

    <ProjectDialogFrame
      v-if="showDeleteDialog && project"
      :title="t('projects.components.projects.ProjectDetail.deleteTitle')"
      :busy="deleting"
      test-id="project-delete-dialog"
      @close="showDeleteDialog = false"
    >
      <p class="text-sm text-slate-700">
        {{ t('projects.components.projects.ProjectDetail.deleteMessage', { name: project.name }) }}
      </p>
      <p class="mt-2 text-sm text-slate-500">{{ t('projects.components.projects.ProjectDetail.deleteScope') }}</p>
      <p v-if="deleteError" role="alert" class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="project-delete-error">
        {{ deleteError }}
      </p>
      <template #actions>
        <button
          type="button"
          data-dialog-initial-focus
          class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          :disabled="deleting"
          data-testid="project-delete-cancel"
          @click="showDeleteDialog = false"
        >
          {{ t('projects.common.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-60"
          :disabled="deleting"
          data-testid="project-delete-confirm"
          @click="confirmDelete"
        >
          {{ deleting ? t('projects.components.projects.ProjectDetail.deleting') : t('projects.components.projects.ProjectDetail.confirmDelete') }}
        </button>
      </template>
    </ProjectDialogFrame>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ProjectDialogFrame from '~/components/projects/ProjectDialogFrame.vue'
import ProjectFormDialog from '~/components/projects/ProjectFormDialog.vue'
import ProjectWorkspaceLinkDialog from '~/components/projects/ProjectWorkspaceLinkDialog.vue'
import ProjectWorkspaceRow from '~/components/projects/ProjectWorkspaceRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { ProjectWorkspace } from '~/types/project'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'

const props = defineProps<{ projectId: string }>()

const { t } = useLocalization()
const projectStore = useProjectStore()
const windowNodeContextStore = useWindowNodeContextStore()

const state = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref<string | null>(null)
const project = computed(() => projectStore.getProjectById(props.projectId))
const workspacesHeadingId = `project-workspaces-heading-${Math.random().toString(36).slice(2, 8)}`

const showEditDialog = ref(false)
const linkDialog = reactive<{ open: boolean; link: ProjectWorkspace | null }>({ open: false, link: null })
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const unlinkingWorkspaceId = ref<string | null>(null)
const rowError = ref<string | null>(null)

const load = async (): Promise<void> => {
  state.value = 'loading'
  loadError.value = null
  try {
    await projectStore.fetchProject(props.projectId)
    state.value = 'ready'
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
    state.value = 'error'
  }
}

const openLinkDialog = (link: ProjectWorkspace | null): void => {
  rowError.value = null
  linkDialog.link = link
  linkDialog.open = true
}

const closeLinkDialog = (): void => {
  linkDialog.open = false
  linkDialog.link = null
}

const unlink = async (link: ProjectWorkspace): Promise<void> => {
  rowError.value = null
  unlinkingWorkspaceId.value = link.workspaceId
  try {
    await projectStore.removeWorkspace(props.projectId, link.workspaceId)
  } catch (error) {
    rowError.value = t(projectErrorMessageKey(error))
  } finally {
    unlinkingWorkspaceId.value = null
  }
}

const openDeleteDialog = (): void => {
  deleteError.value = null
  showDeleteDialog.value = true
}

const confirmDelete = async (): Promise<void> => {
  deleting.value = true
  deleteError.value = null
  try {
    await projectStore.deleteProject(props.projectId)
    showDeleteDialog.value = false
    await navigateTo('/projects')
  } catch (error) {
    deleteError.value = t(projectErrorMessageKey(error))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
watch(() => props.projectId, load)
watch(() => windowNodeContextStore.bindingRevision, load)
</script>
