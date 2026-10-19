<template>
  <!-- A Project Task's "Part of" (when it is a part: its parent, one row) or its "Parts" (otherwise: every part, Done and
       Cancelled ones too, with "N of M done"). Rows look like the Dependencies rows and each opens that Task. Never both:
       one level only. The Task page can start a new part; the tab is read only. -->
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" :class="compact ? '' : 'mt-4'" :aria-labelledby="headingId" :data-testid="parent ? 'task-part-of' : 'task-parts'">
    <div :class="compact ? 'p-4' : 'p-5 sm:p-6'">
      <div class="flex items-baseline justify-between gap-3">
        <h2 :id="headingId" class="text-xs font-medium text-slate-500">{{ t(parent ? 'projects.parts.partOf' : 'projects.parts.parts') }}</h2>
        <p v-if="!parent && parts.length" class="min-w-0 truncate text-xs" data-testid="task-parts-summary">
          <span v-if="progress.total" class="font-medium text-slate-600" data-testid="task-parts-progress-text">{{ t('projects.parts.progress', { done: progress.done, total: progress.total }) }}</span>
          <span v-if="progress.total && progress.cancelled" class="text-slate-400"> · </span>
          <span v-if="progress.cancelled" class="text-slate-400" data-testid="task-parts-cancelled-text">{{ t('projects.parts.cancelledCount', { count: progress.cancelled }) }}</span>
        </p>
      </div>
      <p v-if="!rows.length" class="mt-2 text-sm text-slate-400" data-testid="task-parts-none">{{ t('projects.parts.none') }}</p>
      <ul v-else class="-mx-2 mt-1.5 max-w-[80ch] space-y-0.5">
        <li v-for="item in rows" :key="item.taskId">
          <component
            :is="compact ? 'button' : NuxtLink"
            v-bind="compact ? { type: 'button' } : { to: taskPagePath(item.projectId, item) }"
            class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :data-testid="`task-part-row-${item.taskId}`"
            @click="compact && emit('open-task', item.taskId)"
          >
            <span class="max-w-[45%] flex-shrink-0 font-medium text-slate-800"><TaskKey :task-key="item.taskKey" /></span>
            <span class="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(item.status)" data-testid="task-part-status">
              {{ t(TASK_STATUS_LABEL_KEYS[item.status]) }}<Icon v-if="item.status === 'DONE'" icon="heroicons:check-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1 truncate text-slate-600">{{ taskSummaryLabel(item.description) }}</span>
          </component>
        </li>
      </ul>
      <p v-if="closeHint" class="mt-1.5 text-xs leading-5 text-slate-400" data-testid="task-parts-close-hint">{{ t('projects.parts.closeHint') }}</p>
      <NuxtLink
        v-if="!parent && !compact"
        :to="`/projects/${task.projectId}/tasks/new?partOf=${encodeURIComponent(task.taskId)}`"
        class="mt-3 inline-flex min-h-8 items-center gap-1 rounded-md text-sm font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        data-testid="task-parts-new"
      ><Icon icon="heroicons:plus-20-solid" class="h-4 w-4" aria-hidden="true" />{{ t('projects.parts.newPart') }}</NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTask } from '~/types/project'
import { parentOf, partsOf, partsProgressOf } from '~/utils/projects/taskParts'
import { TASK_STATUS_LABEL_KEYS, taskStatusPillClass } from '~/utils/projects/taskStatusPresentation'
import { taskSummaryLabel } from '~/utils/projects/taskSummary'
import { taskPagePath } from '~/utils/projects/taskPagePath'
import TaskKey from './TaskKey.vue'

/** `compact` (the right panel's Projects tab): a row opens that Task inside the tab instead of routing; no "New part". */
const props = withDefaults(defineProps<{ task: ProjectTask; tasks: readonly ProjectTask[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ (event: 'open-task', taskId: string): void }>()
const { t } = useLocalization()
const NuxtLink = resolveComponent('NuxtLink')
const headingId = `task-parts-${Math.random().toString(36).slice(2, 8)}`
const parent = computed(() => parentOf(props.task, props.tasks))
const parts = computed(() => partsOf(props.task, props.tasks))
const rows = computed(() => parent.value ? [parent.value] : parts.value)
const progress = computed(() => partsProgressOf(parts.value))
/** Only while the parent is open and still has open parts: closing it closes them too. */
const closeHint = computed(() => !parent.value && (props.task.status === 'TODO' || props.task.status === 'IN_PROGRESS')
  && parts.value.some((item) => item.status === 'TODO' || item.status === 'IN_PROGRESS'))
</script>
