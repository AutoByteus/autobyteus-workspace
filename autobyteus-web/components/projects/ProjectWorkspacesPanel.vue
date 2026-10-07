<template>
  <section class="rounded-2xl border border-slate-200 bg-white shadow-sm" :aria-labelledby="headingId" data-testid="project-workspaces-panel">
    <div class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 :id="headingId" class="text-base font-semibold text-slate-900">
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
        :key="link.workspaceRootPath"
        :link="link"
        :busy="unlinkingWorkspacePath === link.workspaceRootPath"
        @edit="openLinkDialog"
        @unlink="unlink"
      />
    </ul>


  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import ProjectWorkspaceRow from '~/components/projects/ProjectWorkspaceRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import type { Project, ProjectWorkspace } from '~/types/project'
import { projectErrorMessageKey } from '~/utils/projects/projectErrorMessageKey'

const props = defineProps<{ project: Project }>()

const { t } = useLocalization()
const projectStore = useProjectStore()

const headingId = `project-workspaces-heading-${Math.random().toString(36).slice(2, 8)}`
const unlinkingWorkspacePath = ref<string | null>(null)
const rowError = ref<string | null>(null)

const router = useRouter()
const openLinkDialog = (link: ProjectWorkspace | null): void => {
  void router.push({path: `/projects/${props.project.projectId}/edit`, query: {tab: 'workspaces', ...(link ? {workspacePath: link.workspaceRootPath} : {addWorkspace: '1'})}})
}

const unlink = async (link: ProjectWorkspace): Promise<void> => {
  rowError.value = null
  unlinkingWorkspacePath.value = link.workspaceRootPath
  try {
    await projectStore.removeWorkspace(props.project.projectId, link.workspaceRootPath)
  } catch (error) {
    rowError.value = t(projectErrorMessageKey(error))
  } finally {
    unlinkingWorkspacePath.value = null
  }
}
</script>
