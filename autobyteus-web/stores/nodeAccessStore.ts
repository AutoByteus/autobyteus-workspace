import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NodeAccessActionResult, NodeAccessState, NodeAccessStates } from '~/shared/nodeAccessTypes'

/**
 * The window's view of this desktop's node credentials (autobyteus-437 DS-003; node access model NA-5, NA-8): each
 * node entry's state, and Connect (with a setup code) and Disconnect. The desktop's main process holds the
 * credentials; a window never sees one. Desktop only: a browser window has no desktop shell.
 */
export const useNodeAccessStore = defineStore('nodeAccess', () => {
  const states = ref<NodeAccessStates>({})
  let listening = false

  const supported = (): boolean => typeof window !== 'undefined' && Boolean(window.electronAPI?.getNodeAccessStates)

  async function initialize(): Promise<void> {
    if (listening || !supported()) return
    listening = true
    window.electronAPI.onNodeAccessChanged((next) => { states.value = next })
    try {
      states.value = await window.electronAPI.getNodeAccessStates()
    } catch (cause) {
      console.warn('Failed to read the node connection states:', cause)
    }
  }

  const stateOf = (entryId: string): NodeAccessState | null => states.value[entryId] ?? null

  const apply = (result: NodeAccessActionResult): NodeAccessActionResult => {
    if (result.ok) states.value = result.states
    return result
  }

  async function connect(entryId: string, setupCode: string): Promise<NodeAccessActionResult> {
    return apply(await window.electronAPI.connectNode(entryId, setupCode))
  }

  async function disconnect(entryId: string): Promise<NodeAccessActionResult> {
    return apply(await window.electronAPI.disconnectNode(entryId))
  }

  return { states, supported, initialize, stateOf, connect, disconnect }
})
