import type { IpcMain } from 'electron'
import type { BrowserPairingStateController } from './browser-pairing-state-controller'

type GetBrowserPairingController = () => BrowserPairingStateController | null

function requireController(getController: GetBrowserPairingController): BrowserPairingStateController {
  const controller = getController()
  if (!controller) {
    throw new Error('Browser pairing controller is unavailable because the browser runtime is not ready.')
  }
  return controller
}

export function registerBrowserPairingIpcHandlers(
  ipcMain: IpcMain,
  getController: GetBrowserPairingController,
): void {
  ipcMain.handle('browser-pairing:get-settings', async () => {
    return requireController(getController).getSettings()
  })

  ipcMain.handle('browser-pairing:update-settings', async (_event, input) => {
    return requireController(getController).updateSettings(input)
  })

  ipcMain.handle('browser-pairing:issue-descriptor', async (_event, nodeId: string) => {
    return requireController(getController).issueRemoteBrowserBridgeDescriptor(nodeId)
  })

  ipcMain.handle('browser-pairing:confirm-descriptor', async (_event, nodeId: string) => {
    requireController(getController).confirmRemoteBrowserBridgeRegistration(nodeId)
    return { ok: true }
  })

  ipcMain.handle(
    'browser-pairing:revoke-descriptor',
    async (_event, nodeId: string, state: 'revoked' | 'expired' | 'rejected', errorMessage?: string | null) => {
      requireController(getController).revokeRemoteBrowserBridgeDescriptor(
        nodeId,
        state,
        errorMessage ?? null,
      )
      return { ok: true }
    },
  )
}
