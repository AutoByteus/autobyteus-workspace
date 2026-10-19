<template>
  <!-- On a parent's card: how many of its parts are done ("2 of 4 done"; Cancelled parts are not counted). Quiet slate;
       emerald once every counted part is Done. Informs only. -->
  <span
    v-if="parts.length && progress.total"
    class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
    :class="complete ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'"
    :title="title"
    data-testid="task-parts-progress"
  >
    <Icon :icon="complete ? 'heroicons:check-circle-20-solid' : 'heroicons:squares-2x2-20-solid'" class="h-3.5 w-3.5 flex-shrink-0" :class="complete ? 'text-emerald-500' : 'text-slate-400'" aria-hidden="true" />
    <span class="truncate">{{ t('projects.parts.progress', { done: progress.done, total: progress.total }) }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTask } from '~/types/project'
import { partsOf, partsProgressOf } from '~/utils/projects/taskParts'

const props = defineProps<{ task: ProjectTask; tasks: readonly ProjectTask[] }>()
const { t } = useLocalization()
const parts = computed(() => partsOf(props.task, props.tasks))
const progress = computed(() => partsProgressOf(parts.value))
const complete = computed(() => progress.value.total > 0 && progress.value.done === progress.value.total)
const title = computed(() => [t('projects.parts.progress', { done: progress.value.done, total: progress.value.total }),
  ...(progress.value.cancelled ? [t('projects.parts.cancelledCount', { count: progress.value.cancelled })] : [])].join(' · '))
</script>
