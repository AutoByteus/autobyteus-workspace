import { ipcMain, safeStorage, session } from 'electron'
import type { NodeEntry } from '../nodeRegistryTypes'
import { NODE_ACCESS_CHANGED_CHANNEL, type NodeAccessStates } from '../../shared/nodeAccessTypes'
import { registerNodeAccessIpc } from './nodeAccessIpc'
import { NodeCredentialAttacher } from './nodeCredentialAttacher'
import { NodeConnectService } from './nodeConnectService'
import { NodeCredentialStore } from './nodeCredentialStore'

/**
 * Starts the desktop's node access (design DS-002, DS-003): the encrypted credential store, the attacher on the app
 * windows' session (installed before any window loads), and the connect service with its IPC. The embedded node's
 * launch credential is re-read whenever the server manager starts the node again.
 */
export function startDesktopNodeAccess(input: Readonly<{
  userDataPath: string
  nodes(): readonly NodeEntry[]
  embedded(): Readonly<{ baseUrl: string; credential: string | null }>
  onLaunchCredentialChanged(listener: () => void): void
  broadcast(channel: string, states: NodeAccessStates): void
}>): NodeConnectService {
  const store = NodeCredentialStore.inUserData(input.userDataPath, safeStorage)
  store.load()
  const attacher = new NodeCredentialAttacher(session.defaultSession)
  attacher.install()
  const service = new NodeConnectService({
    store,
    attacher,
    nodes: input.nodes,
    embedded: input.embedded,
    onChange: (states) => input.broadcast(NODE_ACCESS_CHANGED_CHANNEL, states),
  })
  input.onLaunchCredentialChanged(() => service.refresh())
  registerNodeAccessIpc(ipcMain, service)
  service.refresh()
  return service
}
