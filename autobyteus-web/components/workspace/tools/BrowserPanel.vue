<template>
  <Teleport to="body" :disabled="!isZenMode">
    <div
      class="flex min-h-0 flex-col bg-white"
      :class="isZenMode ? 'fixed inset-0 z-[120] min-h-screen shadow-md' : 'h-full'"
    >
      <div class="border-b border-gray-200 px-2" :class="isZenMode ? 'py-1.5' : 'py-2'">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            <div
              v-for="session in sessions"
              :key="session.tab_id"
              class="group flex max-w-[240px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
              :class="session.tab_id === activeTabId
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'"
              @click="handleSessionSelect(session.tab_id)"
            >
              <span class="truncate">{{ session.title || session.url }}</span>
              <span
                class="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-xs text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                @click.stop="handleSessionClose(session.tab_id)"
              >
                ×
              </span>
            </div>
          </div>

          <button
            class="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            :title="isZenMode ? 'Restore Browser view' : 'Maximize Browser view'"
            :class="isZenMode ? 'order-3' : 'order-2'"
            type="button"
            @click="toggleZenMode"
          >
            <Icon
              :icon="isZenMode ? 'heroicons:arrows-pointing-in' : 'heroicons:arrows-pointing-out'"
              class="h-4 w-4"
            />
          </button>

          <form
            class="flex min-w-0 items-center gap-2"
            :class="isZenMode
              ? 'order-2 flex-1'
              : 'order-3 basis-full border-t border-gray-200 pt-2'"
            @submit.prevent="handleAddressSubmit"
          >
          <button
            class="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
            type="button"
            :title="$t('workspace.components.workspace.tools.BrowserPanel.open_new_tab')"
            @click="handleOpenTab"
          >
            <Icon icon="heroicons:plus" class="h-4 w-4" />
          </button>

          <input
            v-model="addressValue"
            class="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-800 outline-none transition-colors focus:border-blue-400"
            type="text"
            :placeholder="$t('workspace.components.workspace.tools.BrowserPanel.enter_url_and_press_enter')"
            @keydown.enter.prevent="handleAddressSubmit"
          >

          <button
            class="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :title="$t('workspace.components.workspace.tools.BrowserPanel.refresh_active_tab')"
            :disabled="!activeTabId"
            @click="handleRefresh"
          >
            <Icon icon="heroicons:arrow-path" class="h-4 w-4" />
          </button>

          <button
            class="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :title="$t('workspace.components.workspace.tools.BrowserPanel.close_active_tab')"
            :disabled="!activeTabId"
            @click="handleCloseActive"
          >
            <Icon icon="heroicons:x-mark" class="h-4 w-4" />
          </button>
          </form>
        </div>
      </div>

      <div v-if="lastError" class="border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ lastError }}
      </div>

      <div class="relative flex-1 min-h-0 overflow-hidden bg-slate-50">
        <div ref="hostRef" class="absolute inset-0" />

        <div
          v-if="!browserAvailable"
          class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500"
        >{{ $t('workspace.components.workspace.tools.BrowserPanel.browser_is_only_available_in_the') }}</div>

        <div
          v-else-if="sessions.length === 0"
          class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500"
        >{{ $t('workspace.components.workspace.tools.BrowserPanel.open_a_url_to_start_browsing') }}</div>

        <div
          v-else-if="!activeTabId"
          class="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-500"
        >{{ $t('workspace.components.workspace.tools.BrowserPanel.select_a_browser_tab_to_attach') }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { nextTick, onBeforeUnmount, onMounted, ref, Teleport, watch } from 'vue'
import type { BrowserHostBounds } from '~/types/browserShell'
import { useBrowserShellStore } from '~/stores/browserShellStore'
import { useBrowserDisplayModeStore } from '~/stores/browserDisplayMode'
import { useRightPanel } from '~/composables/useRightPanel'

const browserShellStore = useBrowserShellStore()
const browserDisplayModeStore = useBrowserDisplayModeStore()
const { isRightPanelVisible, rightPanelWidth } = useRightPanel()
const { browserAvailable, sessions, activeTabId, activeSession, lastError } =
  storeToRefs(browserShellStore)
const { isZenMode } = storeToRefs(browserDisplayModeStore)

const hostRef = ref<HTMLElement | null>(null)
const addressValue = ref('')
let resizeObserver: ResizeObserver | null = null
let lastSentBoundsKey: string | null = null

const normalizeAddressInput = (value: string): string => {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return ''
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedValue)) {
    return trimmedValue
  }

  return `https://${trimmedValue}`
}

const normalizeHostBounds = (): BrowserHostBounds | null => {
  if (!hostRef.value || (!isRightPanelVisible.value && !isZenMode.value)) {
    return null
  }

  const rect = hostRef.value.getBoundingClientRect()
  const width = Math.max(0, Math.round(rect.width))
  const height = Math.max(0, Math.round(rect.height))
  if (width === 0 || height === 0) {
    return null
  }

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width,
    height,
  }
}

const serializeBounds = (bounds: BrowserHostBounds | null): string => {
  if (!bounds) {
    return 'null'
  }

  return `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`
}

const syncHostBounds = async (): Promise<void> => {
  await browserShellStore.initialize()
  const nextBounds = normalizeHostBounds()
  const nextBoundsKey = serializeBounds(nextBounds)
  if (nextBoundsKey === lastSentBoundsKey) {
    return
  }

  lastSentBoundsKey = nextBoundsKey
  try {
    await browserShellStore.updateHostBounds(nextBounds)
  } catch (error) {
    lastSentBoundsKey = null
    throw error
  }
}

const syncAddressValue = (): void => {
  addressValue.value = activeSession.value?.url ?? ''
}

const handleSessionSelect = async (browserSessionId: string): Promise<void> => {
  await browserShellStore.setActiveSession(browserSessionId)
  await nextTick()
  await syncHostBounds()
}

const handleSessionClose = async (browserSessionId: string): Promise<void> => {
  await browserShellStore.closeSession(browserSessionId)
  await nextTick()
  await syncHostBounds()
}

const handleOpenTab = async (): Promise<void> => {
  const normalizedAddress = normalizeAddressInput(addressValue.value)
  if (!normalizedAddress) {
    return
  }

  addressValue.value = normalizedAddress
  await browserShellStore.openTab({
    url: normalizedAddress,
    waitUntil: 'load',
  })
  await nextTick()
  syncAddressValue()
  await syncHostBounds()
}

const handleAddressSubmit = async (): Promise<void> => {
  const normalizedAddress = normalizeAddressInput(addressValue.value)
  if (!normalizedAddress) {
    return
  }

  addressValue.value = normalizedAddress

  if (!activeTabId.value) {
    await handleOpenTab()
    return
  }

  await browserShellStore.navigateTab({
    tabId: activeTabId.value,
    url: normalizedAddress,
    waitUntil: 'load',
  })
  await nextTick()
  syncAddressValue()
  await syncHostBounds()
}

const handleRefresh = async (): Promise<void> => {
  if (!activeTabId.value) {
    return
  }

  await browserShellStore.reloadTab({
    tabId: activeTabId.value,
    waitUntil: 'load',
  })
  await nextTick()
  syncAddressValue()
  await syncHostBounds()
}

const handleCloseActive = async (): Promise<void> => {
  if (!activeTabId.value) {
    return
  }

  await browserShellStore.closeSession(activeTabId.value)
  await nextTick()
  syncAddressValue()
  await syncHostBounds()
}

const toggleZenMode = async (): Promise<void> => {
  browserDisplayModeStore.toggleZenMode()
  await nextTick()
  await syncHostBounds()
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && isZenMode.value) {
    browserDisplayModeStore.exitZenMode()
    void nextTick().then(syncHostBounds)
  }
}

onMounted(async () => {
  await browserShellStore.initialize()
  syncAddressValue()
  await nextTick()

  if (typeof ResizeObserver !== 'undefined' && hostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      void syncHostBounds()
    })
    resizeObserver.observe(hostRef.value)
  }

  window.addEventListener('resize', syncHostBounds)
  window.addEventListener('keydown', handleKeydown)
  await syncHostBounds()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', syncHostBounds)
  window.removeEventListener('keydown', handleKeydown)
  lastSentBoundsKey = null
  browserDisplayModeStore.exitZenMode()
  void browserShellStore.updateHostBounds(null)
})

watch(activeSession, () => {
  syncAddressValue()
})

watch(
  () => [
    isRightPanelVisible.value,
    rightPanelWidth.value,
    activeTabId.value,
    sessions.value.length,
    isZenMode.value,
  ],
  async () => {
    await nextTick()
    await syncHostBounds()
  },
)
</script>
