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
  returnFocusTarget?: () => HTMLElement | null
}

// Drawers are independent side surfaces. A small shared stack makes keyboard
// ownership deterministic when both are open without coupling their stores.
const openDrawerIds: symbol[] = []

const registerDrawer = (drawerId: symbol): void => {
  const previousIndex = openDrawerIds.indexOf(drawerId)
  if (previousIndex !== -1) {
    openDrawerIds.splice(previousIndex, 1)
  }
  openDrawerIds.push(drawerId)
}

const unregisterDrawer = (drawerId: symbol): void => {
  const index = openDrawerIds.indexOf(drawerId)
  if (index !== -1) {
    openDrawerIds.splice(index, 1)
  }
}

const ownsKeyboardInteraction = (drawerId: symbol): boolean => (
  openDrawerIds[openDrawerIds.length - 1] === drawerId
)

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
  returnFocusTarget: returnFocusTargetResolver,
}: AccessibleDrawerOptions): void => {
  const isOpen = providedIsOpen ?? ref(true)
  const returnFocusTarget = ref<HTMLElement | null>(null)
  const drawerId = Symbol('accessible-drawer')

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
    await nextTick()

    const resolveTarget = (): HTMLElement | null => (
      returnFocusTargetResolver?.()
      ?? (returnFocusTarget.value?.isConnected ? returnFocusTarget.value : null)
    )
    let target = resolveTarget()

    // A strip may be conditionally remounted by the same dismissal update.
    // Retry the side-specific resolver once if its new node is not present on
    // the first post-update tick, while preserving the normal one-tick path
    // for a still-connected opener.
    if (!target && returnFocusTargetResolver) {
      await nextTick()
      target = resolveTarget()
    }

    if (target) {
      target.focus()
    }

    returnFocusTarget.value = null
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!isOpen.value || !ownsKeyboardInteraction(drawerId)) {
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
      registerDrawer(drawerId)
      document.addEventListener('keydown', handleKeydown)
      void focusInitialElement()
      return
    }

    if (!open && wasOpen) {
      unregisterDrawer(drawerId)
      document.removeEventListener('keydown', handleKeydown)
      void restoreFocus()
    }
  }

  watch(() => isOpen.value, onOpenStateChange, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => {
    unregisterDrawer(drawerId)
    document.removeEventListener('keydown', handleKeydown)
    if (isOpen.value) {
      void restoreFocus()
    }
  })
}
