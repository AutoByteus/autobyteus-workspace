import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const NARROW_MAX_WIDTH_PX = 640

/**
 * Popover behavior for the Chat menus: toggling, outside-click and Escape dismissal with focus
 * return, above/below placement with a bounded height, and the narrow (bottom sheet) breakpoint.
 */
export function useChatPopover(
  rootRef: Ref<HTMLElement | null>,
  triggerRef: Ref<HTMLElement | null>,
  preferredHeight = 460,
) {
  const open = ref(false)
  const placement = ref<'above' | 'below'>('below')
  const maxHeight = ref(preferredHeight)
  const narrow = ref(false)

  const updateNarrow = () => {
    narrow.value = typeof window !== 'undefined' && window.innerWidth < NARROW_MAX_WIDTH_PX
  }

  const onDocumentPointer = (event: MouseEvent) => {
    if (!open.value) return
    const root = rootRef.value
    if (root && event.target instanceof Node && root.contains(event.target)) return
    close(false)
  }

  const onDocumentKey = (event: KeyboardEvent) => {
    if (open.value && event.key === 'Escape') {
      event.stopPropagation()
      close(true)
    }
  }

  const measure = () => {
    const trigger = triggerRef.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - 16
    const above = rect.top - 16
    const fitsBelow = below >= preferredHeight
    const fitsAbove = above >= preferredHeight
    if (fitsBelow || (!fitsAbove && below >= above)) {
      placement.value = 'below'
      maxHeight.value = Math.max(220, Math.min(preferredHeight, below))
    } else {
      placement.value = 'above'
      maxHeight.value = Math.max(220, Math.min(preferredHeight, above))
    }
  }

  const show = async () => {
    updateNarrow()
    measure()
    open.value = true
    document.addEventListener('mousedown', onDocumentPointer, true)
    document.addEventListener('keydown', onDocumentKey, true)
    await nextTick()
  }

  function close(returnFocus = true) {
    if (!open.value) return
    open.value = false
    document.removeEventListener('mousedown', onDocumentPointer, true)
    document.removeEventListener('keydown', onDocumentKey, true)
    if (returnFocus) triggerRef.value?.focus()
  }

  const toggle = () => (open.value ? close(true) : show())

  onMounted(() => {
    updateNarrow()
    window.addEventListener('resize', updateNarrow)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateNarrow)
    close(false)
  })

  return { open, placement, maxHeight, narrow, show, close, toggle }
}
