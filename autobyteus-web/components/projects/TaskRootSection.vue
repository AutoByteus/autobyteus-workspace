<template>
  <!-- project-manager-ux: "Assigned to" on a Task page (Project Task or Temp task). -->
  <section class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white" :aria-labelledby="headingId" data-testid="task-page-assigned">
    <div class="p-5 sm:p-6">
      <h2 :id="headingId" class="text-xs font-medium text-slate-500">{{ t('projects.root.listLabel') }}</h2>
      <ProjectTaskWorkers v-if="root" class="-mx-3 mt-2" density="detail" :root="root" />
      <p v-else class="mt-3 text-sm text-slate-500" data-testid="task-page-not-assigned">{{ t('projects.root.notAssigned') }}</p>
      <!-- While the worker is the Task's live work (not closed by DONE, not failed to start). -->
      <p v-if="root && !root.closed && root.start !== 'failed'" class="mt-3 text-xs leading-5 text-slate-400" data-testid="task-page-root-help">{{ t('projects.root.help') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization'
import type { TaskRootView } from '~/types/project'
import ProjectTaskWorkers from './ProjectTaskWorkers.vue'

defineProps<{ root: TaskRootView | null }>()
const { t } = useLocalization()
const headingId = `task-root-heading-${Math.random().toString(36).slice(2, 8)}`
</script>
