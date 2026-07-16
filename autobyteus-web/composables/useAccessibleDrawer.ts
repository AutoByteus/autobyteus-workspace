import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface AccessibleDrawerOptions {
  drawerRef: Ref<HTMLElement | null>
  onRequestClose: () => void
  isOpen?: Readonly<Ref<boolean>>
}

const getFocusableElements = (drawer: HTMLElement): HTMLElement[] => Array.from(
  drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
).filter((element) => !element.hasAttribute('aria-hidden'))

/**
 * Owns the shared keyboard, focus-entry, and focus-return lifecycle for shell drawers.
 * The drawer component remains responsible for its surface content and close event.
 */
export const useAccessibleDrawer = ({
  drawerRef,
  onRequestClose,
  isOpen: providedIsOpen,
}: AccessibleDrawerOptions): void => {
  const isOpen = providedIsOpen ?? ref(true)
  const returnFocusTarget = ref<HTMLElement | null>(null)

  const focusInitialElement = async (): Promise<void> => {
    await nextTick()

    const drawer = drawerRef.value
    if (!drawer) {
      return
    }

    const initialElement = drawer.querySelector<HTMLElement>('[data-drawer-initial-focus]')
      ?? getFocusableElements(drawer)[0]

    if (initialElement) {
      initialElement.focus()
      return
    }

    drawer.focus()
  }

  const restoreFocus = async (): Promise<void> => {
    const target = returnFocusTarget.value
    await nextTick()

    if (target?.isConnected) {
      target.focus()
    }

    returnFocusTarget.value = null
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!isOpen.value) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onRequestClose()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const drawer = drawerRef.value
    if (!drawer) {
      return
    }

    const focusableElements = getFocusableElements(drawer)
    if (focusableElements.length === 0) {
      event.preventDefault()
      drawer.focus()
      return
    }

    const activeElement = document.activeElement

    if (!drawer.contains(activeElement)) {
      event.preventDefault()
      focusableElements[0].focus()
      return
    }

    const activeIndex = focusableElements.indexOf(activeElement as HTMLElement)
    event.preventDefault()

    if (event.shiftKey) {
      focusableElements[activeIndex <= 0 ? focusableElements.length - 1 : activeIndex - 1].focus()
    } else {
      focusableElements[activeIndex < 0 || activeIndex === focusableElements.length - 1 ? 0 : activeIndex + 1].focus()
    }
  }

  const onOpenStateChange = (open: boolean, wasOpen: boolean | undefined): void => {
    if (open && !wasOpen) {
      returnFocusTarget.value = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      document.addEventListener('keydown', handleKeydown)
      void focusInitialElement()
      return
    }

    if (!open && wasOpen) {
      document.removeEventListener('keydown', handleKeydown)
      void restoreFocus()
    }
  }

  watch(() => isOpen.value, onOpenStateChange, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    if (isOpen.value) {
      void restoreFocus()
    }
  })
}
