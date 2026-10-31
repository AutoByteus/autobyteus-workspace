<template>
  <!-- projects-left-navigation (REQ-004, DEC-014): the chip menu's Projects tab: "No project" and each Project with the
       folder it brings. Up / Down move, Enter chooses (buttons), Escape closes (the menu's popover). -->
  <div
    ref="listRef"
    role="listbox"
    :aria-label="t('projectsTree.menuAria')"
    class="min-h-0 flex-1 overflow-y-auto py-1"
    data-test="chat-project-options"
    @keydown="onKeydown"
  >
    <button
      type="button"
      role="option"
      data-option
      data-test="chat-project-option-none"
      :aria-selected="!projectId ? 'true' : 'false'"
      class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      @click="emit('choose', null)"
    >
      <span class="min-w-0 flex-1 truncate text-sm" :class="!projectId ? 'font-medium text-blue-700' : 'text-gray-700'">{{ t('projectsTree.noProject') }}</span>
      <Icon v-if="!projectId" icon="heroicons:check" class="h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
    </button>
    <button
      v-for="project in projects"
      :key="project.projectId"
      type="button"
      role="option"
      data-option
      :data-test="`chat-project-option-${project.projectId}`"
      :aria-selected="projectId === project.projectId ? 'true' : 'false'"
      class="flex w-full items-start gap-2.5 px-3 py-1.5 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      @click="emit('choose', project.projectId)"
    >
      <Icon icon="heroicons:briefcase" class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium" :class="projectId === project.projectId ? 'text-blue-700' : 'text-gray-900'">{{ project.name }}</span>
        <span class="block truncate text-xs text-gray-500">{{ folderLabel(project) }}</span>
      </span>
      <Icon v-if="projectId === project.projectId" icon="heroicons:check" class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { projectFolderOf } from '~/stores/chatDraftProjectChoice'
import type { Project } from '~/types/project'

defineProps<{ projects: readonly Project[]; projectId: string | null }>()
const emit = defineEmits<{ (event: 'choose', projectId: string | null): void }>()
const { t } = useLocalization()
const listRef = ref<HTMLElement | null>(null)

/** The folder a run under the Project starts in: its first linked folder's name, else the temp workspace. */
const folderLabel = (project: Project): string => {
  const folder = projectFolderOf(project)
  return folder ? folder.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || folder : t('chat.workspace.temp')
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(listRef.value?.querySelectorAll<HTMLElement>('[data-option]') ?? [])
  const index = items.indexOf(document.activeElement as HTMLElement)
  event.preventDefault()
  items[event.key === 'ArrowDown' ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1)]?.focus()
}

/** The selected option, else the first: where focus goes when the tab opens. */
const focusSelected = () => (listRef.value?.querySelector<HTMLElement>('[aria-selected="true"]')
  ?? listRef.value?.querySelector<HTMLElement>('[data-option]'))?.focus()
defineExpose({ focusSelected })
</script>
