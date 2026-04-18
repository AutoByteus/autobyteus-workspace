<template>
  <div class="flex h-screen h-[100dvh] flex-col">
    <header
      v-if="!isApplicationImmersive"
      class="z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 md:hidden"
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
        v-if="!isApplicationImmersive && appLayoutStore.isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-gray-900 bg-opacity-75 md:hidden"
        @click="appLayoutStore.closeMobileMenu()"
      ></div>

      <aside
        v-if="!isApplicationImmersive"
        class="absolute inset-y-0 left-0 z-50 h-full flex-shrink-0 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shadow"
        :class="[
          appLayoutStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          isLeftPanelVisible ? '' : 'md:hidden',
        ]"
        :style="leftPanelStyle"
      >
        <AppLeftPanel />
      </aside>

      <div
        v-if="!isApplicationImmersive && isLeftPanelVisible"
        class="left-panel-drag-handle hidden md:block"
        @mousedown="initDragLeftPanel"
      ></div>

      <div v-else-if="!isApplicationImmersive" class="hidden md:flex">
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
import { computed, watch } from 'vue'
import { useAppLayoutStore } from '~/stores/appLayoutStore'
import { useRoute } from 'vue-router'
import { useLeftPanel } from '~/composables/useLeftPanel'

const appLayoutStore = useAppLayoutStore()
const route = useRoute()
const { isLeftPanelVisible, leftPanelWidth, initDragLeftPanel } = useLeftPanel()

const isApplicationImmersive = computed(
  () => appLayoutStore.hostShellPresentation === 'application_immersive',
)

const leftPanelStyle = computed(() => (
  isLeftPanelVisible.value
    ? { width: `${leftPanelWidth.value}px` }
    : undefined
))

const mainContentClasses = computed(() => [
  'relative z-0 flex-1 overflow-hidden w-full',
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
