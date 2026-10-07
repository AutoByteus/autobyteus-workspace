<template>
  <!-- project-manager-ux round 2: Tasks with no Project, in the Project board's style. Two lanes
       (Open, Done) because agents rarely set IN_PROGRESS on them; the root line says what is
       happening. Read only: agents create and change them. -->
  <div class="w-full px-4 py-5 sm:px-6 lg:px-8" data-testid="temp-task-board-page">
    <NuxtLink
      to="/projects"
      class="inline-flex items-center gap-1 rounded text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :aria-label="t('projects.components.projects.ProjectDetail.backToProjectsLabel')"
      data-testid="temp-task-board-back"
    >
      <Icon icon="heroicons:arrow-left" class="h-4 w-4" aria-hidden="true" />
      {{ t('projects.components.projects.ProjectDetail.backToProjects') }}
    </NuxtLink>

    <header class="mt-3">
      <h1 class="text-2xl font-semibold text-slate-900">{{ t('projects.temp.title') }}</h1>
      <p class="mt-1 text-sm text-slate-600">{{ t('projects.temp.boardHelp') }}</p>
    </header>

    <div class="temp-board mt-6" data-testid="temp-task-board">
      <div class="temp-board__toolbar">
        <div class="temp-board__search relative">
          <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectTaskBoard.searchLabel') }}</label>
          <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input :id="searchId" v-model="searchQuery" type="search" class="block min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" :placeholder="t('projects.components.projects.ProjectTaskBoard.searchPlaceholder')" data-testid="temp-tasks-search-input" />
        </div>
        <button type="button" :disabled="list?.initialPending || list?.refreshPending" :aria-busy="list?.refreshPending || undefined" class="ml-auto inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60" data-testid="temp-tasks-refresh" @click="refresh"><Icon icon="heroicons:arrow-path" class="h-4 w-4" :class="list?.refreshPending ? 'animate-spin motion-reduce:animate-none' : ''" aria-hidden="true" />{{ t(list?.refreshPending ? 'projects.ui.refreshing' : 'projects.ui.refresh') }}</button>
      </div>

      <p v-if="!list?.hasLoaded && list?.initialPending" class="mt-4 rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500" role="status" data-testid="temp-tasks-loading">{{ t('projects.components.projects.ProjectTaskBoard.loading') }}</p>
      <div v-if="list?.error" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert" data-testid="temp-tasks-error"><p class="font-semibold">{{ t(list?.hasLoaded ? 'projects.ui.refreshFailed' : 'projects.components.projects.ProjectTaskBoard.loadFailed') }}</p><p class="mt-1">{{ list?.error?.message }}</p><button type="button" class="mt-3 rounded-md border border-red-300 bg-white px-3 py-2 text-sm" @click="load">{{ t('projects.common.retry') }}</button></div>
      <div v-if="list?.hasLoaded && isNoMatch" class="mt-4 rounded-xl border border-slate-200 bg-white py-12 text-center" role="status" data-testid="temp-tasks-no-match"><Icon icon="heroicons:magnifying-glass" class="mx-auto h-6 w-6 text-slate-300" aria-hidden="true" /><p class="mt-3 text-sm font-medium text-slate-700">{{ t('projects.ui.noMatch') }}</p><p class="mt-1 text-xs text-slate-500">{{ t('projects.ui.trySearch') }}</p><button type="button" class="mt-4 min-h-10 rounded-md px-3 text-sm font-medium text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="clearSearch">{{ t('projects.ui.clearSearch') }}</button></div>

      <div v-if="list?.hasLoaded && !isNoMatch" class="temp-board__lanes mt-6" data-testid="temp-task-lanes">
        <section v-for="lane in LANES" :key="lane" class="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" :aria-labelledby="`${uid}-${lane}`" :data-testid="`temp-task-lane-${lane}`">
          <h2 :id="`${uid}-${lane}`" class="flex min-h-12 items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700">{{ t(`projects.temp.lane.${lane}`) }}<span class="text-xs font-normal text-slate-500" data-testid="temp-task-lane-count">{{ lanes[lane].length }}</span></h2>
          <p v-if="lanes[lane].length === 0" class="px-4 py-7 text-center text-xs text-slate-500">{{ t('projects.components.projects.ProjectTaskBoard.noTasks') }}</p>
          <ul v-else class="divide-y divide-slate-100"><li v-for="task in shown(lane)" :key="task.taskId"><ProjectTaskRow :task="task" /></li></ul>
          <button
            v-if="lane === 'done' && !searching && lanes.done.length > DONE_LIMIT"
            type="button"
            class="flex min-h-11 w-full items-center justify-center gap-1 border-t border-slate-100 text-sm font-medium text-blue-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
            :aria-expanded="showAllDone"
            data-testid="temp-task-lane-show-all"
            @click="showAllDone = !showAllDone"
          >
            {{ showAllDone ? t('projects.temp.showFewer') : t('projects.temp.showAll', { count: lanes.done.length }) }}
            <Icon icon="heroicons:chevron-down-20-solid" class="h-4 w-4 transition-transform" :class="showAllDone ? 'rotate-180' : ''" aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ProjectTaskRow from './ProjectTaskRow.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectChangeFeed } from '~/composables/projects/useProjectChangeFeed'
import { TEMP_TASKS_LIST_ID, useProjectTaskStore } from '~/stores/projectTaskStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { TaskWithoutProject } from '~/types/project'

type Lane = 'open' | 'done'
const LANES: readonly Lane[] = ['open', 'done']
/** The Done lane shows its 10 most recent Tasks until "Show all"; search shows every match. */
const DONE_LIMIT = 10

const { t } = useLocalization()
const store = useProjectTaskStore()
const node = useWindowNodeContextStore()
useProjectChangeFeed()
const uid = `temp-${Math.random().toString(36).slice(2, 8)}`
const searchId = `${uid}-search`
const searchQuery = computed({ get: () => store.searchByProjectId[TEMP_TASKS_LIST_ID] ?? '', set: (value) => store.setSearch(TEMP_TASKS_LIST_ID, value) })
const searching = computed(() => Boolean(searchQuery.value.trim()))
const list = computed(() => store.getTempList())
const tasks = computed(() => list.value?.tasks ?? [])
const matching = computed(() => tasks.value.filter((task) => !searching.value || task.description.toLocaleLowerCase().includes(searchQuery.value.trim().toLocaleLowerCase())))
const lanes = computed(() => {
  const grouped: Record<Lane, TaskWithoutProject[]> = { open: [], done: [] }
  for (const task of matching.value) grouped[task.status === 'DONE' ? 'done' : 'open'].push(task)
  return grouped
})
const isNoMatch = computed(() => tasks.value.length > 0 && matching.value.length === 0)
const showAllDone = ref(false)
const shown = (lane: Lane) => lane === 'done' && !showAllDone.value && !searching.value ? lanes.value.done.slice(0, DONE_LIMIT) : lanes.value[lane]
const load = () => { void store.fetchTasks(TEMP_TASKS_LIST_ID, true).catch(() => undefined) }
const refresh = () => { void store.refreshTasks(TEMP_TASKS_LIST_ID).catch(() => undefined) }
const clearSearch = () => { searchQuery.value = ''; document.getElementById(searchId)?.focus() }
onMounted(load)
onBeforeUnmount(() => store.releaseRead(TEMP_TASKS_LIST_ID))
watch(() => node.bindingRevision, load)
</script>

<style scoped>
.temp-board { container-type: inline-size; container-name: temp-board; }
.temp-board__toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
.temp-board__search { flex: 1 0 100%; min-width: 0; }
@container temp-board (min-width: 480px) { .temp-board__search { flex: 1 1 0%; } }
.temp-board__lanes { display: grid; gap: 1rem; grid-template-columns: minmax(0, 1fr); }
@container temp-board (min-width: 752px) { .temp-board__lanes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
