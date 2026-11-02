import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NodeAutoUpdateEntries, NodeAutoUpdateEntry } from '~/shared/nodeAutoUpdateTypes'
import { useNodeStore } from '~/stores/nodeStore'

/**
 * The window's view of the desktop's automatic node updates (autobyteus-356, DS-003): each remote entry's switch (a
 * desktop registry field) and its last automatic outcome (kept by the desktop shell). The window never decides or
 * starts a node update; the desktop's main process does.
 */
export const useNodeAutoUpdateStore = defineStore('nodeAutoUpdate', () => {
  const nodes = useNodeStore()
  const entries = ref<NodeAutoUpdateEntries>({})
  let listening = false

  /** Desktop only: a browser window has no desktop shell to keep the switch or run the updates. */
  const supported = (): boolean => typeof window !== 'undefined' && Boolean(window.electronAPI?.getNodeAutoUpdateState)

  async function initialize(): Promise<void> {
    if (listening || !supported()) return
    listening = true
    window.electronAPI.onNodeAutoUpdateChanged((next) => { entries.value = next })
    try {
      entries.value = await window.electronAPI.getNodeAutoUpdateState()
    } catch (cause) {
      console.warn('Failed to read automatic node updates:', cause)
    }
  }

  const outcomeOf = (entryId: string): NodeAutoUpdateEntry | null => entries.value[entryId] ?? null
  const isEnabled = (entryId: string): boolean => nodes.getEntryById(entryId)?.autoUpdate === true

  async function setEnabled(entryId: string, enabled: boolean): Promise<void> {
    await nodes.setNodeAutoUpdate(entryId, enabled)
  }

  /** The user saw the node's outcome. */
  async function markRead(entryId: string): Promise<void> {
    const entry = outcomeOf(entryId)
    if (!entry || entry.read || entry.outcome === 'PENDING' || !supported()) return
    entries.value = await window.electronAPI.markNodeAutoUpdateRead(entryId)
  }

  return { entries, supported, initialize, outcomeOf, isEnabled, setEnabled, markRead }
})
