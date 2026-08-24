<template>
  <div
    :class="panelRootClasses"
    :style="panelRootStyle"
    data-testid="application-immersive-control-panel-root"
  >
    <button
      v-if="!isPanelOpen"
      type="button"
      class="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md shadow-slate-900/10 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      :aria-label="$t('applications.components.applications.ApplicationImmersiveControlPanel.openPanel')"
      data-testid="application-immersive-trigger"
      @click="openPanel"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.8"
      >
        <path d="M4 7h4"></path>
        <path d="M14 7h6"></path>
        <circle cx="11" cy="7" r="2"></circle>
        <path d="M4 12h9"></path>
        <path d="M19 12h1"></path>
        <circle cx="16" cy="12" r="2"></circle>
        <path d="M4 17h2"></path>
        <path d="M12 17h8"></path>
        <circle cx="9" cy="17" r="2"></circle>
      </svg>
    </button>

    <div
      v-show="isPanelOpen"
      class="flex h-full min-h-0"
      data-testid="application-immersive-panel-frame"
    >
      <div
        class="w-2 cursor-col-resize bg-slate-200/70 transition-colors hover:bg-blue-200"
        data-testid="application-immersive-resize-handle"
        @mousedown="initResizeDrag"
      ></div>

      <aside
        ref="panelRef"
        class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-slate-200 bg-white/95 text-slate-900 shadow-2xl shadow-slate-900/12 backdrop-blur-xl"
        :style="panelStyle"
        data-testid="application-immersive-control-panel"
      >
        <div class="border-b border-slate-200 bg-white/90 px-5 py-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.panelTitle') }}
              </p>
              <h2 class="mt-2 truncate text-lg font-semibold text-slate-900">{{ applicationName }}</h2>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.panelSubtitle') }}
              </p>
            </div>

            <button
              type="button"
              class="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              :aria-label="$t('applications.components.applications.ApplicationImmersiveControlPanel.closePanel')"
              data-testid="application-immersive-close"
              @click="closePanel"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              >
                <path d="M6 6l12 12"></path>
                <path d="M18 6L6 18"></path>
              </svg>
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col">
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section class="space-y-3">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                :aria-expanded="activeSection === 'details'"
                data-testid="application-immersive-details-toggle"
                @click="toggleSection('details')"
              >
                <span>{{ $t('applications.components.applications.ApplicationImmersiveControlPanel.details') }}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  class="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform"
                  :class="activeSection === 'details' ? 'rotate-180' : ''"
                >
                  <path d="M6 9l6 6l6-6"></path>
                </svg>
              </button>

              <div
                v-if="activeSection === 'details'"
                class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
                data-testid="application-immersive-details-section"
              >
                <slot name="details"></slot>
              </div>
            </section>

            <section class="space-y-3">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                :aria-expanded="activeSection === 'configure'"
                data-testid="application-immersive-configure-toggle"
                @click="toggleConfigureSection"
              >
                <span>{{ $t('applications.components.applications.ApplicationImmersiveControlPanel.configureSetup') }}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  class="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform"
                  :class="activeSection === 'configure' ? 'rotate-180' : ''"
                >
                  <path d="M6 9l6 6l6-6"></path>
                </svg>
              </button>

              <div
                v-if="hasMountedConfigureSection"
                v-show="activeSection === 'configure'"
                class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-4"
                data-testid="application-immersive-configure-section"
              >
                <slot name="configure"></slot>
              </div>
            </section>
          </div>

          <section
            class="space-y-3 border-t border-slate-200 bg-white/95 px-4 py-4"
            data-testid="application-immersive-actions"
          >
            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              :disabled="reloadDisabled"
              data-testid="application-immersive-reload"
              @click="emit('reload-application')"
            >
              {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.reloadApplication') }}
            </button>

            <p
              v-if="reloadStatusMessage"
              class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800"
              data-testid="application-immersive-reload-status"
            >
              {{ reloadStatusMessage }}
            </p>

            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              data-testid="application-immersive-exit"
              @click="emit('exit-application')"
            >
              {{ $t('applications.components.applications.ApplicationImmersiveControlPanel.exitApplication') }}
            </button>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'

type ImmersiveSection = 'details' | 'configure'

const MIN_PANEL_WIDTH = 420
const DEFAULT_PANEL_WIDTH = 560
const MAX_PANEL_WIDTH = 960
const MIN_REMAINING_CANVAS_WIDTH = 480
const RESIZE_HANDLE_WIDTH = 8

const props = withDefaults(defineProps<{
  applicationName: string
  reloadDisabled?: boolean
  reloadStatusMessage?: string | null
}>(), {
  reloadDisabled: false,
  reloadStatusMessage: null,
})

const emit = defineEmits<{
  (e: 'reload-application'): void
  (e: 'exit-application'): void
}>()

const { t: $t } = useLocalization()

const isPanelOpen = ref(false)
const activeSection = ref<ImmersiveSection | null>(null)
const panelWidth = ref(DEFAULT_PANEL_WIDTH)
const hasMountedConfigureSection = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(typeof window === 'undefined' ? DEFAULT_PANEL_WIDTH + MIN_REMAINING_CANVAS_WIDTH : window.innerWidth)

let activeResizeListeners: {
  move: (event: MouseEvent) => void
  up: () => void
} | null = null

const updateViewportWidth = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  viewportWidth.value = window.innerWidth
}

const readMaxPanelWidth = (): number => {
  if (typeof window === 'undefined') {
    return MAX_PANEL_WIDTH
  }

  return Math.max(
    MIN_PANEL_WIDTH,
    Math.min(MAX_PANEL_WIDTH, viewportWidth.value - MIN_REMAINING_CANVAS_WIDTH - RESIZE_HANDLE_WIDTH),
  )
}

const clampPanelWidth = (width: number): number => {
  return Math.min(Math.max(width, MIN_PANEL_WIDTH), readMaxPanelWidth())
}

const clampedPanelWidth = computed(() => clampPanelWidth(panelWidth.value))

const panelRootClasses = computed(() => (
  isPanelOpen.value
    ? 'order-last relative z-20 flex h-full min-h-0 min-w-0 flex-shrink-0'
    : 'pointer-events-none absolute right-5 top-5 z-20 md:right-6 md:top-6'
))

const panelRootStyle = computed(() => (
  isPanelOpen.value
    ? { width: `${clampedPanelWidth.value + RESIZE_HANDLE_WIDTH}px` }
    : undefined
))

const panelStyle = computed(() => ({
  width: `${clampedPanelWidth.value}px`,
}))

const closePanel = (): void => {
  isPanelOpen.value = false
}

const openPanel = (): void => {
  isPanelOpen.value = true
}

const toggleSection = (section: ImmersiveSection): void => {
  isPanelOpen.value = true
  activeSection.value = activeSection.value === section ? null : section
}

const toggleConfigureSection = (): void => {
  hasMountedConfigureSection.value = true
  toggleSection('configure')
}

const removeResizeListeners = (): void => {
  if (!activeResizeListeners) {
    return
  }

  document.removeEventListener('mousemove', activeResizeListeners.move)
  document.removeEventListener('mouseup', activeResizeListeners.up)
  document.body.style.cursor = ''
  activeResizeListeners = null
}

const initResizeDrag = (event: MouseEvent): void => {
  event.preventDefault()
  const panelRect = panelRef.value?.getBoundingClientRect()
  const panelRight = panelRect?.right ?? window.innerWidth
  const handleLeft = (panelRect?.left ?? panelRight) - RESIZE_HANDLE_WIDTH
  const dragOffsetFromHandleLeft = event.clientX - handleLeft

  const handleMouseMove = (moveEvent: MouseEvent): void => {
    panelWidth.value = clampPanelWidth(
      panelRight - moveEvent.clientX - RESIZE_HANDLE_WIDTH + dragOffsetFromHandleLeft,
    )
  }

  const handleMouseUp = (): void => {
    removeResizeListeners()
  }

  removeResizeListeners()
  activeResizeListeners = {
    move: handleMouseMove,
    up: handleMouseUp,
  }

  document.body.style.cursor = 'col-resize'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewportWidth)
  }
  removeResizeListeners()
})

onMounted(() => {
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth)
})
</script>
