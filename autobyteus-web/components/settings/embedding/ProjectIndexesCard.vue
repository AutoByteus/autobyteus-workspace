<template>
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="embedding-projects-card" aria-labelledby="embedding-projects-heading">
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="min-w-0 max-w-3xl">
        <h3 id="embedding-projects-heading" class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.search.projects.title') }}</h3>
        <p class="mt-1 text-sm text-gray-500"><span data-testid="embedding-projects-subtitle">{{ t('settings.search.projects.subtitle', { model: modelName }) }}</span></p>
      </div>
      <button
        type="button"
        :class="primaryButton"
        :disabled="!canIndexAll || indexingAll"
        :title="canIndexAll ? undefined : (unavailable ? t('settings.search.projects.unavailableNote') : t('settings.search.projects.indexAllDone'))"
        data-testid="embedding-index-all"
        @click="indexAll"
      >{{ t('settings.search.projects.indexAll') }}</button>
    </div>

    <p v-if="projects.length === 0" class="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-gray-500" data-testid="embedding-projects-empty">{{ t('settings.search.projects.empty') }}</p>

    <template v-else>
      <div v-if="!unavailable || projects.length > 8" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div v-if="!unavailable" class="flex flex-wrap gap-x-5 gap-y-1" role="group" :aria-label="t('settings.search.projects.filterLabel')" data-testid="embedding-project-filters">
          <button
            v-for="chip in chips"
            :key="chip.id"
            type="button"
            class="border-b-2 pb-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="filter === chip.id ? 'border-blue-500 font-medium text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'"
            :aria-pressed="filter === chip.id"
            :data-testid="`embedding-filter-${chip.id}`"
            @click="filter = chip.id"
          >{{ t(`settings.search.projects.filter.${chip.id}`) }} <span class="text-gray-400">{{ chip.count }}</span></button>
        </div>
        <label v-if="projects.length > 8" class="relative block sm:w-56">
          <span class="sr-only">{{ t('settings.search.projects.findLabel') }}</span>
          <svg class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.58 3.58a.75.75 0 1 1-1.06 1.06l-3.58-3.58A7 7 0 0 1 2 9Z" clip-rule="evenodd"/></svg>
          <input v-model="query" type="search" class="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" :placeholder="t('settings.search.projects.findPlaceholder')" data-testid="embedding-project-find" />
        </label>
      </div>

      <ul class="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200" :aria-label="t('settings.search.projects.listLabel')" data-testid="embedding-project-list">
        <li v-for="p in visible" :key="p.projectId" tabindex="-1" class="px-4 py-2.5 focus:outline-none" :data-testid="`embedding-project-${p.projectId}`" :data-state="displayState(p)">
          <div class="flex flex-col gap-1.5 sm:min-h-[2.25rem] sm:flex-row sm:items-center sm:gap-4">
            <p class="min-w-0 truncate text-sm font-medium text-gray-900 sm:w-[30%]" :title="p.name">{{ p.name }}</p>
            <div class="min-w-0 flex-1 text-sm" :data-testid="`embedding-project-${p.projectId}-status`">
              <template v-if="displayState(p) === 'INDEXING'">
                <div class="flex items-center gap-2 text-amber-700">
                  <span class="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600"></span>
                  <span>{{ t('settings.search.projects.state.indexing', { done: p.done ?? 0, total: p.total ?? 0 }) }}</span>
                </div>
                <div class="mt-1.5 h-1 max-w-[16rem] overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-label="`${p.name}: ${t('settings.search.projects.filter.indexing')}`" aria-valuemin="0" :aria-valuemax="p.total ?? 0" :aria-valuenow="p.done ?? 0">
                  <div class="h-full rounded-full bg-blue-500 transition-all duration-300" :style="{ width: `${percentOf(p.done, p.total)}%` }"></div>
                </div>
              </template>
              <div v-else-if="displayState(p) === 'WAITING'" class="flex items-center gap-2 text-gray-500">
                <span class="h-2 w-2 flex-shrink-0 rounded-full border border-gray-400"></span>
                <span>{{ modelReady ? t('settings.search.projects.state.waiting') : t('settings.search.projects.state.waitingModel') }}</span>
              </div>
              <div v-else-if="displayState(p) === 'READY'" class="flex items-center gap-2 text-green-700">
                <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600"></span>
                <span>{{ p.total === 1 ? t('settings.search.projects.state.readyOne') : t('settings.search.projects.state.ready', { count: p.total ?? 0 }) }}</span>
              </div>
              <div v-else-if="displayState(p) === 'NEEDS_UPDATE'" class="flex items-center gap-2 text-amber-700">
                <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                <span>{{ t('settings.search.projects.state.needsUpdate', { count: p.changed ?? 0 }) }}</span>
              </div>
              <div v-else-if="displayState(p) === 'UNAVAILABLE'" class="flex items-center gap-2 text-gray-400">
                <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300"></span>
                <span>{{ t('settings.search.projects.state.unavailable') }}</span>
              </div>
              <div v-else class="flex items-center gap-2 text-gray-500">
                <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-300"></span>
                <span>{{ t('settings.search.projects.state.notIndexed') }}</span>
              </div>
            </div>
            <div class="flex flex-shrink-0 flex-wrap items-center gap-1 sm:w-[14rem] sm:justify-end">
              <template v-if="confirmingRebuild !== p.projectId">
                <button v-if="canIndex(p)" type="button" :class="secondaryButton" :disabled="working === p.projectId" :data-testid="`embedding-project-${p.projectId}-index`" @click="run(p.projectId, () => actions.indexProject(p.projectId))">{{ t('settings.search.projects.indexNow') }}</button>
                <button v-if="canRebuild(p)" type="button" :class="textButton" :data-testid="`embedding-project-${p.projectId}-rebuild`" @click="openRebuild(p.projectId)">{{ t('settings.search.projects.rebuild') }}</button>
              </template>
            </div>
          </div>

          <div v-if="confirmingRebuild === p.projectId && canRebuild(p)" class="mt-2.5 flex flex-col gap-3 rounded-lg bg-gray-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" role="group" :aria-label="t('settings.search.projects.rebuild')" :data-testid="`embedding-project-${p.projectId}-rebuild-confirmation`" @keydown.esc.prevent="closeRebuild(p.projectId)">
            <p class="text-sm text-gray-700">{{ t('settings.search.projects.rebuildConfirm', { name: p.name }) }}</p>
            <div class="flex flex-shrink-0 items-center gap-2">
              <button type="button" :class="primaryButton" :disabled="working === p.projectId" :data-testid="`embedding-project-${p.projectId}-rebuild-confirm`" @click="confirmRebuild(p.projectId)">{{ t('settings.search.projects.rebuild') }}</button>
              <button type="button" :class="secondaryButton" :data-testid="`embedding-project-${p.projectId}-rebuild-cancel`" @click="closeRebuild(p.projectId)">{{ t('settings.search.actions.cancel') }}</button>
            </div>
          </div>
        </li>
        <li v-if="visible.length === 0" class="px-4 py-6 text-center text-sm text-gray-500" data-testid="embedding-projects-no-match">{{ t('settings.search.projects.noMatch') }}</li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EmbeddingSettings } from '~/composables/settings/useEmbeddingSettings'
import type { EmbeddingActiveDisplayState, ProjectTaskIndex, ProjectTaskIndexState } from '~/types/embeddingSettings'
import { focusTestId, percentOf } from './embeddingPresentation'

const props = defineProps<{
  projects: ProjectTaskIndex[]
  modelName: string
  /** The active model's display state; null when the active model is not in the list. */
  modelState: EmbeddingActiveDisplayState | null
  actions: Pick<EmbeddingSettings, 'indexProject' | 'rebuildProject' | 'indexAll'>
}>()

const { t } = useLocalization()

type Filter = 'all' | 'needs' | 'indexing' | 'ready'
const filter = ref<Filter>('all')
const query = ref('')
const confirmingRebuild = ref<string | null>(null)
const working = ref<string | null>(null)
const indexingAll = ref(false)

const unavailable = computed(() => props.modelState === 'UNAVAILABLE')
const modelReady = computed(() => props.modelState === 'READY')
const displayState = (p: ProjectTaskIndex): ProjectTaskIndexState => (unavailable.value ? 'UNAVAILABLE' : p.state)
const needsIndexing = (p: ProjectTaskIndex) => p.state === 'NOT_INDEXED' || p.state === 'NEEDS_UPDATE'
const canIndex = (p: ProjectTaskIndex) => !unavailable.value && needsIndexing(p)
// A Project without Tasks is Ready with nothing to rebuild (DEC-010).
const canRebuild = (p: ProjectTaskIndex) => !unavailable.value && ((p.state === 'READY' && (p.total ?? 0) > 0) || p.state === 'NEEDS_UPDATE')
const canIndexAll = computed(() => !unavailable.value && props.projects.some(needsIndexing))

const matches = (p: ProjectTaskIndex, id: Filter) =>
  id === 'all'
  || (id === 'needs' && needsIndexing(p))
  || (id === 'indexing' && (p.state === 'INDEXING' || p.state === 'WAITING'))
  || (id === 'ready' && p.state === 'READY')

const chips = computed(() => (['all', 'needs', 'indexing', 'ready'] as Filter[]).map((id) => ({
  id, count: props.projects.filter((p) => matches(p, id)).length,
})))

const visible = computed(() => props.projects.filter((p) =>
  (unavailable.value || matches(p, filter.value)) && p.name.toLowerCase().includes(query.value.trim().toLowerCase())))

const run = async (projectId: string, action: () => Promise<boolean>) => {
  working.value = projectId
  try {
    return await action()
  } finally {
    working.value = null
  }
}
const indexAll = async () => {
  indexingAll.value = true
  try {
    await props.actions.indexAll()
  } finally {
    indexingAll.value = false
  }
}

// Focus follows the inline confirmation: into it (on the safe Cancel), then back to the row's Rebuild or the row.
const openRebuild = (projectId: string) => { confirmingRebuild.value = projectId; void focusTestId(`embedding-project-${projectId}-rebuild-cancel`) }
const closeRebuild = (projectId: string) => { confirmingRebuild.value = null; void focusTestId(`embedding-project-${projectId}-rebuild`) }
const confirmRebuild = async (projectId: string) => {
  await run(projectId, () => props.actions.rebuildProject(projectId))
  confirmingRebuild.value = null
  void focusTestId(`embedding-project-${projectId}`)
}

const primaryButton = 'inline-flex min-h-9 items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex min-h-8 items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const textButton = 'inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
</script>
