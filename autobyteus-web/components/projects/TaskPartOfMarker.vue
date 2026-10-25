<template>
  <!-- On a part's card: a quiet "Part of <key>" line (no pill: it informs, it does not ask for attention). The key refers
       to the parent; hovering gives the parent's title and status. -->
  <span
    v-if="parent"
    class="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-slate-500"
    :title="title"
    data-testid="task-part-of-marker"
  >
    <Icon icon="heroicons:arrow-turn-down-right-20-solid" class="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
    <span class="flex-shrink-0">{{ t('projects.parts.partOf') }}</span>
    <span class="min-w-0 font-medium text-slate-600"><TaskKey :task-key="parent.taskKey" /></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectTask } from '~/types/project'
import { parentOf } from '~/utils/projects/taskParts'
import { TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusPresentation'
import { taskTitleLabel } from '~/utils/projects/taskText'
import TaskKey from './TaskKey.vue'

const props = defineProps<{ task: ProjectTask; tasks: readonly ProjectTask[] }>()
const { t } = useLocalization()
const parent = computed(() => parentOf(props.task, props.tasks))
const title = computed(() => parent.value
  ? t('projects.parts.markerTitle', { key: parent.value.taskKey, title: taskTitleLabel(parent.value.title), status: t(TASK_STATUS_LABEL_KEYS[parent.value.status]) })
  : '')
</script>
