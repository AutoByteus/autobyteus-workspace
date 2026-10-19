<template>
  <div class="project-task-board" data-testid="project-task-board">
    <div class="project-task-board__toolbar">
      <div class="project-task-board__search relative">
        <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectTaskBoard.searchLabel') }}</label>
        <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input :id="searchId" v-model="searchQuery" type="search" data-testid="project-tasks-search-input" class="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" :placeholder="t('projects.components.projects.ProjectTaskBoard.searchPlaceholder')" />
      </div>
      <CancelledTasksToggle v-if="cancelledCount > 0" class="ml-auto" :count="cancelledCount" :pressed="showCancelled" data-testid="project-tasks-cancelled-toggle" @toggle="showCancelled = !showCancelled" />
      <button type="button" :disabled="list?.initialPending || list?.refreshPending" :aria-busy="list?.refreshPending || undefined" :class="cancelledCount > 0 ? '' : 'ml-auto'" class="inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60" data-testid="project-tasks-refresh" @click="refresh"><Icon icon="heroicons:arrow-path" class="h-4 w-4" :class="list?.refreshPending ? 'animate-spin motion-reduce:animate-none' : ''" aria-hidden="true" />{{ t(list?.refreshPending ? 'projects.ui.refreshing' : 'projects.ui.refresh') }}</button>
      <NuxtLink v-if="!compact" :to="`/projects/${projectId}/tasks/new`" class="inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 sm:px-4" data-testid="project-tasks-new-button"><Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />{{ t('projects.components.projects.ProjectTaskBoard.newTask') }}</NuxtLink>
    </div>

    <p v-if="meaningStatusText" class="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-500" :role="searchFailed || meaningUnavailable ? 'alert' : 'status'" data-testid="project-tasks-meaning-status"><span>{{ meaningStatusText }}</span><button v-if="searchFailed || meaningUnavailable" type="button" class="min-h-8 rounded-md px-1 font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="project-tasks-meaning-retry" @click="retrySearch">{{ t('projects.common.retry') }}</button></p>
    <p v-if="boardState === 'loading'" class="mt-4 rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500" role="status" data-testid="project-tasks-loading">{{ t('projects.components.projects.ProjectTaskBoard.loading') }}</p>
    <div v-if="list?.error" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="project-tasks-error"><p class="font-semibold">{{ t(list?.hasLoaded ? 'projects.ui.refreshFailed' : 'projects.components.projects.ProjectTaskBoard.loadFailed') }}</p><p class="mt-1">{{ loadError }}</p><button type="button" class="mt-3 rounded-md border border-red-300 bg-white px-3 py-2 text-sm" @click="load(true)">{{ t('projects.common.retry') }}</button></div>
    <div v-if="list?.hasLoaded && isNoMatch" class="mt-4 rounded-xl border border-slate-200 bg-white py-12 text-center" role="status" data-testid="project-tasks-no-match"><Icon icon="heroicons:magnifying-glass" class="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" /><p class="mt-3 text-sm font-medium text-slate-700">{{ t('projects.ui.noMatch') }}</p><p class="mt-1 text-xs text-slate-500">{{ t('projects.ui.trySearch') }}</p><button type="button" class="mt-4 min-h-10 rounded-md px-3 text-sm font-medium text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="project-tasks-clear-search" @click="clearSearch">{{ t('projects.ui.clearSearch') }}</button></div>

    <div v-if="list?.hasLoaded && !isNoMatch" class="project-task-board__columns mt-6" :class="showCancelled ? 'project-task-board__columns--with-cancelled' : ''" data-testid="project-task-columns">
      <section v-for="status in shownLanes" :key="status" class="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" :aria-labelledby="columnHeadingId(status)" :data-testid="`project-task-column-${status}`">
        <h2 :id="columnHeadingId(status)" class="flex min-h-12 items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">{{ t(TASK_STATUS_LABEL_KEYS[status]) }}<span class="text-xs font-normal text-slate-500" data-testid="project-task-column-count">{{ columns[status].length }}</span></h2>
        <p v-if="columns[status].length === 0" class="px-4 py-7 text-center text-xs text-slate-500" data-testid="project-task-column-empty">{{ t('projects.components.projects.ProjectTaskBoard.noTasks') }}</p>
        <ul v-else class="divide-y divide-slate-100"><li v-for="task in columns[status]" :key="task.taskId"><ProjectTaskRow :task="task" :activation="compact ? 'select' : 'route'" @select="emit('select-task', $event)" /></li></ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import CancelledTasksToggle from './CancelledTasksToggle.vue'
import ProjectTaskRow from './ProjectTaskRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useTaskLocatorStore } from '~/stores/taskLocatorStore'
import { useProjectTaskSearch } from '~/composables/projects/useProjectTaskSearch'
import type { ProjectTask, ProjectTaskStatus } from '~/types/project'
import { BOARD_OPEN_LANES, TASK_STATUS_LABEL_KEYS } from '~/utils/projects/taskStatusPresentation'
/**
 * `compact` (the right panel's Projects tab): no New task, and a card emits `select-task` instead of routing.
 * Cancelled Tasks (dropped as not needed) are hidden until the "Cancelled (N)" toggle shows them as the last
 * column, after Done; every visit starts hidden.
 */
const props = withDefaults(defineProps<{projectId: string; compact?: boolean}>(), {compact: false})
const emit = defineEmits<{(event: 'select-task', taskId: string): void}>()
const {t} = useLocalization(), store = useProjectTaskStore(), node = useWindowNodeContextStore()
const uid = Math.random().toString(36).slice(2, 8), searchId = `project-tasks-search-${uid}`
const columnHeadingId = (status: ProjectTaskStatus) => `project-task-column-${status}-${uid}`
const projectId = computed(() => props.projectId)
const searchQuery = computed({get: () => store.searchByProjectId[props.projectId] ?? '', set: (value) => store.setSearch(props.projectId, value)})
const list = computed(() => store.getList(props.projectId))
const tasks = computed(() => list.value?.tasks ?? [])
const boardState = computed(() => !list.value?.hasLoaded && list.value?.initialPending ? 'loading' : 'ready')
const loadError = computed(() => list.value?.error?.message)
const cancelledCount = computed(() => tasks.value.filter((task) => task.status === 'CANCELLED').length)
const showCancelled = ref(false)
watch(cancelledCount, (count) => { if (count === 0) showCancelled.value = false })
const shownLanes = computed<readonly ProjectTaskStatus[]>(() => showCancelled.value ? [...BOARD_OPEN_LANES, 'CANCELLED'] : BOARD_OPEN_LANES)
const visibleTasks = computed(() => showCancelled.value ? tasks.value : tasks.value.filter((task) => task.status !== 'CANCELLED'))
// The server decides matches (exact text first, then meaning) over all of the Project's Tasks; the board shows those
// in the shown lanes, best-first. Toggling Cancelled only changes which lanes show; it never searches again.
const search = useProjectTaskSearch({projectId: () => props.projectId, query: () => searchQuery.value, tasks: () => tasks.value})
const matchingTasks = computed(() => {
  const ranks = search.answer.value?.ranks
  if (!ranks) return visibleTasks.value
  return visibleTasks.value.filter((task) => ranks.has(task.taskId)).sort((a, b) => ranks.get(a.taskId)! - ranks.get(b.taskId)!)
})
const columns = computed(() => {
  const grouped: Record<ProjectTaskStatus, ProjectTask[]> = {TODO: [], IN_PROGRESS: [], DONE: [], CANCELLED: []}
  for (const task of matchingTasks.value) grouped[task.status].push(task)
  return grouped
})
const isNoMatch = computed(() => Boolean(search.answer.value) && visibleTasks.value.length > 0 && matchingTasks.value.length === 0)
const searchFailed = computed(() => search.active.value && search.error.value !== null)
const meaningUnavailable = computed(() => search.meaningSearch.value?.state === 'UNAVAILABLE')
const megabytes = (bytes: number | null) => Math.round((bytes ?? 0) / 1_000_000)
/** One quiet line, only while meaning search is not ready (or the search request failed). */
const meaningStatusText = computed(() => {
  if (searchFailed.value) return t('projects.components.projects.ProjectTaskBoard.searchFailed', {reason: search.error.value ?? ''})
  const status = search.meaningSearch.value
  if (!status || status.state === 'READY') return ''
  if (status.state === 'UNAVAILABLE') return t('projects.components.projects.ProjectTaskBoard.meaningUnavailable', {reason: status.reason ?? ''})
  if (status.phase === 'INDEXING') return t('projects.components.projects.ProjectTaskBoard.meaningIndexing', {done: status.done ?? 0, total: status.total ?? 0})
  if (status.phase === 'DOWNLOADING') return t('projects.components.projects.ProjectTaskBoard.meaningDownloading', {done: megabytes(status.done), total: megabytes(status.total)})
  return t('projects.components.projects.ProjectTaskBoard.meaningPreparing')
})
const retrySearch = () => { if (searchFailed.value) search.reload(); else void search.retry() }
const load = (force = false) => { void store.fetchTasks(props.projectId, force).catch(() => undefined) }
const refresh = () => { void store.refreshTasks(props.projectId).catch(() => undefined) }
const clearSearch = () => {searchQuery.value = ''; document.getElementById(searchId)?.focus()}
const mountReadStarted = ref(false)
onMounted(() => { load(true); mountReadStarted.value = true })
onBeforeUnmount(() => store.releaseRead(props.projectId))
watch(() => props.projectId, (id, previous) => {store.releaseRead(previous); load(true)})
watch(() => node.bindingRevision, () => load(true)) // Preserve the existing watcher; not an interactive switching journey.
// "Show Task in Projects" (compact only): once Projects is revealed on this Project, make the Task visible
// (Cancelled lane, a hiding search cleared) and hand it to its card. It decides only on a settled list and settled
// search results: never before its own mount read started nor while a read or search is in flight. A Task absent
// from the list is left alone (the request expires).
const locator = useTaskLocatorStore()
const settled = computed(() => mountReadStarted.value && Boolean(list.value?.hasLoaded) && !list.value?.initialPending && !list.value?.refreshPending
  && search.settled.value)
watch(() => props.compact && settled.value && locator.request?.step === 'revealed' && locator.request.task.projectId === props.projectId ? locator.request : null, (request) => {
  const task = request && tasks.value.find((item) => item.taskId === request.task.taskId)
  if (!request || !task) return
  if (task.status === 'CANCELLED') showCancelled.value = true
  if (search.active.value && !search.answer.value?.ranks.has(task.taskId)) searchQuery.value = ''
  locator.markVisible(request.seq)
}, {immediate: true})
</script>
<style scoped>
.project-task-board { container-type: inline-size; container-name: project-task-board; }
.project-task-board__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
.project-task-board__search { flex: 1 0 100%; min-width: 0; }
@container project-task-board (min-width: 480px) { .project-task-board__search { flex: 1 1 0%; } }
.project-task-board__columns { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr); }
@container project-task-board (min-width: 752px) {
  .project-task-board__columns { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .project-task-board__columns--with-cancelled { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
