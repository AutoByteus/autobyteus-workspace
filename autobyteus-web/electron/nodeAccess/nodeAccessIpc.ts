import type { IpcMain } from 'electron'
import {
  NODE_ACCESS_IPC_CONNECT,
  NODE_ACCESS_IPC_DISCONNECT,
  NODE_ACCESS_IPC_STATES,
  type NodeAccessActionResult,
} from '../../shared/nodeAccessTypes'
import type { NodeConnectService } from './nodeConnectService'

const invalid = (message: string): NodeAccessActionResult => ({ ok: false, code: 'NODE_ACCESS_REQUEST_INVALID', message })

/**
 * The windows' node access actions (design DS-003, interface "preload nodeAccess"): the states of the node entries,
 * Connect with a setup code, Disconnect. The windows never receive a credential.
 */
export function registerNodeAccessIpc(ipc: Pick<IpcMain, 'handle'>, service: NodeConnectService): void {
  ipc.handle(NODE_ACCESS_IPC_STATES, () => service.states())
  ipc.handle(NODE_ACCESS_IPC_CONNECT, (_event, entryId: unknown, setupCode: unknown) => {
    if (typeof entryId !== 'string' || typeof setupCode !== 'string' || !setupCode.trim()) {
      return invalid('A node and a setup code are required.')
    }
    return service.connect(entryId, setupCode)
  })
  ipc.handle(NODE_ACCESS_IPC_DISCONNECT, (_event, entryId: unknown) => {
    if (typeof entryId !== 'string') return invalid('A node is required.')
    return service.disconnect(entryId)
  })
}
