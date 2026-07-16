<template>
  <div class="flex h-screen h-[100dvh] flex-col">
    <header
      v-if="!isApplicationImmersive && responsiveWorkspaceShellState.showHeader"
      class="z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4"
    >
      <div class="flex items-center">
        <button
          class="-ml-1 p-1 text-gray-400 hover:text-white focus:outline-none"
          @click="appLayoutStore.toggleMobileMenu()"
        >
          <span class="sr-only">{{ $t('shell.layouts.default.open_menu') }}</span>
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="ml-3 flex-shrink-0 font-semibold text-white">AutoByteus</span>
      </div>
    </header>

    <div class="relative flex flex-1 flex-row overflow-hidden">
      <div
        v-if="showLeftDrawerBackdrop"
        class="fixed inset-0 z-40 bg-gray-900 bg-opacity-75"
        @click="appLayoutStore.closeMobileMenu()"
      ></div>

      <aside
        v-if="showLeftPanelSurface"
        :class="leftPanelClasses"
        :style="leftPanelStyle"
      >
        <AppLeftPanel />
      </aside>

      <div
        v-if="showLeftPanelDragHandle"
        class="left-panel-drag-handle hidden md:block"
        @mousedown="initDragLeftPanel"
      ></div>

      <div v-else-if="showLeftStrip" class="hidden md:flex">
        <LeftSidebarStrip />
      </div>

      <main :class="mainContentClasses">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppLeftPanel from '@/components/AppLeftPanel.vue'
import LeftSidebarStrip from '~/components/layout/LeftSidebarStrip.vue'
import { computed, provide, watch } from 'vue'
import { useAppLayoutStore } from '~/stores/appLayoutStore'
import { useRoute } from 'vue-router'
import { useLeftPanel } from '~/composables/useLeftPanel'
import {
  RESPONSIVE_WORKSPACE_SHELL_KEY,
  useResponsiveWorkspaceShell,
} from '~/composables/layout/useResponsiveWorkspaceShell'

const appLayoutStore = useAppLayoutStore()
const route = useRoute()
const { initDragLeftPanel } = useLeftPanel()
const { responsiveWorkspaceShellState } = useResponsiveWorkspaceShell()
provide(RESPONSIVE_WORKSPACE_SHELL_KEY, responsiveWorkspaceShellState)

const isApplicationImmersive = computed(
  () => appLayoutStore.hostShellPresentation === 'application_immersive',
)

const isLeftDocked = computed(() => responsiveWorkspaceShellState.value.leftPanel.presentation === 'docked')
const showLeftDrawer = computed(
  () => responsiveWorkspaceShellState.value.canOpenLeftDrawer && appLayoutStore.isMobileMenuOpen,
)
const showLeftPanelSurface = computed(
  () => !isApplicationImmersive.value && (isLeftDocked.value || showLeftDrawer.value),
)
const showLeftDrawerBackdrop = computed(
  () => !isApplicationImmersive.value && showLeftDrawer.value,
)
const showLeftStrip = computed(
  () => !isApplicationImmersive.value && responsiveWorkspaceShellState.value.showLeftStrip,
)
const showLeftPanelDragHandle = computed(
  () => !isApplicationImmersive.value && isLeftDocked.value,
)

const leftPanelStyle = computed(() => ({
  width: `${responsiveWorkspaceShellState.value.leftPanel.preferredWidth}px`,
}))

const leftPanelClasses = computed(() => [
  'inset-y-0 left-0 z-50 h-full flex-shrink-0 transform bg-white transition-transform duration-300 ease-in-out',
  isLeftDocked.value
    ? 'static translate-x-0 shadow'
    : 'fixed shadow-2xl',
  showLeftDrawer.value || isLeftDocked.value ? 'translate-x-0' : '-translate-x-full',
])

const mainContentClasses = computed(() => [
  'relative z-0 flex-1 min-w-0 overflow-hidden w-full',
  isApplicationImmersive.value ? 'bg-slate-950' : 'bg-blue-50',
])

watch(
  () => route.fullPath,
  () => {
    appLayoutStore.closeMobileMenu()
  },
)

watch(
  isApplicationImmersive,
  (immersive) => {
    if (immersive) {
      appLayoutStore.closeMobileMenu()
    }
  },
  { immediate: true },
)

watch(
  () => responsiveWorkspaceShellState.value.canOpenLeftDrawer,
  (canOpenDrawer) => {
    if (!canOpenDrawer) {
      appLayoutStore.closeMobileMenu()
    }
  },
  { immediate: true },
)
</script>

<style>
html, body, #__nuxt {
  height: 100%;
}

.left-panel-drag-handle {
  width: 6px;
  background-color: #d1d5db;
  cursor: col-resize;
  transition: background-color 0.2s ease;
  position: relative;
  z-index: 10;
  margin-left: -3px;
}

.left-panel-drag-handle:hover {
  background-color: #9ca3af;
}

.left-panel-drag-handle:active {
  background-color: #6b7280;
}
</style>
