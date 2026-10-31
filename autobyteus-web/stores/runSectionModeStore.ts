import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

/** projects-left-navigation (REQ-001): how the left panel's run section groups runs. */
export type RunSectionMode = 'workspaces' | 'projects'

export const RUN_SECTION_MODE_STORAGE_PREFIX = 'autobyteus.leftPanel.runSectionMode.'

const storage = (): Storage | null => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null)

/**
 * The run section's mode, remembered per bound node. Switching only changes which tree the run section shows: it never
 * opens, starts, stops or changes the open conversation (REQ-001, DS-006).
 */
export const useRunSectionModeStore = defineStore('runSectionMode', () => {
  const node = useWindowNodeContextStore()
  const storageKey = () => `${RUN_SECTION_MODE_STORAGE_PREFIX}${node.entryId}`
  const mode = ref<RunSectionMode>('workspaces')
  const read = () => { mode.value = storage()?.getItem(storageKey()) === 'projects' ? 'projects' : 'workspaces' }
  read()
  watch(() => node.entryId, read)

  const setMode = (next: RunSectionMode) => {
    mode.value = next
    storage()?.setItem(storageKey(), next)
  }
  return { mode, setMode }
})
