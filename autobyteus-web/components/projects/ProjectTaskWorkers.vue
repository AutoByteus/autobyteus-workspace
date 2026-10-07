<template>
  <!-- project-manager-ux: the Task's root, the one agent or team it was handed to, with the worker's
       own status (the left panel's dot and word). It opens the worker when that worker is listed in
       the left panel; otherwise it has no chevron and is not focusable. -->
  <ul class="space-y-0.5" :class="density === 'row' ? 'mt-2' : ''" :aria-label="t('projects.root.listLabel')" data-testid="project-task-root">
    <li>
      <component
        :is="presentation.openable ? 'button' : 'div'"
        :type="presentation.openable ? 'button' : undefined"
        class="group/root flex w-full min-w-0 items-center gap-1.5 rounded-md text-left"
        :class="[
          density === 'detail' ? 'min-h-10 px-3 py-2 text-sm' : '-mx-1.5 min-h-7 px-1.5 py-1 text-xs',
          presentation.openable ? 'hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500' : '',
        ]"
        :aria-label="presentation.openable ? t('projects.root.open', { name: displayName }) : undefined"
        :title="presentation.error ?? undefined"
        :data-testid="`project-task-root-${presentation.state}`"
        :data-openable="presentation.openable ? 'true' : 'false'"
        @click.stop.prevent="presentation.openable && navigation.open(root)"
      >
        <span
          v-if="root.kind === 'team'"
          class="inline-flex flex-shrink-0 items-center justify-center text-slate-500"
          :class="density === 'detail' ? 'h-5 w-5' : 'h-4 w-4'"
          aria-hidden="true"
        ><Icon icon="heroicons:bolt-20-solid" :class="density === 'detail' ? 'h-4 w-4' : 'h-3.5 w-3.5'" /></span>
        <span
          v-else
          class="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600"
          :class="density === 'detail' ? 'h-5 w-5 text-[0.5625rem]' : 'h-4 w-4 text-[0.5rem]'"
          aria-hidden="true"
        >{{ initials }}</span>
        <span class="min-w-0 truncate" :class="[root.kind === 'team' ? 'font-semibold' : 'font-medium', presentation.muted ? 'text-slate-400' : 'text-slate-700']" data-testid="project-task-root-name">{{ displayName }}</span>
        <span class="ml-auto inline-flex flex-shrink-0 items-center gap-1.5 pl-2" :class="presentation.state === 'failed' ? 'font-medium text-red-600' : 'text-slate-500'" data-testid="project-task-root-status">
          <Icon v-if="presentation.state === 'failed'" icon="heroicons:exclamation-circle-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
          <StatusDot v-else :status="presentation.state as AgentStatus" />
          {{ t(TASK_ROOT_STATE_LABEL_KEYS[presentation.state]) }}
        </span>
        <Icon v-if="presentation.openable" icon="heroicons:chevron-right-20-solid" class="h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover/root:text-slate-500" aria-hidden="true" />
        <!-- A root that cannot be opened keeps the chevron's space, so every status lines up. -->
        <span v-else class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      </component>
      <p v-if="density === 'detail' && presentation.error" class="px-3 pb-1 text-xs leading-5 text-red-600" data-testid="project-task-root-error">{{ presentation.error }}</p>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import StatusDot from '~/components/workspace/common/StatusDot.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useTaskRootNavigation } from '~/composables/projects/useTaskRootNavigation'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import type { AgentStatus } from '~/types/agent/AgentStatus'
import type { TaskRootView } from '~/types/project'
import { TASK_ROOT_KIND_LABEL_KEYS, TASK_ROOT_STATE_LABEL_KEYS, isTaskRootHostListed, presentTaskRoot } from '~/utils/projects/taskRootPresentation'

const props = withDefaults(defineProps<{
  root: TaskRootView
  /** `row`: inside a board row; `detail`: the Task page's "Assigned to" section. */
  density?: 'row' | 'detail'
}>(), { density: 'row' })

const { t } = useLocalization()
const history = useRunHistoryStore()
const navigation = useTaskRootNavigation()
const presentation = computed(() => presentTaskRoot(props.root, isTaskRootHostListed(history, props.root.hostRoot)))
const displayName = computed(() => presentation.value.name ?? t(TASK_ROOT_KIND_LABEL_KEYS[props.root.kind]))
const initials = computed(() => displayName.value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AI')
</script>
