import { ref } from 'vue'

export function usePanelResize() {
  const fileExplorerWidth = ref(300)
  const contentViewerWidth = ref(400)
  const minPanelWidth = 200 // Minimum width for any panel
  const maxContentWidth = 800 // Maximum width for content viewer

  const initDragFileToContent = (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = fileExplorerWidth.value

    const doDrag = (e: MouseEvent) => {
      const newWidth = startWidth + e.clientX - startX
      fileExplorerWidth.value = Math.max(minPanelWidth, newWidth)
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  const initDragContentToWorkflow = (e: MouseEvent, showFileContent: boolean) => {
    if (!showFileContent) return

    e.preventDefault()
    const startX = e.clientX
    const startWidth = contentViewerWidth.value
    const container = document.querySelector('.md\\:flex') as HTMLElement
    
    const doDrag = (e: MouseEvent) => {
      if (!container) return
      
      const containerWidth = container.offsetWidth
      const maxWidth = containerWidth - fileExplorerWidth.value - minPanelWidth - 32 // 32px for margins/padding
      const newWidth = startWidth + e.clientX - startX
      
      // Ensure content width stays within reasonable bounds while maintaining workflow visibility
      contentViewerWidth.value = Math.max(
        minPanelWidth,
        Math.min(maxWidth, newWidth)
      )
    }

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }

  return {
    fileExplorerWidth,
    contentViewerWidth,
    initDragFileToContent,
    initDragContentToWorkflow
  }
}