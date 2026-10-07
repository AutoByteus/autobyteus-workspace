<template>
  <!-- projects-always-on SR-003: the right panel's Projects tab. The same live board as the Projects
       pages, beside the conversation; a card opens its Task inside the tab, a worker opens its
       conversation in the center while the tab stays. -->
  <div class="flex h-full min-h-0 flex-col bg-slate-50" data-testid="projects-panel">
    <div class="flex-shrink-0 border-b border-slate-200 bg-white px-3 py-2">
      <ProjectsPanelPicker />
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <div v-if="panel.isEmpty" class="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center" role="status" data-testid="projects-panel-empty">
        <Icon icon="heroicons:folder" class="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-slate-700">{{ t('projects.panel.emptyTitle') }}</p>
        <p class="mt-1 text-xs leading-5 text-slate-500">{{ t('projects.panel.emptyHelp') }}</p>
        <NuxtLink to="/projects" class="mt-4 inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-blue-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="projects-panel-open-projects">{{ t('projects.panel.openProjectsPage') }}</NuxtLink>
      </div>
      <template v-else>
        <ProjectsPanelTaskDetail v-if="view.kind === 'task'" :choice="panel.choice" :task-id="view.taskId" @back="view = { kind: 'board' }" />
        <!-- The board stays mounted while a Task is open, so returning keeps its search and scroll. -->
        <div v-show="view.kind === 'board'" data-testid="projects-panel-board">
          <ProjectTaskBoard v-if="panel.choice.kind === 'project'" :key="panel.choice.projectId" :project-id="panel.choice.projectId" compact @select-task="openTask" />
          <TempTaskBoard v-else compact @select-task="openTask" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ProjectTaskBoard from '~/components/projects/ProjectTaskBoard.vue'
import TempTaskBoard from '~/components/projects/TempTaskBoard.vue'
import ProjectsPanelPicker from './ProjectsPanelPicker.vue'
import ProjectsPanelTaskDetail from './ProjectsPanelTaskDetail.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'

type PanelView = { kind: 'board' } | { kind: 'task'; taskId: string }

const { t } = useLocalization()
const panel = useProjectsPanelStore()
useProjectChangeFeed()
const view = ref<PanelView>({ kind: 'board' })
const openTask = (taskId: string) => { view.value = { kind: 'task', taskId } }
// Another Project (or Temp tasks) shows its board.
watch(() => JSON.stringify(panel.choice), () => { view.value = { kind: 'board' } })
onMounted(() => panel.load())
</script>
