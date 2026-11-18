<template>
  <!-- A Project Task's "Depends on" (stored; every dependency, Done ones too) and "Required by" (derived: the
       Tasks that depend on this one). Each row opens that Task. -->
  <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" :class="compact ? '' : 'mt-4'" :aria-labelledby="headingId" data-testid="task-dependencies">
    <div :class="compact ? 'p-4' : 'p-5 sm:p-6'">
      <h2 :id="headingId" class="sr-only">{{ t('projects.deps.heading') }}</h2>
      <div v-for="(group, index) in groups" :key="group.id" :class="index ? 'mt-5' : ''" :data-testid="`task-dependencies-${group.id}`">
        <h3 class="text-xs font-medium text-slate-500">{{ t(group.label) }}</h3>
        <p v-if="!group.tasks.length" class="mt-2 text-sm text-slate-400" data-testid="task-dependencies-none">{{ t('projects.deps.none') }}</p>
        <ul v-else class="-mx-2 mt-1.5 max-w-[80ch] space-y-0.5">
          <li v-for="item in group.tasks" :key="item.taskId">
            <component
              :is="compact ? 'button' : NuxtLink"
              v-bind="compact ? { type: 'button' } : { to: taskPagePath(item.projectId, item) }"
              class="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :data-testid="`task-dependency-${item.taskId}`"
              @click="compact && emit('open-task', item.taskId)"
            >
              <span class="max-w-[45%] flex-shrink-0 font-medium text-slate-800"><TaskKey :task-key="item.taskKey" /></span>
              <span class="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="taskStatusPillClass(item.status)" data-testid="task-dependency-status">
                {{ t(TASK_STATUS_LABEL_KEYS[item.status]) }}<Icon v-if="item.status === 'DONE'" icon="heroicons:check-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1 truncate text-slate-600">{{ taskTitleLabel(item.title) }}</span>
            </component>
          </li>
        </ul>
        <p v-if="group.id === 'depends-on' && blocked" class="mt-1.5 text-xs leading-5 text-slate-400" data-testid="task-dependencies-informs">{{ t('projects.deps.informs') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTask } from '~/types/project'
import { dependenciesOf, dependencyBadgeOf, requiredByOf } from '~/utils/projects/taskDependencies'
import { TASK_STATUS_LABEL_KEYS, taskStatusPillClass } from '~/utils/projects/taskStatusPresentation'
import { taskTitleLabel } from '~/utils/projects/taskText'
import TaskKey from './TaskKey.vue'
import { taskPagePath } from '~/utils/projects/taskPagePath'

/** `compact` (the right panel's Projects tab): a row opens that Task inside the tab instead of routing. */
const props = withDefaults(defineProps<{ task: ProjectTask; tasks: readonly ProjectTask[]; compact?: boolean }>(), { compact: false })
const emit = defineEmits<{ (event: 'open-task', taskId: string): void }>()
const { t } = useLocalization()
const NuxtLink = resolveComponent('NuxtLink')
const headingId = `task-dependencies-${Math.random().toString(36).slice(2, 8)}`
const groups = computed(() => [
  { id: 'depends-on', label: 'projects.deps.dependsOn', tasks: dependenciesOf(props.task, props.tasks) },
  { id: 'required-by', label: 'projects.deps.requiredBy', tasks: requiredByOf(props.task, props.tasks) },
])
const blocked = computed(() => dependencyBadgeOf(props.task, props.tasks)?.kind === 'blocked')
</script>
