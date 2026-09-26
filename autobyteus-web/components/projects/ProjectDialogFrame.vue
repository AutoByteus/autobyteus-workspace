<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" @mousedown.self="requestClose">
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-busy="busy"
        tabindex="-1"
        class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
        :class="widthClass"
        :data-testid="testId"
        @keydown="handleKeydown"
      >
        <header class="border-b border-slate-100 px-6 pb-4 pt-5">
          <h2 :id="titleId" class="text-lg font-semibold text-slate-900">{{ title }}</h2>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <footer class="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <slot name="actions" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let dialogSequence = 0

const props = withDefaults(defineProps<{
  title: string
  busy?: boolean
  size?: 'md' | 'lg'
  testId?: string
}>(), {
  busy: false,
  size: 'md',
  testId: undefined,
})

const emit = defineEmits<{ (e: 'close'): void }>()

const panelRef = ref<HTMLElement | null>(null)
const titleId = `project-dialog-title-${++dialogSequence}`
const widthClass = computed(() => (props.size === 'lg' ? 'max-w-2xl' : 'max-w-lg'))
let returnFocusTarget: HTMLElement | null = null

const focusableElements = (): HTMLElement[] => Array.from(
  panelRef.value?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
).filter((element) => !element.hasAttribute('aria-hidden'))

const requestClose = (): void => {
  if (!props.busy) {
    emit('close')
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    requestClose()
    return
  }

  if (event.key !== 'Tab') {
    return
  }

  const elements = focusableElements()
  if (elements.length === 0) {
    event.preventDefault()
    panelRef.value?.focus()
    return
  }

  const first = elements[0]!
  const last = elements[elements.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === panelRef.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(async () => {
  returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null
  await nextTick()
  const initial = panelRef.value?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? focusableElements()[0]
  ;(initial ?? panelRef.value)?.focus()
})

onBeforeUnmount(() => {
  if (returnFocusTarget?.isConnected) {
    returnFocusTarget.focus()
  }
})
</script>
