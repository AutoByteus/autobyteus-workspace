import { onBeforeUnmount, onMounted, ref } from 'vue'

export interface ResponsiveElementRect {
  width: number
  height: number
}

export function useResponsiveElementRect() {
  const rect = ref<ResponsiveElementRect>({ width: 0, height: 0 })

  const readRect = (): void => {
    if (typeof window === 'undefined') {
      return
    }

    rect.value = {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  onMounted(() => {
    readRect()
    window.addEventListener('resize', readRect)
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', readRect)
    }
  })

  return {
    rect,
    refreshRect: readRect,
  }
}
