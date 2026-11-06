<template>
  <!-- workspace-tree-vs-chooser (REQ-006, UXJ-001): the run section's header: the view's name and one "View" menu
       choosing how the runs are shown. The menu holds the three views only (no add actions). -->
  <div class="flex items-center justify-between border-t border-gray-200 px-3 py-2">
    <h2
      id="run-section-title"
      class="-ml-1 min-w-0 flex-1 truncate px-2 py-1 text-sm font-semibold leading-5 text-gray-900"
      data-test="run-section-title"
    >{{ titleOf(modeStore.mode) }}</h2>
    <div ref="rootRef" class="relative flex-shrink-0">
      <button
        ref="triggerRef"
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="open ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'"
        data-test="run-section-view-menu"
        aria-haspopup="menu"
        :aria-expanded="open ? 'true' : 'false'"
        :title="t('workspaceFolders.menuTitle')"
        :aria-label="t('workspaceFolders.menuTitle')"
        @click="toggle"
        @keydown.down.prevent="openAndFocus"
      >
        <Icon icon="heroicons:ellipsis-horizontal-20-solid" class="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        v-if="open"
        ref="menuRef"
        role="menu"
        :aria-label="t('workspaceFolders.viewLabel')"
        class="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 text-left shadow-lg"
        data-test="run-section-view-menu-list"
        @keydown="onKeydown"
      >
        <div class="px-3 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400" role="presentation">{{ t('workspaceFolders.viewLabel') }}</div>
        <button
          v-for="option in VIEWS"
          :key="option.mode"
          type="button"
          role="menuitemradio"
          :aria-checked="modeStore.mode === option.mode ? 'true' : 'false'"
          :data-test="`run-section-view-${option.mode}`"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
          :class="modeStore.mode === option.mode ? 'font-medium text-gray-900' : 'text-gray-700'"
          @click="choose(option.mode)"
        >
          <Icon :icon="option.icon" class="h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate">{{ titleOf(option.mode) }}</span>
          <Icon v-if="modeStore.mode === option.mode" icon="heroicons:check-20-solid" class="h-4 w-4 flex-shrink-0 text-indigo-600" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRunSectionModeStore, type RunSectionMode } from '~/stores/runSectionModeStore'

const VIEWS: readonly { mode: RunSectionMode; icon: string }[] = [
  { mode: 'runs', icon: 'heroicons:queue-list' },
  { mode: 'workspaces', icon: 'heroicons:folder' },
  { mode: 'projects', icon: 'heroicons:briefcase' },
]
const TITLE_KEYS: Record<RunSectionMode, string> = {
  runs: 'workspaceFolders.viewRuns',
  workspaces: 'shell.navigation.workspaces',
  projects: 'shell.navigation.projects',
}

const { t } = useLocalization()
const modeStore = useRunSectionModeStore()
const titleOf = (mode: RunSectionMode): string => t(TITLE_KEYS[mode])

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

const items = (): HTMLElement[] => Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])
const close = (returnFocus = false): void => {
  open.value = false
  if (returnFocus) triggerRef.value?.focus()
}
const openAndFocus = async (): Promise<void> => {
  open.value = true
  await nextTick()
  ;(menuRef.value?.querySelector<HTMLElement>('[aria-checked="true"]') ?? items()[0])?.focus()
}
const toggle = (): void => {
  if (open.value) close()
  else void openAndFocus()
}
/** Choosing the current view only closes the menu; the choice is a display setting only (DS-001). */
const choose = (next: RunSectionMode): void => {
  close(true)
  if (next !== modeStore.mode) modeStore.setMode(next)
}
const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') { event.preventDefault(); close(true); return }
  if (event.key === 'Tab') { close(); return }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLElement)
  list[event.key === 'ArrowDown' ? Math.min(list.length - 1, index + 1) : Math.max(0, index - 1)]?.focus()
}
const onPointerDown = (event: MouseEvent): void => {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}
onMounted(() => document.addEventListener('mousedown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onPointerDown))
</script>
