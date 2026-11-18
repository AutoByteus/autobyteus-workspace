<template>
  <!-- The row opens the Task (a stretched link); the Task's root sits beneath the text and opens the
       worker. A Task that just arrived or moved live, or was located from the Workspaces tree, is
       highlighted for 2.4 s (project-manager-ux, delegated-copy-task-locator). -->
  <div
    ref="rowRef"
    class="project-task-row relative px-4 py-3.5 transition-colors hover:bg-slate-50"
    :class="[live ? `is-live-${live}` : '', located ? 'is-located' : '']"
    :data-testid="`project-task-row-${task.taskId}`"
    :data-live="live || undefined"
    :data-located="located || undefined"
  >
    <component
      ref="linkRef"
      :is="activation === 'route' ? NuxtLink : 'button'"
      v-bind="activation === 'route' ? { to: taskRoute } : { type: 'button' }"
      class="block w-full text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-blue-500"
      :aria-label="label"
      data-testid="project-task-row-link"
      @click="activation === 'select' && emit('select', task.taskId)"
    >
      <span class="line-clamp-2 break-words text-sm font-medium leading-6 text-slate-800" data-testid="project-task-row-text">{{ mainLine }}</span>
      <span v-if="preview" class="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500" data-testid="project-task-row-preview">{{ preview }}</span>
      <!-- "Blocked by <key>" / "Dependency cancelled: <key>" (open Project Tasks only). -->
      <!-- Beside it, on one wrapping line: a parent's progress ("2 of 4 done") and a part's quiet "Part of <key>" (part-of). -->
      <span v-if="hasDependency || hasProgress || hasParent" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5" data-testid="project-task-row-relations">
        <span v-if="hasDependency" class="flex min-w-0 max-w-full" data-testid="project-task-row-dependency"><TaskDependencyBadge :task="projectTask!" :tasks="projectTasks" /></span>
        <TaskPartsProgress v-if="hasProgress" :task="projectTask!" :tasks="projectTasks" />
        <TaskPartOfMarker v-if="hasParent" :task="projectTask!" :tasks="projectTasks" />
      </span>
      <span v-if="fileCount" class="mt-2 inline-flex items-center gap-1 text-xs text-slate-500" data-testid="task-row-file-count"><Icon icon="heroicons:paper-clip" class="h-3.5 w-3.5" aria-hidden="true" />{{ t(fileCount === 1 ? 'projects.ui.fileCountOne' : 'projects.ui.fileCount', {count: fileCount}) }}</span>
    </component>
    <ProjectTaskWorkers v-if="task.root" class="relative z-10" density="row" :root="task.root" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, resolveComponent, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ProjectTask, TaskWithoutProject } from '~/types/project'
import ProjectTaskWorkers from './ProjectTaskWorkers.vue'
import TaskDependencyBadge from './TaskDependencyBadge.vue'
import TaskPartsProgress from './TaskPartsProgress.vue'
import TaskPartOfMarker from './TaskPartOfMarker.vue'
import { parentOf, partsOf, partsProgressOf } from '~/utils/projects/taskParts'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { taskPagePath } from '~/utils/projects/taskPagePath'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import { descriptionFirstLine, descriptionFirstLineLabel, taskCardPreview, taskCardTitle, taskTitleLabel } from '~/utils/projects/taskText'

// The main line is a Project Task's title (a Temp task's first description line); the description's start is a quieter
// context preview. Each is bounded before rendering and clamped to 2 lines by CSS; the Task page shows the full description.
/**
 * `route` (the Projects pages): the row links to the Task page. `select` (the right panel's Projects
 * tab): it emits `select` so the Task opens inside the tab; same visuals.
 */
const props = withDefaults(defineProps<{ task: ProjectTask | TaskWithoutProject; activation?: 'route' | 'select' }>(), { activation: 'route' })
const NuxtLink = resolveComponent('NuxtLink')
const emit = defineEmits<{ (event: 'select', taskId: string): void }>()

const {t} = useLocalization()
const store = useProjectTaskStore()
const isProjectTask = computed(() => 'projectId' in props.task)
const line = computed(() => 'projectId' in props.task ? props.task.title : descriptionFirstLine(props.task.description))
const mainLine = computed(() => taskCardTitle(line.value))
const preview = computed(() => taskCardPreview({title: line.value, description: props.task.description}))
const label = computed(() => isProjectTask.value ? taskTitleLabel(line.value) : descriptionFirstLineLabel(props.task.description))
const taskRoute = computed(() => 'projectId' in props.task
  ? taskPagePath(props.task.projectId, props.task)
  : `/projects/temp-tasks/tasks/${props.task.taskId}`)
const fileCount = computed(() => 'contextFiles' in props.task ? props.task.contextFiles?.length ?? 0 : 0)
const live = computed(() => store.liveChanges[props.task.taskId] ?? null)
// The Project's Tasks, for the dependency badge (a Temp task has none). Cards show no key: keys appear
// where they link or refer to a Task (task-keys-declutter).
const projectTasks = computed<ProjectTask[]>(() => 'projectId' in props.task ? store.getList(props.task.projectId)?.tasks ?? [] : [])
const projectTask = computed<ProjectTask | null>(() => 'taskKey' in props.task ? props.task : null)
const hasDependency = computed(() => Boolean(projectTask.value?.dependsOnTaskIds.length))
// A parent shows its progress while it has parts that count; a part shows its parent (a Temp task has neither).
const hasProgress = computed(() => Boolean(projectTask.value) && partsProgressOf(partsOf(projectTask.value!, projectTasks.value)).total > 0)
const hasParent = computed(() => Boolean(projectTask.value) && parentOf(projectTask.value!, projectTasks.value) !== null)

// "Show Task in Projects" (the tab's `select` cards): once the board made this Task visible, the card
// scrolls to the centre (instant with reduced motion), takes focus (Enter opens the Task) and completes
// the request, which highlights only this card for 2.4 s.
const locator = useTaskLocatorStore()
const rowRef = ref<HTMLElement | null>(null)
const linkRef = ref<HTMLElement | null>(null)
const located = computed(() => props.activation === 'select' && locator.located?.taskId === props.task.taskId)
watch(() => props.activation === 'select' && locator.request?.step === 'visible' && locator.request.task.taskId === props.task.taskId ? locator.request.seq : null, async (seq) => {
  if (seq === null) return
  // Let the revealed panel or drawer and the board lay out first.
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const row = rowRef.value
  if (!row?.isConnected || locator.request?.seq !== seq) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  row.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
  linkRef.value?.focus({ preventScroll: true })
  locator.complete(seq)
}, { immediate: true })
</script>

<style scoped>
/* A Task an agent just wrote (or moved) shows a soft indigo wash and left bar that fade over 2.4 s. */
.project-task-row.is-live-moved, .project-task-row.is-located { animation: task-live 2400ms ease-out both; }
.project-task-row.is-live-arrived { animation: task-arrive 2400ms ease-out both; }
@keyframes task-live {
  0%, 35% { background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  100% { background-color: transparent; box-shadow: inset 2px 0 transparent; }
}
@keyframes task-arrive {
  0% { opacity: 0; transform: translateY(-4px); background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  8% { opacity: 1; transform: none; }
  35% { background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
  100% { background-color: transparent; box-shadow: inset 2px 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .project-task-row.is-live-moved, .project-task-row.is-live-arrived, .project-task-row.is-located { animation: none; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
}
</style>
