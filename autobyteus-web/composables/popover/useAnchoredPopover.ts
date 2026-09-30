import { nextTick, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const NARROW_MAX_WIDTH_PX = 640
const VIEWPORT_MARGIN_PX = 16
/** Gap between the menu and the box it opens above; matches the menus' `mb-1.5`. */
const MENU_GAP_PX = 6
const AUTO_MIN_HEIGHT_PX = 220

/**
 * Where a menu may open.
 * - `auto`: below when the preferred height fits there, otherwise whichever side has more room
 *   (the running-conversation `/` skill menu).
 * - `above`: always upward, never flipping down. The height shrinks to the space above the menu's
 *   containing block and the menu's own list scrolls (the new-chat composer menus).
 */
export type AnchoredPopoverPlacementPolicy = 'auto' | 'above'

export interface AnchoredPopoverOptions {
  placement?: AnchoredPopoverPlacementPolicy
}

/**
 * The box an absolutely positioned child of `root` is placed against: `root` itself when it is
 * positioned, otherwise its offset parent (e.g. the composer card for the message box's menus).
 */
const containingBlockOf = (root: HTMLElement): HTMLElement =>
  getComputedStyle(root).position !== 'static' ? root : (root.offsetParent as HTMLElement | null) ?? root

/**
 * Anchored popover behavior shared by the Chat menus and the message box's `/` skill menu:
 * toggling, outside-click and Escape dismissal with focus return, the placement policy with a
 * bounded height, and the narrow (bottom sheet) breakpoint. Placement and height are measured
 * when the menu opens.
 */
export function useAnchoredPopover(
  rootRef: Ref<HTMLElement | null>,
  triggerRef: Ref<HTMLElement | null>,
  preferredHeight = 460,
  options: AnchoredPopoverOptions = {},
) {
  const policy = options.placement ?? 'auto'
  const open = ref(false)
  const placement = ref<'above' | 'below'>(policy === 'above' ? 'above' : 'below')
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

  const measureAbove = () => {
    const root = rootRef.value
    const box = root ? containingBlockOf(root) : triggerRef.value
    if (!box) return
    const spaceAbove = box.getBoundingClientRect().top - MENU_GAP_PX - VIEWPORT_MARGIN_PX
    placement.value = 'above'
    maxHeight.value = Math.max(0, Math.min(preferredHeight, Math.floor(spaceAbove)))
  }

  const measureAuto = () => {
    const trigger = triggerRef.value
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN_PX
    const above = rect.top - VIEWPORT_MARGIN_PX
    const fitsBelow = below >= preferredHeight
    const fitsAbove = above >= preferredHeight
    if (fitsBelow || (!fitsAbove && below >= above)) {
      placement.value = 'below'
      maxHeight.value = Math.max(AUTO_MIN_HEIGHT_PX, Math.min(preferredHeight, below))
    } else {
      placement.value = 'above'
      maxHeight.value = Math.max(AUTO_MIN_HEIGHT_PX, Math.min(preferredHeight, above))
    }
  }

  const measure = policy === 'above' ? measureAbove : measureAuto

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
