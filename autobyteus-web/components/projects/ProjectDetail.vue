<template>
  <div class="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6 lg:px-8" data-testid="project-detail">
    <div
      v-if="state === 'loading'"
      class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm"
      role="status"
      data-testid="project-detail-loading"
    >
      <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" aria-hidden="true"></div>
      <p class="text-slate-600">{{ t('projects.components.projects.ProjectDetail.loading') }}</p>
    </div>

    <div
      v-else-if="state === 'error'"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
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
      class="rounded-xl border border-slate-200 bg-white py-16 text-center"
      data-testid="project-not-found"
    >
      <h2 class="text-lg font-semibold text-slate-900">{{ t('projects.components.projects.ProjectDetail.notFoundTitle') }}</h2>
      <p class="mt-2 text-sm text-slate-500">{{ t('projects.components.projects.ProjectDetail.notFoundHelp') }}</p>
    </div>

    <template v-else>
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h2 class="break-words text-2xl font-semibold text-slate-900" data-testid="project-detail-name">{{ project.name }}</h2>
          <p
            class="mt-1 whitespace-pre-line text-sm"
            :class="project.description ? 'text-slate-600' : 'italic text-slate-400'"
            data-testid="project-detail-description"
          >
            {{ project.description || t('projects.common.noDescription') }}
          </p>
        </div>
        <div class="flex flex-shrink-0 gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            data-testid="project-edit-button"
            @click="showEditDialog = true"
          >
            {{ t('projects.components.projects.ProjectDetail.edit') }}
          </button>
          <button
            type="button"
            class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            data-testid="project-delete-button"
            @click="openDeleteDialog"
          >
            {{ t('projects.components.projects.ProjectDetail.delete') }}
          </button>
        </div>
      </header>

      <div
        class="mt-5 flex gap-1 border-b border-slate-200"
        role="tablist"
        :aria-label="t('projects.components.projects.ProjectDetail.tabs.label')"
        data-testid="project-detail-tabs"
      >
        <button
          v-for="tab in TABS"
          :id="tabId(tab)"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab ? 'true' : 'false'"
          :aria-controls="panelId(tab)"
          :tabindex="activeTab === tab ? 0 : -1"
          class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
          :class="activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'"
          :data-testid="`project-tab-${tab}`"
          @click="selectTab(tab)"
          @keydown="handleTabKeydown($event, tab)"
        >
          {{ t(TAB_LABEL_KEYS[tab]) }}
        </button>
      </div>

      <div :id="panelId(activeTab)" role="tabpanel" :aria-labelledby="tabId(activeTab)" class="mt-5">
        <ProjectTasksPanel v-if="activeTab === 'tasks'" :project-id="project.projectId" />
        <ProjectWorkspacesPanel v-else :project="project" />
      </div>
    </template>

    <ProjectFormDialog
      v-if="showEditDialog && project"
      :project="project"
      @close="showEditDialog = false"
      @saved="showEditDialog = false"
    />

    <ProjectDialogFrame
      v-if="showDeleteDialog && project"
      :title="t('projects.components.projects.ProjectDetail.deleteTitle')"
      :busy="deleting"
      test-id="project-delete-dialog"
      @close="showDeleteDialog = false"
    >
      <p class="text-sm text-slate-700" data-testid="project-delete-message">{{ deleteMessage }}</p>
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProjectDialogFrame from '~/components/projects/ProjectDialogFrame.vue'
import ProjectFormDialog from '~/components/projects/ProjectFormDialog.vue'
import ProjectTasksPanel from '~/components/projects/ProjectTasksPanel.vue'
import ProjectWorkspacesPanel from '~/components/projects/ProjectWorkspacesPanel.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'

type ProjectDetailTab = 'tasks' | 'workspaces'
const TABS: readonly ProjectDetailTab[] = ['tasks', 'workspaces']
const TAB_LABEL_KEYS: Readonly<Record<ProjectDetailTab, string>> = {
  tasks: 'projects.components.projects.ProjectDetail.tabs.tasks',
  workspaces: 'projects.components.projects.ProjectDetail.tabs.workspaces',
}

const props = defineProps<{ projectId: string }>()

const { t } = useLocalization()
const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const projectTaskStore = useProjectTaskStore()
const windowNodeContextStore = useWindowNodeContextStore()

const uid = Math.random().toString(36).slice(2, 8)
const tabId = (tab: ProjectDetailTab) => `project-tab-${tab}-${uid}`
const panelId = (tab: ProjectDetailTab) => `project-tabpanel-${tab}-${uid}`

const state = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref<string | null>(null)
const project = computed(() => projectStore.getProjectById(props.projectId))

// Tasks is the default tab; `?tab=workspaces` selects Workspaces.
const activeTab = computed<ProjectDetailTab>(() => (route.query.tab === 'workspaces' ? 'workspaces' : 'tasks'))

const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

/**
 * Loads the selected Project. A Project already cached by the list is shown at once and
 * refreshed in the background, so switching Projects does not flash a loading state.
 */
const load = async (): Promise<void> => {
  const cached = Boolean(project.value)
  state.value = cached ? 'ready' : 'loading'
  loadError.value = null
  try {
    await projectStore.fetchProject(props.projectId)
    state.value = 'ready'
  } catch (error) {
    if (!cached) {
      loadError.value = error instanceof Error ? error.message : String(error)
      state.value = 'error'
    }
  }
}

const selectTab = (tab: ProjectDetailTab): void => {
  if (tab === activeTab.value) return
  const { tab: _previous, ...query } = route.query
  void router.replace({ query: tab === 'tasks' ? query : { ...query, tab } })
}

const handleTabKeydown = (event: KeyboardEvent, tab: ProjectDetailTab): void => {
  const index = TABS.indexOf(tab)
  let next: ProjectDetailTab | undefined
  if (event.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length]
  else if (event.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length]
  else if (event.key === 'Home') next = TABS[0]
  else if (event.key === 'End') next = TABS[TABS.length - 1]
  if (!next) return
  event.preventDefault()
  const target = next
  selectTab(target)
  void nextTick(() => document.getElementById(tabId(target))?.focus())
}

// Count of Tasks deleted with the Project. `openTaskCount` is always loaded with the
// Project, unlike the Task list (not loaded when landing on ?tab=workspaces). It equals
// the total number of Tasks only while no Task can become DONE (no status mutation exists
// yet); the Task-admission work must revisit this when it adds one.
const deleteMessage = computed(() => {
  const name = project.value?.name ?? ''
  const count = project.value?.openTaskCount ?? 0
  if (count === 0) return t('projects.components.projects.ProjectDetail.deleteMessage', { name })
  return count === 1
    ? t('projects.components.projects.ProjectDetail.deleteMessageOneTask', { name })
    : t('projects.components.projects.ProjectDetail.deleteMessageTasks', { name, count })
})

const openDeleteDialog = (): void => {
  deleteError.value = null
  showDeleteDialog.value = true
}

const confirmDelete = async (): Promise<void> => {
  deleting.value = true
  deleteError.value = null
  try {
    await projectStore.deleteProject(props.projectId)
    projectTaskStore.forget(props.projectId)
    showDeleteDialog.value = false
    await navigateTo('/projects')
  } catch (error) {
    deleteError.value = t(projectErrorMessageKey(error))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
// Only the selected Project and the bound node drive loading; a `?tab=` change does not.
watch(() => props.projectId, load)
watch(() => windowNodeContextStore.bindingRevision, load)
</script>
