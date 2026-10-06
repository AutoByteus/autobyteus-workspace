import { computed, nextTick, ref, watch, type Ref } from 'vue'

const EDGE_MARGIN_PX = 8

/**
 * Keeps an absolutely positioned menu inside the box that
 * would clip it — the nearest scrolling ancestor (e.g. the member settings panel) or the window.
 * When the menu would cross an edge it is shifted back in, and narrowed when it is wider than
 * that box. It never moves the content around it.
 */
export function useMenuInBoundary(menuRef: Ref<HTMLElement | null>, open: Ref<boolean>, enabled: Ref<boolean>) {
  const shift = ref(0)
  const maxWidth = ref<number | null>(null)

  const boundaryOf = (element: HTMLElement): { left: number; right: number } => {
    let left = 0
    let right = window.innerWidth
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node)
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        const box = node.getBoundingClientRect()
        left = Math.max(left, box.left)
        right = Math.min(right, box.right)
        break
      }
    }
    return { left, right }
  }

  const place = () => {
    const menu = menuRef.value
    if (!menu || !open.value || !enabled.value) return
    const { left, right } = boundaryOf(menu)
    const available = right - left - EDGE_MARGIN_PX * 2
    maxWidth.value = available > 0 ? available : null
    void nextTick(() => {
      const rect = menu.getBoundingClientRect()
      const naturalLeft = rect.left - shift.value
      const naturalRight = naturalLeft + rect.width
      let next = 0
      if (naturalRight > right - EDGE_MARGIN_PX) next = right - EDGE_MARGIN_PX - naturalRight
      if (naturalLeft + next < left + EDGE_MARGIN_PX) next = left + EDGE_MARGIN_PX - naturalLeft
      shift.value = next
    })
  }

  watch(open, async (isOpen) => {
    shift.value = 0
    maxWidth.value = null
    if (!isOpen) return
    await nextTick()
    place()
  })

  const style = computed<Record<string, string>>(() => {
    if (!enabled.value) return {}
    return {
      ...(shift.value ? { transform: `translateX(${shift.value}px)` } : {}),
      ...(maxWidth.value ? { maxWidth: `${maxWidth.value}px` } : {}),
    }
  })

  return { style, place }
}
