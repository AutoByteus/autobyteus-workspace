<template>
  <li
    class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
    :data-testid="`project-workspace-row-${link.workspaceId}`"
    :data-availability="link.availability"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-sm font-semibold" :class="isAvailable ? 'text-slate-900' : 'text-slate-500'">{{ link.displayName }}</h3>
        <span
          v-if="!isAvailable"
          class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
          data-testid="project-workspace-unavailable"
        >
          <Icon icon="heroicons:exclamation-triangle" class="h-3.5 w-3.5" aria-hidden="true" />
          {{ t('projects.components.projects.ProjectWorkspaceRow.unavailable') }}
        </span>
      </div>
      <p class="mt-0.5 break-words font-mono text-xs text-slate-500" data-testid="project-workspace-path">
        <template v-for="(segment, index) in pathSegments" :key="index">{{ segment }}<wbr /></template>
      </p>
      <p class="mt-2 whitespace-pre-line text-sm" :class="link.description ? 'text-slate-700' : 'italic text-slate-400'">
        {{ link.description || t('projects.common.noDescription') }}
      </p>
      <p v-if="!isAvailable" class="mt-1 text-xs text-amber-700">
        {{ t('projects.components.projects.ProjectWorkspaceRow.unavailableHelp') }}
      </p>
    </div>

    <div class="flex flex-shrink-0 gap-2">
      <button
        type="button"
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60"
        :aria-label="t('projects.components.projects.ProjectWorkspaceRow.editAriaLabel', { name: link.displayName })"
        :disabled="busy"
        data-testid="project-workspace-edit"
        @click="emit('edit', link)"
      >
        {{ t('projects.components.projects.ProjectWorkspaceRow.edit') }}
      </button>
      <button
        type="button"
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-60"
        :aria-label="t('projects.components.projects.ProjectWorkspaceRow.unlinkAriaLabel', { name: link.displayName })"
        :disabled="busy"
        data-testid="project-workspace-unlink"
        @click="emit('unlink', link)"
      >
        {{ t('projects.components.projects.ProjectWorkspaceRow.unlink') }}
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ProjectWorkspace } from '~/types/project'
import { pathBreakSegments } from '~/utils/projects/pathBreakSegments'

const props = defineProps<{
  link: ProjectWorkspace
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', link: ProjectWorkspace): void
  (e: 'unlink', link: ProjectWorkspace): void
}>()

const { t } = useLocalization()
const isAvailable = computed(() => props.link.availability === 'AVAILABLE')
const pathSegments = computed(() => pathBreakSegments(props.link.workspaceRootPath))
</script>
