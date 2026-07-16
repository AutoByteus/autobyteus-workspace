import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

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
  returnFocusTarget?: (origin?: HTMLElement | null) => HTMLElement | null
}

// Drawers are independent side surfaces. A small shared stack makes keyboard
// ownership deterministic when both are open without coupling their stores.
interface OpenDrawer {
  id: symbol
  focusInitialElement: () => Promise<void>
}

const DRAWER_BACKDROP_Z_INDEX = 40
const DRAWER_BASE_Z_INDEX = 50

// This ordered registry is the shared layer owner for the independent shell
// drawers. The same order drives keyboard ownership and the z-indexes for
// both the backdrop and drawer, so visual and modal topmost state cannot drift.
const openDrawers = ref<OpenDrawer[]>([])

let lastFocusedElement: HTMLElement | null = null

export const rememberDrawerTrigger = (element: EventTarget | null): void => {
  if (element instanceof HTMLElement && (
    element.hasAttribute('data-nav-key') || element.hasAttribute('data-tab-name')
  )) {
    lastFocusedElement = element
  }
}

const registerDrawer = (drawer: OpenDrawer): void => {
  const previousIndex = openDrawers.value.findIndex((entry) => entry.id === drawer.id)
  if (previousIndex !== -1) {
    openDrawers.value.splice(previousIndex, 1)
  }
  openDrawers.value.push(drawer)
}

const unregisterDrawer = (drawerId: symbol): OpenDrawer | null => {
  const index = openDrawers.value.findIndex((entry) => entry.id === drawerId)
  if (index !== -1) {
    openDrawers.value.splice(index, 1)
  }
  return openDrawers.value[openDrawers.value.length - 1] ?? null
}

const ownsKeyboardInteraction = (drawerId: symbol): boolean => (
  openDrawers.value[openDrawers.value.length - 1]?.id === drawerId
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
}: AccessibleDrawerOptions): {
  drawerLayer: {
    backdropZIndex: Readonly<Ref<number>>
    drawerZIndex: Readonly<Ref<number>>
    isTopmost: Readonly<Ref<boolean>>
  }
} => {
  const isOpen = providedIsOpen ?? ref(true)
  const returnFocusTarget = ref<HTMLElement | null>(null)
  const drawerId = Symbol('accessible-drawer')
  const layerIndex = computed(() => openDrawers.value.findIndex((drawer) => drawer.id === drawerId))
  const normalizedLayerIndex = computed(() => Math.max(layerIndex.value, 0))
  const backdropZIndex = computed(() => DRAWER_BACKDROP_Z_INDEX + normalizedLayerIndex.value)
  const drawerZIndex = computed(() => DRAWER_BASE_Z_INDEX + normalizedLayerIndex.value)
  const isTopmost = computed(() => (
    layerIndex.value !== -1 && layerIndex.value === openDrawers.value.length - 1
  ))

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

  const restoreFocus = async (remainingDrawer: OpenDrawer | null = null): Promise<void> => {
    await nextTick()

    if (remainingDrawer) {
      await remainingDrawer.focusInitialElement()
      return
    }

    const origin = returnFocusTarget.value
    const resolveTarget = (): HTMLElement | null => (
      origin?.isConnected && document.contains(origin)
        ? origin
        : returnFocusTargetResolver?.(origin) ?? null
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
      const activeElement = document.activeElement instanceof HTMLElement
        && document.activeElement !== document.body
        && document.contains(document.activeElement)
        ? document.activeElement
        : null
      returnFocusTarget.value = activeElement
        ?? lastFocusedElement
      registerDrawer({ id: drawerId, focusInitialElement })
      document.addEventListener('keydown', handleKeydown)
      void focusInitialElement()
      return
    }

    if (!open && wasOpen) {
      const remainingDrawer = unregisterDrawer(drawerId)
      document.removeEventListener('keydown', handleKeydown)
      void restoreFocus(remainingDrawer)
    }
  }

  watch(() => isOpen.value, onOpenStateChange, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => {
    const remainingDrawer = unregisterDrawer(drawerId)
    document.removeEventListener('keydown', handleKeydown)
    if (isOpen.value) {
      void restoreFocus(remainingDrawer)
    }
  })

  return {
    drawerLayer: {
      backdropZIndex,
      drawerZIndex,
      isTopmost,
    },
  }
}
