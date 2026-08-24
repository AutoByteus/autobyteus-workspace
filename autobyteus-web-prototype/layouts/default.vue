<template>
  <div class="isolate flex h-screen h-[100dvh] flex-col">
    <div class="relative flex flex-1 flex-row overflow-hidden">
      <div
        v-if="showLeftDrawerBackdrop"
        data-test="app-left-drawer-backdrop"
        class="fixed inset-0 z-40 bg-black/30"
        :style="leftDrawerBackdropStyle"
        aria-hidden="true"
        @click="appLayoutStore.closeMobileMenu()"
      ></div>

      <aside
        v-if="showLeftPanelSurface"
        ref="leftDrawerRef"
        :role="showLeftDrawer ? 'dialog' : 'navigation'"
        :aria-modal="showLeftDrawer && leftDrawerIsTopmost ? 'true' : undefined"
        :aria-label="$t('shell.workspaceSurfaces.navigationDrawerTitle')"
        :tabindex="showLeftDrawer ? -1 : undefined"
        :data-test="showLeftDrawer ? 'app-left-navigation-drawer' : 'app-left-panel-shell'"
        :class="leftPanelClasses"
        :style="leftPanelStyle"
      >
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
          :strip-behavior="responsiveWorkspaceShellState.leftPanel.stripBehavior ?? 'consuming'"
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
const { initDragLeftPanel, setLeftPanelVisible } = useLeftPanel()
const leftDrawerRef = ref<HTMLElement | null>(null)
const { responsiveWorkspaceShellState } = useResponsiveWorkspaceShell()
provide(RESPONSIVE_WORKSPACE_SHELL_KEY, responsiveWorkspaceShellState)

const isApplicationImmersive = computed(
  () => appLayoutStore.hostShellPresentation === 'application_immersive',
)

const isLeftDocked = computed(() => responsiveWorkspaceShellState.value.leftPanel.presentation === 'docked')
const showLeftDrawer = computed(
  () => appLayoutStore.isMobileMenuOpen
    && responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'open-drawer',
)
const showLeftPanelSurface = computed(
  () => !isApplicationImmersive.value && (isLeftDocked.value || showLeftDrawer.value),
)
const showLeftDrawerBackdrop = computed(
  () => !isApplicationImmersive.value && showLeftDrawer.value,
)
const leftDrawerBackdropStyle = computed(() => ({
  zIndex: leftDrawerBackdropZIndex.value,
  // The workspace right strip is a normal 50px flow item, not an overlay.
  // Keep that opposite-side opener outside this backdrop's hit-test region
  // while the left drawer is open.
  ...(route.path === '/workspace' && responsiveWorkspaceShellState.value.showRightStrip
    ? { right: `${responsiveWorkspaceShellState.value.rightPanel.consumedWidth}px` }
    : {}),
}))
const showLeftStrip = computed(
  () => !isApplicationImmersive.value
    && !showLeftDrawer.value
    && responsiveWorkspaceShellState.value.showLeftStrip,
)
const showLeftPanelDragHandle = computed(
  () => !isApplicationImmersive.value && isLeftDocked.value,
)

const getLeftStripFocusTarget = (origin?: HTMLElement | null): HTMLElement | null => {
  const navKey = origin?.dataset.navKey
  if (!navKey) {
    return null
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-test="workspace-left-navigation-strip"] button'))
  return buttons.find((button) => button.dataset.navKey === navKey) ?? null
}

const { drawerLayer: leftDrawerLayer } = useAccessibleDrawer({
  isOpen: computed(() => showLeftDrawer.value && !isApplicationImmersive.value),
  drawerRef: leftDrawerRef,
  onRequestClose: () => appLayoutStore.closeMobileMenu(),
  returnFocusTarget: getLeftStripFocusTarget,
})
const leftDrawerBackdropZIndex = leftDrawerLayer.backdropZIndex
const leftDrawerZIndex = leftDrawerLayer.drawerZIndex
const leftDrawerIsTopmost = leftDrawerLayer.isTopmost

const leftPanelStyle = computed(() => ({
  width: `${responsiveWorkspaceShellState.value.leftPanel.preferredWidth}px`,
  ...(showLeftDrawer.value ? { zIndex: leftDrawerZIndex.value } : {}),
}))

const redockLeftPanel = (): void => {
  setLeftPanelVisible(true)
  appLayoutStore.closeMobileMenu()
}

const leftPanelClasses = computed(() => [
  'inset-y-0 left-0 z-50 flex h-full flex-shrink-0 flex-col transform bg-white transition-transform duration-300 ease-in-out',
  isLeftDocked.value ? 'static translate-x-0 shadow' : 'fixed shadow-2xl',
  showLeftDrawer.value || isLeftDocked.value ? 'translate-x-0' : '-translate-x-full',
])

const mainContentClasses = computed(() => [
  // Keep the main content shrink-safe; only transient drawers/backdrops use
  // the root overlay layer while closed strips remain normal flow items.
  'relative flex-1 min-w-0 overflow-hidden w-full',
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
  () => responsiveWorkspaceShellState.value.leftPanel.stripActivation,
  (stripActivation) => {
    if (stripActivation !== 'open-drawer') {
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
