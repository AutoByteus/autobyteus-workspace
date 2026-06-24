import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface ResponsiveElementRect {
  width: number
  height: number
}

export function useResponsiveElementRect(targetRef?: Ref<HTMLElement | null>) {
  const rect = ref<ResponsiveElementRect>({ width: 0, height: 0 })
  let resizeObserver: ResizeObserver | null = null

  const readRect = (): void => {
    if (typeof window === 'undefined') {
      return
    }

    const element = targetRef?.value ?? null
    if (element) {
      rect.value = {
        width: element.clientWidth,
        height: element.clientHeight,
      }
      return
    }

    rect.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  onMounted(() => {
    readRect()

    const element = targetRef?.value ?? null
    if (element && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(readRect)
      resizeObserver.observe(element)
    }

    window.addEventListener('resize', readRect)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', readRect)
    }
  })

  return {
    rect,
    refreshRect: readRect,
  }
}
