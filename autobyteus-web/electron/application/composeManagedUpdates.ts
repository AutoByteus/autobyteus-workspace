import { app } from 'electron'
import { claimManagedRestart } from '../launch-profile/managedRestartChannel'
import { detectLinuxManagedInstall } from '../updater/linuxManagedInstall'
import { loadAppUpdateAutomatic } from '../updater/appUpdateAutomaticStore'
import { loadAppUpdateChannel } from '../updater/appUpdateChannelStore'
import { ManagedUpdateSession } from './managedUpdateSession'
import type { ApplicationShutdown } from './applicationShutdown'

export function composeManagedUpdates(options: {
  shutdown: ApplicationShutdown
  serverGone: () => boolean
  notifyQuit: () => void
  report: (error: unknown) => void
}): ManagedUpdateSession | null {
  const writer = app.isPackaged ? detectLinuxManagedInstall() : null
  if (!writer) return null
  app.setDesktopName('autobyteus-managed.desktop')
  const requestReopen = claimManagedRestart()
  const session = new ManagedUpdateSession({ ...options, writer, requestReopen,
    initialSettings: { automaticUpdate: loadAppUpdateAutomatic(app.getPath('userData')), updateChannel: loadAppUpdateChannel(app.getPath('userData')) },
    quit: () => app.quit(), exit: code => app.exit(code),
  })
  app.on('before-quit', () => { if (!session.passingQuit) session.quitRequested() })
  return session
}
