import { shell, type IpcMain } from 'electron'
import { ManagedExtensionService } from './extensions/managedExtensionService'
import type { ExtensionId, UpdateVoiceInputSettingsPayload, VoiceInputTranscriptionRequest } from './extensions/types'

export function registerExtensionIpcHandlers(ipcMain: IpcMain, managedExtensionService: ManagedExtensionService): void {
  ipcMain.handle('extensions:get-state', async () => {
    return await managedExtensionService.listExtensions()
  })

  ipcMain.handle('extensions:install', async (_event, extensionId: ExtensionId) => {
    return await managedExtensionService.install(extensionId)
  })

  ipcMain.handle('extensions:enable', async (_event, extensionId: ExtensionId) => {
    return await managedExtensionService.enable(extensionId)
  })

  ipcMain.handle('extensions:disable', async (_event, extensionId: ExtensionId) => {
    return await managedExtensionService.disable(extensionId)
  })

  ipcMain.handle(
    'extensions:update-voice-input-settings',
    async (_event, extensionId: ExtensionId, payload: UpdateVoiceInputSettingsPayload) => {
      return await managedExtensionService.updateVoiceInputSettings(extensionId, payload)
    },
  )

  ipcMain.handle('extensions:remove', async (_event, extensionId: ExtensionId) => {
    return await managedExtensionService.remove(extensionId)
  })

  ipcMain.handle('extensions:reinstall', async (_event, extensionId: ExtensionId) => {
    return await managedExtensionService.reinstall(extensionId)
  })

  ipcMain.handle('extensions:open-folder', async (_event, extensionId: ExtensionId) => {
    try {
      const extensionPath = await managedExtensionService.getInstalledExtensionPath(extensionId)
      const openError = await shell.openPath(extensionPath)
      if (openError) {
        return { success: false, error: openError }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error opening extension folder',
      }
    }
  })

  ipcMain.handle('voice-input:transcribe', async (_event, payload: VoiceInputTranscriptionRequest) => {
    return await managedExtensionService.transcribeVoiceInput(payload)
  })
}
