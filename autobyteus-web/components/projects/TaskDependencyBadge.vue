<template>
  <!-- On an open Task's card, derived from its "depends on": "Blocked by <key>" (+N) while a dependency is
       To Do or In Progress; otherwise "Dependency cancelled: <key>" when one was cancelled; nothing once all are Done. -->
  <span
    v-if="badge"
    class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
    :class="badge.kind === 'blocked' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-white text-slate-600 ring-slate-300'"
    :title="title"
    :data-testid="`task-dependency-badge-${badge.kind}`"
  >
    <Icon
      :icon="badge.kind === 'blocked' ? 'heroicons:link-20-solid' : 'heroicons:x-circle-20-solid'"
      class="h-3.5 w-3.5 flex-shrink-0"
      :class="badge.kind === 'blocked' ? 'text-amber-600' : 'text-slate-400'"
      aria-hidden="true"
    />
    <span class="flex-shrink-0">{{ t(badge.kind === 'blocked' ? 'projects.deps.blockedBy' : 'projects.deps.cancelled') }}</span>
    <TaskKey :task-key="badge.first.taskKey" />
    <span v-if="badge.more" class="flex-shrink-0">{{ t('projects.deps.more', { count: badge.more }) }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTask } from '~/types/project'
import { dependencyBadgeOf } from '~/utils/projects/taskDependencies'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusPresentation'
import TaskKey from './TaskKey.vue'

const props = defineProps<{ task: ProjectTask; tasks: readonly ProjectTask[] }>()
const { t } = useLocalization()
const badge = computed(() => dependencyBadgeOf(props.task, props.tasks))
/** Hover lists every dependency with its status, e.g. "Depends on: autobyteus-39 (In Progress), autobyteus-38 (To Do)". */
const title = computed(() => badge.value
  ? t('projects.deps.badgeTitle', { list: badge.value.all.map((item) => `${item.taskKey} (${t(TASK_STATUS_LABEL_KEYS[item.status])})`).join(', ') })
  : '')
</script>
