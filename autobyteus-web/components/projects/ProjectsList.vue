<template>
  <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8" data-testid="projects-index">
    <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">{{ t('projects.components.projects.ProjectsList.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">{{ t('projects.components.projects.ProjectsList.description') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex flex-shrink-0 items-center gap-2 self-start whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        data-testid="projects-new-button"
        @click="showCreateDialog = true"
      >
        <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
        {{ t('projects.components.projects.ProjectsList.newProject') }}
      </button>
    </header>

    <div v-if="projects.length > 0" class="mb-5 max-w-md">
      <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectsList.searchLabel') }}</label>
      <div class="relative">
        <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          :id="searchId"
          v-model="searchQuery"
          type="search"
          data-testid="projects-search-input"
          class="block w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectsList.searchPlaceholder')"
        />
      </div>
    </div>

    <div
      v-if="loading && projects.length === 0"
      class="rounded-xl border border-slate-200 bg-white py-20 text-center shadow-sm"
      role="status"
      data-testid="projects-loading"
    >
      <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-b-2 border-blue-600" aria-hidden="true"></div>
      <p class="text-slate-600">{{ t('projects.components.projects.ProjectsList.loading') }}</p>
    </div>

    <div
      v-else-if="error && projects.length === 0"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
      data-testid="projects-error"
    >
      <p class="font-semibold">{{ t('projects.components.projects.ProjectsList.loadFailed') }}</p>
      <p class="mt-1">{{ error.message }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="load(true)"
      >
        {{ t('projects.common.retry') }}
      </button>
    </div>

    <div
      v-else-if="projects.length === 0"
      class="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center"
      data-testid="projects-empty"
    >
      <Icon icon="heroicons:folder" class="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
      <h2 class="mt-3 text-lg font-semibold text-slate-900">{{ t('projects.components.projects.ProjectsList.emptyTitle') }}</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-slate-500">{{ t('projects.components.projects.ProjectsList.emptyHelp') }}</p>
    </div>

    <div
      v-else-if="filteredProjects.length === 0"
      class="rounded-xl border border-slate-200 bg-white py-14 text-center"
      role="status"
      data-testid="projects-no-match"
    >
      <p class="text-sm text-slate-600">{{ t('projects.components.projects.ProjectsList.noMatch', { query: searchQuery.trim() }) }}</p>
      <button
        type="button"
        class="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="projects-clear-search"
        @click="clearSearch"
      >
        {{ t('projects.components.projects.ProjectsList.clearSearch') }}
      </button>
    </div>

    <ul v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="projects-grid">
      <li v-for="project in filteredProjects" :key="project.projectId">
        <ProjectCard :project="project" />
      </li>
    </ul>

    <ProjectFormDialog
      v-if="showCreateDialog"
      @close="showCreateDialog = false"
      @saved="showCreateDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import ProjectCard from '~/components/projects/ProjectCard.vue'
import ProjectFormDialog from '~/components/projects/ProjectFormDialog.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

const { t } = useLocalization()
const projectStore = useProjectStore()
const windowNodeContextStore = useWindowNodeContextStore()
const { projects, loading, error } = storeToRefs(projectStore)

const searchId = `projects-search-${Math.random().toString(36).slice(2, 8)}`
const searchQuery = ref('')
const showCreateDialog = ref(false)

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) {
    return projects.value
  }
  return projects.value.filter((project) => (
    project.name.toLocaleLowerCase().includes(query)
    || project.description.toLocaleLowerCase().includes(query)
  ))
})

const load = (force = false): void => {
  void projectStore.fetchProjects(force).catch(() => undefined)
}

const clearSearch = (): void => {
  searchQuery.value = ''
  document.getElementById(searchId)?.focus()
}

onMounted(() => load(true))

// The store drops its cache when the window is rebound to another node; reload for the new node.
watch(() => windowNodeContextStore.bindingRevision, () => load(true))
</script>
