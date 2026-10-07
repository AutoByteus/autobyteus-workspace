<template>
  <!-- Picks the board the Projects tab shows: one Project or Temp tasks (remembered per node). -->
  <div class="flex items-center gap-2" data-testid="projects-panel-picker">
    <!-- The select shows its value inside the "Projects" tab, so the name is for screen readers only. -->
    <label :for="selectId" class="sr-only">{{ t('projects.panel.pickerLabel') }}</label>
    <select
      :id="selectId"
      :value="value"
      class="min-h-9 min-w-0 flex-1 truncate rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-8 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      data-testid="projects-panel-picker-select"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="project in projectStore.projects" :key="project.projectId" :value="`project:${project.projectId}`">{{ project.name }}</option>
      <option value="temp" data-testid="projects-panel-picker-temp">{{ t('projects.temp.title') }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectsPanelStore } from '~/stores/projectsPanelStore'

const { t } = useLocalization()
const projectStore = useProjectStore()
const panel = useProjectsPanelStore()
const selectId = `projects-panel-picker-${Math.random().toString(36).slice(2, 8)}`
const value = computed(() => panel.choice.kind === 'project' ? `project:${panel.choice.projectId}` : 'temp')
const onChange = (next: string) => {
  panel.choose(next.startsWith('project:') ? { kind: 'project', projectId: next.slice('project:'.length) } : { kind: 'temp' })
}
</script>
