<template>
  <!-- project-manager-ux round 2: a Task with no Project, read only (only agents change it). The same
       page shape as a Project Task: Description, Reference files, Assigned to. -->
  <div class="h-full flex-1 overflow-auto bg-slate-50" data-testid="temp-task-page">
    <div class="w-full max-w-[1040px] px-4 py-5 sm:px-6 lg:px-8">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <NuxtLink to="/projects/temp-tasks" class="inline-flex min-h-9 items-center gap-1.5 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="temp-task-back"><Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />{{ t('projects.ui.backTasks') }}</NuxtLink>
        <span class="min-w-0 break-words border-l border-slate-300 pl-3 text-sm text-slate-500">{{ t('projects.temp.title') }}</span>
      </div>
      <p v-if="!list?.hasLoaded && !list?.error" role="status" class="mt-5 text-sm text-slate-500">{{ t('projects.components.projects.ProjectTaskBoard.loading') }}</p>
      <div v-else-if="!list?.hasLoaded && list?.error" role="alert" class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ list.error.message }} <button type="button" @click="load">{{ t('projects.common.retry') }}</button></div>
      <div v-else-if="!task" class="mt-5 rounded-xl border border-slate-200 bg-white p-6" role="status" data-testid="temp-task-not-found">
        <h1 class="text-lg font-semibold text-slate-900">{{ t('projects.ui.taskMissingTitle') }}</h1>
        <p class="mt-2 text-sm text-slate-600">{{ t('projects.ui.taskMissingHelp') }}</p>
        <NuxtLink to="/projects/temp-tasks" class="mt-4 inline-block text-sm font-medium text-blue-700">{{ t('projects.ui.backTasks') }}</NuxtLink>
      </div>
      <template v-else>
        <header class="mb-4 mt-4 flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900" data-testid="temp-task-heading">{{ t('projects.ui.taskDetails') }}</h1>
          <span class="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset" :class="tempLanePillClass(tempTaskLaneOf(task.status))" data-testid="temp-task-status">{{ t(TEMP_LANE_LABEL_KEYS[tempTaskLaneOf(task.status)]) }}</span>
        </header>
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="temp-description-heading">
          <div class="p-5 sm:p-6">
            <h2 id="temp-description-heading" class="text-xs font-medium text-slate-500">{{ t('projects.ui.description') }}</h2>
            <p class="mt-3 max-w-[80ch] whitespace-pre-wrap break-words text-base leading-7 text-slate-800" data-testid="temp-task-description">{{ task.description }}</p>
            <section v-if="task.referenceFiles.length" class="mt-6 border-t border-slate-100 pt-5" aria-labelledby="temp-reference-heading" data-testid="temp-task-reference-files">
              <h2 id="temp-reference-heading" class="mb-2 text-sm font-medium text-slate-600">{{ t('projects.temp.referenceFiles') }} ({{ task.referenceFiles.length }})</h2>
              <ul class="space-y-1">
                <li v-for="path in task.referenceFiles" :key="path" class="flex min-w-0 items-center gap-2 text-sm text-slate-700"><Icon icon="heroicons:document-text" class="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" /><span class="truncate font-mono text-[0.8125rem]" :title="path">{{ path }}</span></li>
              </ul>
            </section>
          </div>
        </section>
        <TaskRootSection :root="task.root" />
        <p class="mt-4 text-xs text-slate-400" data-testid="temp-task-read-only">{{ t('projects.temp.readOnly') }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import TaskRootSection from './TaskRootSection.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import { TEMP_LANE_LABEL_KEYS, tempLanePillClass, tempTaskLaneOf } from '~/utils/projects/taskStatusPresentation'

const props = defineProps<{ taskId: string }>()
const { t } = useLocalization()
const store = useProjectTaskStore()
useProjectChangeFeed()
const list = computed(() => store.getTempList())
const task = computed(() => list.value?.tasks.find((item) => item.taskId === props.taskId) ?? null)
const load = () => { void store.fetchTasks(TEMP_TASKS_LIST_ID, true).catch(() => undefined) }
onMounted(load)
onBeforeUnmount(() => store.releaseRead(TEMP_TASKS_LIST_ID))
</script>
