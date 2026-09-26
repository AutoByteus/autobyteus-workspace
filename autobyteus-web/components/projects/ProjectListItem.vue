<template>
  <li>
    <NuxtLink
      :to="`/projects/${encodeURIComponent(project.projectId)}`"
      class="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="selected ? 'bg-blue-50 font-medium text-blue-800' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'"
      :aria-current="selected ? 'page' : undefined"
      :data-testid="`project-list-item-${project.projectId}`"
    >
      <Icon icon="heroicons:folder" class="h-4 w-4 flex-shrink-0" :class="selected ? 'text-blue-600' : 'text-slate-400'" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">{{ project.name }}</span>
      <span
        class="flex-shrink-0 whitespace-nowrap text-xs"
        :class="project.openTaskCount > 0 ? 'text-slate-600' : 'text-slate-400'"
        data-testid="project-list-item-open-count"
      >
        {{ t('projects.components.projects.ProjectListItem.openCount', { count: project.openTaskCount }) }}
      </span>
    </NuxtLink>
  </li>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { Project } from '~/types/project'

defineProps<{
  project: Project
  selected: boolean
}>()

const { t } = useLocalization()
</script>
