<template>
  <NuxtLink
    :to="`/projects/${task.projectId}/tasks/${task.taskId}`"
    class="block w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
    :aria-label="summary"
    :data-testid="`project-task-row-${task.taskId}`"
  >
    <span class="block line-clamp-2 break-words text-sm font-medium leading-6 text-slate-800" data-testid="project-task-row-text">{{ summary }}</span>
    <span v-if="preview" class="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{{ preview }}</span>
    <span v-if="task.contextFiles?.length" class="mt-2 inline-flex items-center gap-1 text-xs text-slate-500" data-testid="task-row-file-count"><Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5" aria-hidden="true" />{{ t(task.contextFiles.length === 1 ? 'projects.ui.fileCountOne' : 'projects.ui.fileCount', {count: task.contextFiles.length}) }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { ProjectTask } from '~/types/project'
import { useLocalization } from '~/composables/useLocalization'
import { taskSummary } from '~/utils/projects/taskSummary'

// The first line is the summary; remaining lines are a quieter context preview.
const props = defineProps<{ task: ProjectTask }>()

const {t} = useLocalization()
const summary = computed(() => taskSummary(props.task.description))
const preview = computed(() => props.task.description.trim().split(/\r?\n/).slice(1).filter(line => line.trim()).join(' '))
</script>
