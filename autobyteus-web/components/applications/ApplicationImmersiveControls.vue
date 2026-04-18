<template>
  <div class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    <div
      ref="menuRoot"
      class="absolute inset-0"
      @keydown.esc.stop.prevent="closeSheet"
    >
      <div
        v-if="!actionsOpen"
        class="pointer-events-auto absolute right-4 top-4 sm:right-5 sm:top-5"
      >
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          data-testid="application-immersive-menu-toggle"
          :aria-expanded="actionsOpen ? 'true' : 'false'"
          aria-controls="application-immersive-controls-sheet"
          aria-haspopup="dialog"
          :aria-label="$t('applications.components.applications.ApplicationImmersiveControls.openPanel')"
          :title="$t('applications.components.applications.ApplicationImmersiveControls.openPanel')"
          @click="openSheet"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            class="h-5 w-5"
          >
            <path d="M4 5h12" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
            <path d="M4 10h12" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
            <path d="M4 15h12" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
            <circle cx="7" cy="5" r="1.6" fill="currentColor" />
            <circle cx="13" cy="10" r="1.6" fill="currentColor" />
            <circle cx="9" cy="15" r="1.6" fill="currentColor" />
          </svg>
        </button>
      </div>

      <aside
        v-if="actionsOpen"
        id="application-immersive-controls-sheet"
        class="pointer-events-auto absolute inset-y-0 right-0 flex w-80 max-w-full flex-col border-l border-slate-200 bg-white/95 text-slate-900 shadow-[-18px_0_48px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5 backdrop-blur-md"
        data-testid="application-immersive-controls-sheet"
        aria-hidden="false"
      >
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {{ $t('applications.components.applications.ApplicationImmersiveControls.panelTitle') }}
            </p>
          </div>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            data-testid="application-immersive-controls-close"
            :aria-label="$t('applications.components.applications.ApplicationImmersiveControls.closePanel')"
            :title="$t('applications.components.applications.ApplicationImmersiveControls.closePanel')"
            @click="closeSheet"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              class="h-5 w-5"
            >
              <path d="M5 5l10 10" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              <path d="M15 5L5 15" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            </svg>
          </button>
        </div>

        <div class="border-b border-slate-200 px-4 py-4">
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {{ $t('applications.shared.sessionActive') }}
              </p>
            </div>
            <p
              v-if="applicationName"
              class="mt-2 truncate text-sm font-medium text-slate-700"
            >
              {{ applicationName }}
            </p>
          </div>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100"
            data-testid="application-immersive-exit"
            @click="emitAction('exit-immersive')"
          >
            <span class="text-sm font-medium text-slate-800">
              {{ $t('applications.components.applications.ApplicationImmersiveControls.exitImmersive') }}
            </span>
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100"
            data-testid="application-immersive-execution"
            @click="emitAction('switch-execution')"
          >
            <span class="text-sm font-medium text-slate-800">
              {{ $t('applications.components.applications.ApplicationShell.tabExecution') }}
            </span>
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100"
            data-testid="application-immersive-details"
            @click="emitAction('toggle-details')"
          >
            <span class="text-sm font-medium text-slate-800">
              {{ detailsOpen
                ? $t('applications.components.applications.ApplicationShell.hideDetails')
                : $t('applications.components.applications.ApplicationShell.showDetails') }}
            </span>
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100"
            data-testid="application-immersive-relaunch"
            @click="emitAction('relaunch')"
          >
            <span class="text-sm font-medium text-slate-800">
              {{ $t('applications.components.applications.ApplicationShell.launchAgain') }}
            </span>
          </button>
        </div>

        <div class="border-t border-slate-200 px-3 py-3">
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition-colors hover:bg-red-50"
            data-testid="application-immersive-stop-session"
            @click="emitAction('stop-session')"
          >
            <span class="text-sm font-medium text-red-600">
              {{ $t('applications.components.applications.ApplicationShell.stopSession') }}
            </span>
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'

defineProps<{
  applicationName: string
  detailsOpen: boolean
}>()

const emit = defineEmits<{
  (event: 'exit-immersive'): void
  (event: 'switch-execution'): void
  (event: 'toggle-details'): void
  (event: 'relaunch'): void
  (event: 'stop-session'): void
  (event: 'sheet-open-change', open: boolean): void
}>()

const { t: $t } = useLocalization()
const actionsOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

const openSheet = (): void => {
  actionsOpen.value = true
}

const closeSheet = (): void => {
  actionsOpen.value = false
}

const handleDocumentMouseDown = (event: MouseEvent): void => {
  if (!actionsOpen.value) {
    return
  }

  const root = menuRoot.value
  const target = event.target
  if (!root || !(target instanceof Node) || root.contains(target)) {
    return
  }

  closeSheet()
}

const emitAction = (
  event: 'exit-immersive' | 'switch-execution' | 'toggle-details' | 'relaunch' | 'stop-session',
): void => {
  closeSheet()

  if (event === 'exit-immersive') {
    emit('exit-immersive')
    return
  }

  if (event === 'switch-execution') {
    emit('switch-execution')
    return
  }

  if (event === 'toggle-details') {
    emit('toggle-details')
    return
  }

  if (event === 'relaunch') {
    emit('relaunch')
    return
  }

  emit('stop-session')
}

watch(
  actionsOpen,
  (open) => {
    emit('sheet-open-change', open)
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentMouseDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
})
</script>
