<template>
  <div class="flex flex-col h-screen h-[100dvh]">
    <!-- Mobile Header -->
    <header class="md:hidden flex-shrink-0 h-14 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between z-30">
      <div class="flex items-center">
        <button 
          @click="appLayoutStore.toggleMobileMenu()"
          class="text-gray-400 hover:text-white focus:outline-none p-1 -ml-1"
        >
          <span class="sr-only">Open menu</span>
          <!-- Hamburger Icon -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="ml-3 text-white font-semibold flex-shrink-0">AutoByteus</span>
      </div>
    </header>

    <!-- Main Workspace Area -->
    <div class="flex-1 flex flex-row overflow-hidden relative">
      
      <!-- Mobile Sidebar Overlay -->
      <div 
        v-if="appLayoutStore.isMobileMenuOpen"
        class="fixed inset-0 z-40 bg-gray-900 bg-opacity-75 md:hidden"
        @click="appLayoutStore.closeMobileMenu()"
      ></div>

      <!-- Left Panel Wrapper -->
      <aside 
        class="flex-shrink-0 absolute inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 h-full md:shadow"
        :class="[
          appLayoutStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          isLeftPanelVisible ? '' : 'md:hidden',
        ]"
        :style="leftPanelStyle"
      >
        <AppLeftPanel />
      </aside>

      <div
        v-if="isLeftPanelVisible"
        class="hidden md:block left-panel-drag-handle"
        @mousedown="initDragLeftPanel"
      ></div>

      <div v-else class="hidden md:flex">
        <LeftSidebarStrip />
      </div>
      
      <!-- Main Content -->
      <main class="flex-1 bg-blue-50 overflow-hidden relative z-0 w-full">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppLeftPanel from '@/components/AppLeftPanel.vue';
import LeftSidebarStrip from '~/components/layout/LeftSidebarStrip.vue';
import { computed, watch } from 'vue';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useRoute } from 'vue-router';
import { useLeftPanel } from '~/composables/useLeftPanel';

const appLayoutStore = useAppLayoutStore();
const route = useRoute();
const { isLeftPanelVisible, leftPanelWidth, initDragLeftPanel } = useLeftPanel();
const leftPanelStyle = computed(() => (
  isLeftPanelVisible.value
    ? { width: `${leftPanelWidth.value}px` }
    : undefined
));

// Close sidebar on route change
watch(
  () => route.fullPath, 
  () => {
    appLayoutStore.closeMobileMenu();
  }
);
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
