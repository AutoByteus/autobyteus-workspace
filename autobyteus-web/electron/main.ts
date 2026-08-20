import { app } from 'electron'
import { getCanonicalBaseDataPath } from './appDataPaths'
import { configureElectronLogger } from './logger'
import { registerLocalFileProtocolScheme } from './local-file-protocol/register-local-file-scheme'
import { assertEmbeddedServerListenerPortAvailable } from './launch-profile/e2eLaunchPreflight'
import { resolveElectronLaunchProfile } from './launch-profile/electronLaunchProfile'
import { applyElectronLaunchProfilePaths } from './launch-profile/electronLaunchProfilePaths'

registerLocalFileProtocolScheme()

type ApplicationController = {
  start: () => Promise<void>
  stop: () => Promise<void>
}

function getProtectedProductionPaths(): string[] {
  return Array.from(new Set([
    getCanonicalBaseDataPath(),
    app.getPath('userData'),
    app.getPath('sessionData'),
    app.getPath('logs'),
    app.getPath('crashDumps'),
  ]))
}

async function bootstrap(): Promise<void> {
  let application: ApplicationController | null = null
  try {
    const profile = resolveElectronLaunchProfile({
      env: process.env,
      protectedPaths: getProtectedProductionPaths(),
    })
    applyElectronLaunchProfilePaths(app, profile)
    configureElectronLogger({
      baseDataPath: profile.baseDataRoot,
      env: process.env,
    })

    if (profile.name === 'e2e') {
      await assertEmbeddedServerListenerPortAvailable(profile.clientEndpoint.port)
    }

    const { ElectronApplication } = await import('./application/electronApplication')
    application = new ElectronApplication({ profile })
    await application.start()
  } catch (error) {
    try {
      await application?.stop()
    } catch (cleanupError) {
      console.error('[electron-bootstrap] Failed to clean up after startup error:', cleanupError)
    }
    console.error(
      '[electron-bootstrap] Startup failed:',
      error instanceof Error ? error.message : String(error),
    )
    app.exit(1)
  }
}

void bootstrap()
