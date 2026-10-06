<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-transform duration-200 ease-out motion-reduce:transition-none"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-150 ease-in motion-reduce:transition-none"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="false"
        :aria-label="$t('runSettings.chat.panelTitle')"
        class="fixed inset-y-0 right-0 z-40 flex max-w-full flex-col border-l border-gray-200 bg-white shadow-[-8px_0_24px_-12px_rgba(15,23,42,0.18)]"
        :style="{ width: `${width}px` }"
        data-test="run-member-settings-drawer"
      >
        <!-- Drag the left edge (or use ←/→) to resize; double-click restores the width. -->
        <div
          role="separator"
          aria-orientation="vertical"
          tabindex="0"
          :aria-label="$t('runSettings.chat.resizeAria')"
          :aria-valuenow="width"
          :aria-valuemin="MIN_WIDTH"
          :aria-valuemax="maxWidth()"
          class="group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center focus:outline-none max-sm:hidden"
          data-test="run-member-settings-resize"
          @pointerdown="startResize"
          @dblclick="setWidth(DEFAULT_WIDTH, true)"
          @keydown.left.prevent="setWidth(width + RESIZE_STEP, true)"
          @keydown.right.prevent="setWidth(width - RESIZE_STEP, true)"
        >
          <span
            class="h-full w-0.5 transition-colors duration-100"
            :class="resizing ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-400 group-focus-visible:bg-blue-500'"
            aria-hidden="true"
          ></span>
        </div>
        <header class="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
          <span class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden="true">
            <Icon :icon="subjectKind === 'org' ? 'heroicons:building-office-2' : 'heroicons:user-group'" class="h-[1.125rem] w-[1.125rem]" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[0.9375rem] font-semibold leading-5 text-gray-900">{{ $t('runSettings.chat.panelTitle') }}</h2>
            <p class="mt-0.5 truncate text-xs text-gray-500">{{ subjectName }}</p>
          </div>
          <button
            ref="closeRef"
            type="button"
            class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            :aria-label="$t('runSettings.chat.close')"
            data-test="run-member-settings-close"
            @click="emit('close')"
          >
            <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <!-- Members only: the shared settings are the message box or the Org card beside the drawer. -->
        <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-2">
          <RunMembersSection
            :nodes="nodes"
            :locked="locked"
            @change="(key, change) => emit('change', key, change)"
            @reset="(key, reset) => emit('reset', key, reset)"
            @reset-all="emit('reset-all')"
          />
        </div>

        <footer class="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button
            type="button"
            class="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            data-test="run-member-settings-done"
            @click="emit('close')"
          >
            {{ $t('runSettings.chat.done') }}
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { RunMemberSettingChange, RunMemberSettingReset, RunSettingFlags } from '~/types/runSettings/RunSettings'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import RunMembersSection from './RunMembersSection.vue'

/**
 * UIS-002: the right-side "Member settings" drawer. Resizable 400–960 px (the page keeps at least
 * 360 px), the width is remembered; full width below `sm`. Escape closes an open menu first, then
 * the drawer; focus moves to Close on open (the caller returns it on close).
 */
const props = withDefaults(defineProps<{
  open: boolean
  subjectKind: 'team' | 'org'
  subjectName: string
  nodes: readonly RunMemberNode[]
  locked?: RunSettingFlags
}>(), { locked: () => ({}) })

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'change', key: string, change: RunMemberSettingChange): void
  (event: 'reset', key: string, reset: RunMemberSettingReset): void
  (event: 'reset-all'): void
  (event: 'layout', value: { width: number; resizing: boolean }): void
}>()

const WIDTH_STORAGE_KEY = 'autobyteus.chat.memberPanelWidth'
const DEFAULT_WIDTH = 480
const MIN_WIDTH = 400
const MAX_WIDTH = 960
const MIN_PAGE_WIDTH = 360
const RESIZE_STEP = 24

const maxWidth = () => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - MIN_PAGE_WIDTH))
const clampWidth = (value: number) => Math.round(Math.min(maxWidth(), Math.max(MIN_WIDTH, value)))
const readStoredWidth = (): number => {
  try {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY))
    return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

const panelRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLElement | null>(null)
const width = ref(readStoredWidth())
const resizing = ref(false)

const publishLayout = () => emit('layout', { width: width.value, resizing: resizing.value })
const setWidth = (value: number, persist = false) => {
  width.value = clampWidth(value)
  publishLayout()
  if (persist) {
    try { localStorage.setItem(WIDTH_STORAGE_KEY, String(width.value)) } catch { /* private mode */ }
  }
}

const startResize = (event: PointerEvent) => {
  if (event.button !== 0) return
  event.preventDefault()
  resizing.value = true
  publishLayout()
  const previousCursor = document.body.style.cursor
  const previousSelect = document.body.style.userSelect
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  const onMove = (move: PointerEvent) => setWidth(window.innerWidth - move.clientX)
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = previousSelect
    resizing.value = false
    setWidth(width.value, true)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

const onWindowResize = () => setWidth(width.value)
const onDocumentKey = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !props.open) return
  // An open menu inside the drawer closes first.
  if (panelRef.value?.querySelector('[role="menu"], [data-test="chat-workspace-menu"]')) return
  emit('close')
}

const listen = (on: boolean) => {
  if (on) {
    document.addEventListener('keydown', onDocumentKey)
    window.addEventListener('resize', onWindowResize)
  } else {
    document.removeEventListener('keydown', onDocumentKey)
    window.removeEventListener('resize', onWindowResize)
  }
}

watch(() => props.open, async (open) => {
  listen(open)
  if (!open) return
  setWidth(width.value)
  await nextTick()
  closeRef.value?.focus()
}, { immediate: true })

onBeforeUnmount(() => listen(false))
</script>
