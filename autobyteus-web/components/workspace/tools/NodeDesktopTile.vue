<template>
  <Teleport to="body" :disabled="!isMaximized">
    <div class="vnc-tile flex flex-col" :class="{ 'vnc-maximized': isMaximized }" data-testid="node-desktop-tile">
      <div
        class="connection-status py-2 px-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center"
        :class="{
          'connection-status-overlay': isMaximized,
          'connection-status-hidden': isMaximized && !toolbarVisible,
        }"
        @mouseenter="handleToolbarMouseEnter"
        @mouseleave="handleToolbarMouseLeave"
      >
        <div class="flex items-center min-w-0">
          <div
            class="status-indicator w-3 h-3 rounded-full mr-2"
            :class="{ 'bg-red-500': !isConnected && !isConnecting, 'bg-yellow-500': isConnecting, 'bg-green-500': isConnected }"
          ></div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">{{ $t('workspace.components.workspace.tools.NodeDesktopTile.title') }}</div>
            <div class="text-[0.6875rem] text-gray-500 truncate" data-testid="node-desktop-status">
              {{ statusText }}
            </div>
          </div>
        </div>
        <div class="controls flex items-center space-x-2">
          <button
            v-if="offer"
            data-testid="node-desktop-connect"
            @click="openViewOnly"
            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {{ $t(`workspace.components.workspace.tools.NodeDesktopTile.${offer}`) }}
          </button>
          <button
            v-if="isConnected"
            data-testid="node-desktop-disconnect"
            @click="stop"
            class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {{ $t('workspace.components.workspace.tools.NodeDesktopTile.disconnect') }}
          </button>
          <button
            @click="toggleMaximize"
            class="px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            :disabled="!isConnected"
            :title="isMaximized
              ? $t('workspace.components.workspace.tools.NodeDesktopTile.restore_view')
              : $t('workspace.components.workspace.tools.NodeDesktopTile.maximize_view')"
          >
            <Icon v-if="isMaximized" icon="heroicons:arrows-pointing-in" class="w-4 h-4" />
            <Icon v-else icon="heroicons:arrows-pointing-out" class="w-4 h-4" />
          </button>
          <button
            v-if="isConnected"
            data-testid="node-desktop-mode"
            @click="handleModeClick"
            class="px-2 py-1 text-xs rounded transition-colors"
            :class="mode === 'view' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'"
            :title="mode === 'view'
              ? $t('workspace.components.workspace.tools.NodeDesktopTile.switch_to_control')
              : $t('workspace.components.workspace.tools.NodeDesktopTile.switch_to_view_only')"
          >
            {{ mode === 'view'
              ? $t('workspace.components.workspace.tools.NodeDesktopTile.view_only')
              : $t('workspace.components.workspace.tools.NodeDesktopTile.control') }}
          </button>
        </div>
      </div>
      <div class="vnc-screen flex-grow relative" :class="{ 'vnc-screen-maximized': isMaximized }">
        <div
          v-if="isMaximized && !toolbarVisible"
          class="toolbar-reveal-zone"
          @mouseenter="handleRevealZoneEnter"
        ></div>
        <div ref="screen" class="vnc-display"></div>
        <div
          v-if="isConnecting"
          class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10"
        >
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-gray-700">{{ $t('workspace.components.workspace.tools.NodeDesktopTile.connecting') }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useLocalization } from '~/composables/useLocalization';
import { useNodeDesktopConnection } from '~/composables/useNodeDesktopConnection';
import { useVncSession } from '~/composables/useVncSession';

const { t } = useLocalization();
const session = useVncSession();
const { isConnected, isConnecting, mode, streamEnd, refreshViewport } = session;

const screen = ref<HTMLElement | null>(null);
const { offer, openViewOnly, stop, switchMode } = useNodeDesktopConnection(session, screen);
const isMaximized = ref(false);
const toolbarVisible = ref(true);
let revealToolbarTimer: ReturnType<typeof setTimeout> | null = null;
let hideToolbarTimer: ReturnType<typeof setTimeout> | null = null;
const REVEAL_DELAY_MS = 150;
const HIDE_DELAY_MS = 1000;

const statusText = computed(() => {
  if (isConnected.value) {
    return mode.value === 'view'
      ? t('workspace.components.workspace.tools.NodeDesktopTile.connected_view_only')
      : t('workspace.components.workspace.tools.NodeDesktopTile.connected_control');
  }
  if (isConnecting.value) return t('workspace.components.workspace.tools.NodeDesktopTile.connecting');
  if (streamEnd.value) return t(streamEnd.value.messageKey);
  return t('workspace.components.workspace.tools.NodeDesktopTile.disconnected');
});

const clearToolbarTimers = () => {
  if (revealToolbarTimer) clearTimeout(revealToolbarTimer);
  if (hideToolbarTimer) clearTimeout(hideToolbarTimer);
  revealToolbarTimer = null;
  hideToolbarTimer = null;
};

const handleRevealZoneEnter = () => {
  if (!isMaximized.value) return;
  clearToolbarTimers();
  revealToolbarTimer = setTimeout(() => {
    toolbarVisible.value = true;
    revealToolbarTimer = null;
  }, REVEAL_DELAY_MS);
};

const handleToolbarMouseEnter = () => {
  if (!isMaximized.value || !hideToolbarTimer) return;
  clearTimeout(hideToolbarTimer);
  hideToolbarTimer = null;
};

const handleToolbarMouseLeave = () => {
  if (!isMaximized.value) return;
  clearToolbarTimers();
  hideToolbarTimer = setTimeout(() => {
    toolbarVisible.value = false;
    hideToolbarTimer = null;
  }, HIDE_DELAY_MS);
};

const handleModeClick = () => {
  switchMode(mode.value === 'view' ? 'control' : 'view');
};

const setMaximized = (maximized: boolean) => {
  isMaximized.value = maximized;
  clearToolbarTimers();
  toolbarVisible.value = !maximized;
  void nextTick(refreshViewport);
};

const toggleMaximize = () => setMaximized(!isMaximized.value);

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isMaximized.value) {
    setMaximized(false);
    toolbarVisible.value = true;
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  clearToolbarTimers();
});
</script>

<style scoped>
.vnc-tile {
  background-color: #1e1e1e;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 220px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.vnc-maximized {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 5000;
  border-radius: 0;
}

.vnc-screen {
  background-color: #1e1e1e;
  position: relative;
  flex: 0 0 auto;
  aspect-ratio: 16 / 9;
  min-height: 200px;
  overflow: hidden;
}

.vnc-screen-maximized {
  flex: 1 1 auto;
  aspect-ratio: auto;
  min-height: 0;
}

.vnc-display {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

:deep(.vnc-display canvas) {
  max-width: 100%;
  object-fit: contain;
  margin-top: 0;
}

.status-indicator {
  box-shadow: 0 0 4px currentColor;
}

.connection-status {
  transition: transform 0.15s ease;
}

.connection-status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
}

.connection-status-hidden {
  transform: translateY(-100%);
}

.toolbar-reveal-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  z-index: 30;
}
</style>
