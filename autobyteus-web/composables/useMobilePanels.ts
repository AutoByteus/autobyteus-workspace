import { ref, watch } from 'vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'

export function useMobilePanels() {
  const fileExplorerStore = useFileExplorerStore()
  const activeMobilePanel = ref('running')

  watch(() => fileExplorerStore.openFiles, (newFiles) => {
    if (newFiles.length > 0 && window.innerWidth < 768) {
      activeMobilePanel.value = 'content'
    }
  }, { deep: true })

  return {
    activeMobilePanel
  }
}