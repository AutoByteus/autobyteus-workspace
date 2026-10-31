<template>
  <!-- projects-left-navigation (REQ-001, DEC-009): the run section's flat "Workspaces | Projects" text switch. Switching
       only changes the tree below; the first tab's text lines up with the rows' chevrons. -->
  <div
    role="tablist"
    :aria-label="t('projectsTree.switchLabel')"
    class="-ml-1 flex min-w-0 flex-1 items-center gap-1"
    data-test="run-section-switch"
    @keydown.left.prevent="move(-1)"
    @keydown.right.prevent="move(1)"
    @keydown.home.prevent="choose('workspaces', true)"
    @keydown.end.prevent="choose('projects', true)"
  >
    <button
      v-for="option in MODES"
      :id="`run-section-tab-${option}`"
      :key="option"
      :ref="(element: unknown) => { tabs[option] = element as HTMLElement | null }"
      type="button"
      role="tab"
      :data-test="`run-section-tab-${option}`"
      :aria-selected="modeStore.mode === option ? 'true' : 'false'"
      aria-controls="run-section-panel"
      :tabindex="modeStore.mode === option ? 0 : -1"
      class="cursor-pointer truncate rounded-md px-2 py-1 text-sm leading-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :class="modeStore.mode === option ? 'font-semibold text-gray-900' : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
      @click="choose(option)"
    >{{ t(option === 'workspaces' ? 'shell.navigation.workspaces' : 'shell.navigation.projects') }}</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRunSectionModeStore, type RunSectionMode } from '~/stores/runSectionModeStore'

const MODES: readonly RunSectionMode[] = ['workspaces', 'projects']
const { t } = useLocalization()
const modeStore = useRunSectionModeStore()
const tabs: Partial<Record<RunSectionMode, HTMLElement | null>> = {}

const choose = (next: RunSectionMode, focus = false) => {
  modeStore.setMode(next)
  if (focus) void nextTick(() => tabs[next]?.focus())
}
const move = (step: number) => {
  const index = MODES.indexOf(modeStore.mode)
  choose(MODES[(index + step + MODES.length) % MODES.length]!, true)
}
</script>
