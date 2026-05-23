import type { IpcMain } from 'electron'
import type { NodeAdminClaimStore } from './nodeAdminClaimStore'
import type { RegisterNodeAdminClaimInput } from '../types/nodeAdminClaim'

export const registerNodeAdminClaimIpcHandlers = (
  ipcMain: IpcMain,
  getClaimStore: () => NodeAdminClaimStore | null,
): void => {
  const requireClaimStore = (): NodeAdminClaimStore => {
    const claimStore = getClaimStore()
    if (!claimStore) {
      throw new Error('Node admin claim store is unavailable.')
    }
    return claimStore
  }

  ipcMain.handle('node-admin-claim:get-summary', async (_event, nodeId: string, managementBaseUrl: string) => {
    return requireClaimStore().getSummary(nodeId, managementBaseUrl)
  })

  ipcMain.handle('node-admin-claim:register', async (_event, input: RegisterNodeAdminClaimInput) => {
    return requireClaimStore().register(input)
  })

  ipcMain.handle('node-admin-claim:get-headers', async (_event, nodeId: string, managementBaseUrl: string) => {
    const claimStore = getClaimStore()
    if (!claimStore) {
      return {
        ok: false,
        reason: 'unavailable',
        summary: {
          status: 'missing',
          nodeId,
          managementBaseUrl,
          claimIdSuffix: null,
          updatedAt: null,
        },
      }
    }
    return claimStore.getHeaders(nodeId, managementBaseUrl)
  })

  ipcMain.handle('node-admin-claim:clear', async (_event, nodeId: string, managementBaseUrl: string) => {
    return requireClaimStore().clear(nodeId, managementBaseUrl)
  })
}
