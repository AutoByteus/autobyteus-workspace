import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

/**
 * How the left panel's run section shows the runs (workspace-tree-vs-chooser REQ-006): your runs with no grouping, by
 * folder (the default), or by Project.
 */
export type RunSectionMode = 'runs' | 'workspaces' | 'projects'

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
  // An unknown or missing value reads as the default view.
  const read = () => {
    const saved = storage()?.getItem(storageKey())
    mode.value = saved === 'runs' || saved === 'projects' ? saved : 'workspaces'
  }
  read()
  watch(() => node.entryId, read)

  const setMode = (next: RunSectionMode) => {
    mode.value = next
    storage()?.setItem(storageKey(), next)
  }
  return { mode, setMode }
})
