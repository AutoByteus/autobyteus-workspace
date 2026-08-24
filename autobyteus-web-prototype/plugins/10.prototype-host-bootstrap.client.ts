import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useNodeStore } from '~/stores/nodeStore'
import { useServerStore } from '~/stores/serverStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { EMBEDDED_NODE_ID } from '~/types/node'
import { defineNuxtPlugin } from '#app'

/**
 * Exercise source presentation stores against the local host adapter. This is
 * intentionally a tiny UI bootstrap, not an Electron/runtime implementation.
 */
export default defineNuxtPlugin(async () => {
  if (!window.electronAPI) return

  const nodeStore = useNodeStore()
  await nodeStore.initializeRegistry()
  const context = await window.electronAPI.getWindowContext()
  const boundNode = nodeStore.getNodeById(context.nodeId) || nodeStore.getNodeById(EMBEDDED_NODE_ID)
  if (!boundNode) throw new Error('Synthetic host context has no bound node.')
  useWindowNodeContextStore().initializeFromWindowContext(context, boundNode.baseUrl)

  await useServerStore().initialize()
  await useAppUpdateStore().initialize()
})
