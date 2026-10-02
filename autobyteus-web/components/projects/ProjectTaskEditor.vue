<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50" data-testid="project-task-page">
    <div class="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-8 sm:py-8">
      <NuxtLink :to="boardTarget" class="inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="task-back-to-board"><Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />{{ t('projects.ui.backTasks') }}</NuxtLink>
      <p v-if="loading" role="status" class="mt-5 text-sm text-slate-500">{{ t('projects.components.projects.ProjectTaskBoard.loading') }}</p>
      <div v-else-if="loadError" role="alert" class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ loadError }} <button type="button" @click="load">{{ t('projects.common.retry') }}</button></div>
      <div v-else-if="!project || (taskId && !task)" class="mt-5 rounded-xl border border-slate-200 bg-white p-6" role="status" data-testid="task-page-not-found">
        <h1 ref="heading" tabindex="-1" class="text-lg font-semibold text-slate-900 outline-none">{{ t(project ? 'projects.ui.taskMissingTitle' : 'projects.components.projects.ProjectDetail.notFoundTitle') }}</h1><p class="mt-2 text-sm text-slate-600">{{ t(project ? 'projects.ui.taskMissingHelp' : 'projects.ui.projectMissingHelp') }}</p><NuxtLink :to="project ? boardTarget : '/projects'" class="mt-4 inline-block text-sm font-medium text-blue-700">{{ t(project ? 'projects.ui.backTasks' : 'projects.ui.backProjects') }}</NuxtLink>
      </div>
      <ProjectTaskDraftEditor v-else-if="project" :project-id="projectId" :project-name="project.name" :task="task ?? undefined" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskPage } from '~/composables/projects/useProjectTaskPage'
import ProjectTaskDraftEditor from './ProjectTaskDraftEditor.vue'
const props = defineProps<{projectId: string; taskId?: string}>()
const {t} = useLocalization()
const {project, task, loading, error: loadError, heading, load} = useProjectTaskPage(props.projectId, props.taskId)
const boardTarget = `/projects/${props.projectId}`
</script>
