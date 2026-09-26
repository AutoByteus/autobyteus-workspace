<template>
  <NuxtLink
    :to="`/projects/${encodeURIComponent(project.projectId)}`"
    class="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    :data-testid="`project-card-${project.projectId}`"
  >
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600" aria-hidden="true">
        <Icon icon="heroicons:folder" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{{ project.name }}</h2>
        <p class="mt-1 line-clamp-3 text-sm" :class="project.description ? 'text-slate-600' : 'italic text-slate-400'">
          {{ project.description || t('projects.common.noDescription') }}
        </p>
      </div>
    </div>
    <p class="mt-auto pt-4 text-xs font-medium text-slate-500" data-testid="project-card-workspace-count">
      {{ workspaceCountLabel }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { Project } from '~/types/project'

const props = defineProps<{ project: Project }>()

const { t } = useLocalization()

const workspaceCountLabel = computed(() => {
  const count = props.project.workspaces.length
  if (count === 0) {
    return t('projects.components.projects.ProjectCard.noWorkspaces')
  }
  return count === 1
    ? t('projects.components.projects.ProjectCard.oneWorkspace')
    : t('projects.components.projects.ProjectCard.workspaceCount', { count })
})
</script>
