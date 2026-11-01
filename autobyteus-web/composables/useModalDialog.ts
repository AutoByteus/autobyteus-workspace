import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * A modal dialog's keyboard and focus behavior, as the Skills source dialog has it: focus moves into the dialog when it
 * opens, Tab and Shift+Tab cycle inside it (also when focus fell out of it), Esc asks to close, and focus returns to the
 * control that opened it when it closes. While another layer owns the keyboard (`blocked`, e.g. a confirmation over
 * the dialog), it does nothing.
 */
export function useModalDialog(options: {
  panelRef: Ref<HTMLElement | null>
  /** Asked to close (Esc); the dialog decides, e.g. not while an operation runs. */
  onClose: () => void
  /** The element to focus on open; the panel when absent. */
  initialFocus?: () => HTMLElement | null | undefined
  blocked?: () => boolean
}): void {
  let returnFocus: HTMLElement | null = null

  const handleKeydown = (event: KeyboardEvent) => {
    const panel = options.panelRef.value
    if (!panel || options.blocked?.()) return
    if (event.key === 'Escape') {
      event.preventDefault()
      options.onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (!items.length) return
    const first = items[0]!
    const last = items[items.length - 1]!
    const active = document.activeElement
    if (!panel.contains(active)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  onMounted(async () => {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', handleKeydown)
    await nextTick()
    ;(options.initialFocus?.() ?? options.panelRef.value)?.focus()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    if (returnFocus?.isConnected) returnFocus.focus()
  })
}
