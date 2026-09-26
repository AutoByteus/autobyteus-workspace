<template>
  <aside
    class="flex max-h-[38dvh] w-full shrink-0 flex-col border-b border-slate-200 bg-white md:max-h-none md:w-72 md:border-b-0 md:border-r lg:w-80"
    :aria-labelledby="titleId"
    data-testid="project-list-pane"
  >
    <div class="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
      <h1 :id="titleId" class="text-lg font-semibold text-slate-900">{{ t('projects.components.projects.ProjectListPane.title') }}</h1>
      <button
        type="button"
        class="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        data-testid="projects-new-button"
        @click="showCreateDialog = true"
      >
        <Icon icon="heroicons:plus" class="h-4 w-4" aria-hidden="true" />
        {{ t('projects.components.projects.ProjectListPane.newProject') }}
      </button>
    </div>

    <div class="px-4 pb-3">
      <label :for="searchId" class="sr-only">{{ t('projects.components.projects.ProjectListPane.searchLabel') }}</label>
      <div class="relative">
        <Icon icon="heroicons:magnifying-glass" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          :id="searchId"
          v-model="searchQuery"
          type="search"
          data-testid="projects-search-input"
          class="block w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :placeholder="t('projects.components.projects.ProjectListPane.searchPlaceholder')"
        />
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
      <p v-if="loading && projects.length === 0" class="px-2 py-6 text-center text-sm text-slate-500" role="status" data-testid="projects-loading">
        {{ t('projects.components.projects.ProjectListPane.loading') }}
      </p>

      <div v-else-if="error && projects.length === 0" class="mx-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert" data-testid="projects-error">
        <p class="font-semibold">{{ t('projects.components.projects.ProjectListPane.loadFailed') }}</p>
        <p class="mt-1 break-words">{{ error.message }}</p>
        <button
          type="button"
          class="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          @click="load(true)"
        >
          {{ t('projects.common.retry') }}
        </button>
      </div>

      <p v-else-if="projects.length === 0" class="px-2 py-6 text-center text-sm text-slate-500" data-testid="projects-empty">
        {{ t('projects.components.projects.ProjectListPane.empty') }}
      </p>

      <div v-else-if="filteredProjects.length === 0" class="px-2 py-6 text-center" role="status" data-testid="projects-no-match">
        <p class="text-sm text-slate-600">{{ t('projects.components.projects.ProjectListPane.noMatch', { query: searchQuery.trim() }) }}</p>
        <button
          type="button"
          class="mt-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="projects-clear-search"
          @click="clearSearch"
        >
          {{ t('projects.components.projects.ProjectListPane.clearSearch') }}
        </button>
      </div>

      <nav v-else :aria-label="t('projects.components.projects.ProjectListPane.listLabel')">
        <ul class="space-y-0.5" data-testid="project-list">
          <ProjectListItem
            v-for="project in filteredProjects"
            :key="project.projectId"
            :project="project"
            :selected="project.projectId === selectedProjectId"
          />
        </ul>
      </nav>
    </div>

    <ProjectFormDialog v-if="showCreateDialog" @close="showCreateDialog = false" @saved="onCreated" />
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import ProjectFormDialog from '~/components/projects/ProjectFormDialog.vue'
import ProjectListItem from '~/components/projects/ProjectListItem.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useProjectStore } from '~/stores/projectStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { Project } from '~/types/project'

defineProps<{ selectedProjectId: string | null }>()

const { t } = useLocalization()
const projectStore = useProjectStore()
const windowNodeContextStore = useWindowNodeContextStore()
// `loading`/`error` are driven by the list fetch only; they are shown only while no Project is listed.
const { projects, loading, error } = storeToRefs(projectStore)

const uid = Math.random().toString(36).slice(2, 8)
const titleId = `projects-title-${uid}`
const searchId = `projects-search-${uid}`
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

const onCreated = async (project: Project): Promise<void> => {
  showCreateDialog.value = false
  await navigateTo(`/projects/${encodeURIComponent(project.projectId)}`)
}

onMounted(() => load(true))

// The store drops its cache when the window is rebound to another node; reload for the new node.
watch(() => windowNodeContextStore.bindingRevision, () => load(true))
</script>
