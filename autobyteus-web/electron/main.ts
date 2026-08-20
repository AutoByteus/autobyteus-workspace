import { app } from 'electron'
import { getCanonicalBaseDataPath } from './appDataPaths'
import { configureElectronLogger } from './logger'
import { registerLocalFileProtocolScheme } from './local-file-protocol/register-local-file-scheme'
import { scrubE2ELaunchEnvironment } from './launch-profile/e2eLaunchEnvironment'
import { assertEmbeddedServerListenerPortAvailable } from './launch-profile/e2eLaunchPreflight'
import {
  ELECTRON_LAUNCH_ENV_KEYS,
  resolveElectronLaunchProfile,
} from './launch-profile/electronLaunchProfile'
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

function snapshotProductionEnvironment(): NodeJS.ProcessEnv {
  const snapshot = { ...process.env }
  for (const key of ELECTRON_LAUNCH_ENV_KEYS) {
    delete snapshot[key]
  }
  return Object.freeze(snapshot)
}

async function bootstrap(): Promise<void> {
  let application: ApplicationController | null = null
  try {
    const profile = resolveElectronLaunchProfile({
      env: process.env,
      protectedPaths: getProtectedProductionPaths(),
    })
    const baseEnvironment = profile.name === 'e2e'
      ? scrubE2ELaunchEnvironment(process.env)
      : snapshotProductionEnvironment()

    applyElectronLaunchProfilePaths(app, profile)
    configureElectronLogger({
      baseDataPath: profile.baseDataRoot,
      env: baseEnvironment,
    })

    if (profile.name === 'e2e') {
      await assertEmbeddedServerListenerPortAvailable(profile.clientEndpoint.port)
    }

    const { ElectronApplication } = await import('./application/electronApplication')
    application = new ElectronApplication({ profile, baseEnvironment })
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
