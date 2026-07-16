<template>
  <div class="flex h-screen h-[100dvh] flex-col">
    <header
      v-if="!isApplicationImmersive && showResponsiveHeader"
      class="z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4"
    >
      <div class="flex items-center">
        <button
          class="-ml-1 p-1 text-gray-400 hover:text-white focus:outline-none"
          data-test="app-left-drawer-open"
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
        aria-hidden="true"
        @click="appLayoutStore.closeMobileMenu()"
      ></div>

      <aside
        v-if="showLeftPanelSurface"
        ref="leftDrawerRef"
        :role="showLeftDrawer ? 'dialog' : 'navigation'"
        :aria-modal="showLeftDrawer ? 'true' : undefined"
        :aria-labelledby="showLeftDrawer ? 'left-navigation-drawer-title' : undefined"
        :aria-label="!showLeftDrawer ? $t('shell.workspaceSurfaces.navigationDrawerTitle') : undefined"
        :tabindex="showLeftDrawer ? -1 : undefined"
        :data-test="showLeftDrawer ? 'app-left-navigation-drawer' : 'app-left-panel-shell'"
        :class="leftPanelClasses"
        :style="leftPanelStyle"
      >
        <div
          v-if="showLeftDrawer"
          class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2"
        >
          <h2 id="left-navigation-drawer-title" class="text-sm font-semibold text-gray-800">
            {{ $t('shell.workspaceSurfaces.navigationDrawerTitle') }}
          </h2>
          <button
            type="button"
            data-test="app-left-drawer-close"
            data-drawer-initial-focus
            class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            :aria-label="$t('shell.workspaceSurfaces.closeNavigation')"
            @click="appLayoutStore.closeMobileMenu()"
          >
            <span class="sr-only">{{ $t('shell.workspaceSurfaces.closeNavigation') }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AppLeftPanel />
        </div>
      </aside>

      <div
        v-if="showLeftPanelDragHandle"
        class="left-panel-drag-handle hidden md:block"
        @mousedown="initDragLeftPanel"
      ></div>

      <div v-else-if="showLeftStrip">
        <LeftSidebarStrip
          :strip-behavior="responsiveWorkspaceShellState.leftPanel.stripBehavior ?? 'overlay'"
          :strip-activation="responsiveWorkspaceShellState.leftPanel.stripActivation!"
          @request-redock="redockLeftPanel"
        />
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
import { computed, provide, ref, watch } from 'vue'
import { useAppLayoutStore } from '~/stores/appLayoutStore'
import { useRoute } from 'vue-router'
import { useLeftPanel } from '~/composables/useLeftPanel'
import { useAccessibleDrawer } from '~/composables/useAccessibleDrawer'
import {
  RESPONSIVE_WORKSPACE_SHELL_KEY,
  useResponsiveWorkspaceShell,
} from '~/composables/layout/useResponsiveWorkspaceShell'

const appLayoutStore = useAppLayoutStore()
const route = useRoute()
const { initDragLeftPanel, isLeftPanelVisible, setLeftPanelVisible } = useLeftPanel()
const leftDrawerRef = ref<HTMLElement | null>(null)
const { responsiveWorkspaceShellState } = useResponsiveWorkspaceShell()
provide(RESPONSIVE_WORKSPACE_SHELL_KEY, responsiveWorkspaceShellState)

// The standard workspace owns its navigation through the side panel/strip
// surfaces. Other routes retain the default layout's existing responsive
// header/navigation behavior. This is intentionally route-only; viewport
// policy remains exclusively owned by useResponsiveWorkspaceShell().
const isStandardWorkspaceRoute = computed(
  () => route.path === '/workspace' || route.path.startsWith('/workspace/'),
)
const showResponsiveHeader = computed(
  () => !isStandardWorkspaceRoute.value && responsiveWorkspaceShellState.value.showHeader,
)

const isApplicationImmersive = computed(
  () => appLayoutStore.hostShellPresentation === 'application_immersive',
)

const isLeftDocked = computed(() => responsiveWorkspaceShellState.value.leftPanel.presentation === 'docked')
const showLeftDrawer = computed(
  () => appLayoutStore.isMobileMenuOpen && (
    isStandardWorkspaceRoute.value
      ? responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'open-drawer'
      : true
  ),
)
const showLeftPanelSurface = computed(
  () => {
    if (isApplicationImmersive.value) {
      return false
    }

    return isStandardWorkspaceRoute.value
      ? isLeftDocked.value || showLeftDrawer.value
      : isLeftPanelVisible.value || showLeftDrawer.value
  },
)
const showLeftDrawerBackdrop = computed(
  () => !isApplicationImmersive.value && showLeftDrawer.value,
)
const showLeftStrip = computed(
  () => isStandardWorkspaceRoute.value
    && !isApplicationImmersive.value
    && responsiveWorkspaceShellState.value.showLeftStrip,
)
const showLeftPanelDragHandle = computed(
  () => !isApplicationImmersive.value && (
    isStandardWorkspaceRoute.value ? isLeftDocked.value : isLeftPanelVisible.value
  ),
)

useAccessibleDrawer({
  isOpen: computed(() => showLeftDrawer.value && !isApplicationImmersive.value),
  drawerRef: leftDrawerRef,
  onRequestClose: () => appLayoutStore.closeMobileMenu(),
})

const leftPanelStyle = computed(() => ({
  width: `${responsiveWorkspaceShellState.value.leftPanel.preferredWidth}px`,
}))

const redockLeftPanel = (): void => {
  setLeftPanelVisible(true)
  appLayoutStore.closeMobileMenu()
}

const leftPanelClasses = computed(() => [
  isStandardWorkspaceRoute.value
    ? 'inset-y-0 left-0 z-50 flex h-full flex-shrink-0 flex-col transform bg-white transition-transform duration-300 ease-in-out'
    : 'absolute inset-y-0 left-0 z-50 flex h-full flex-shrink-0 flex-col transform bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow',
  isStandardWorkspaceRoute.value
    ? isLeftDocked.value
      ? 'static translate-x-0 shadow'
      : 'fixed shadow-2xl'
    : '',
  isStandardWorkspaceRoute.value
    ? showLeftDrawer.value || isLeftDocked.value ? 'translate-x-0' : '-translate-x-full'
    : appLayoutStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
  !isStandardWorkspaceRoute.value && !isLeftPanelVisible.value ? 'md:hidden' : '',
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
  () => [isStandardWorkspaceRoute.value, responsiveWorkspaceShellState.value.leftPanel.stripActivation] as const,
  ([isWorkspaceRoute, stripActivation]) => {
    if (isWorkspaceRoute && stripActivation !== 'open-drawer') {
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
