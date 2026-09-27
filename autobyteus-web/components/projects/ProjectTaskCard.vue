<template>
  <button
    type="button"
    class="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
    :aria-label="summary"
    :data-testid="`project-task-card-${task.taskId}`"
    @click="emit('open', task)"
  >
    <span class="line-clamp-3 whitespace-pre-line break-words text-sm leading-5 text-slate-800" data-testid="project-task-card-text">{{ task.description }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProjectTask } from '~/types/project'
import { taskSummary } from '~/utils/projects/taskSummary'

// A card shows only the Task's description (up to 3 lines); its accessible name is the summary.
const props = defineProps<{ task: ProjectTask }>()

const emit = defineEmits<{ (e: 'open', task: ProjectTask): void }>()

const summary = computed(() => taskSummary(props.task.description))
</script>
