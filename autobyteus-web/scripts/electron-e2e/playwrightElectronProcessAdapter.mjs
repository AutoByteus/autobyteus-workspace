import { createElectronE2ESession } from './electronE2ESession.mjs'
import { createOwnedElectronProcessTreeController } from './ownedElectronProcessTree.mjs'

function attachCleanupError(primaryError, cleanupError) {
  if (primaryError && typeof primaryError === 'object' && Object.isExtensible(primaryError)) {
    Object.defineProperty(primaryError, 'cleanupError', {
      configurable: true,
      value: cleanupError,
    })
  }
}

export async function launchPreparedElectronWithPlaywright(
  preparedLaunch,
  electronLauncher,
  dependencies = {},
) {
  const prepared = preparedLaunch.claim('Playwright adapter')
  const createProcessController = dependencies.createProcessController
    ?? createOwnedElectronProcessTreeController
  let electronApplication = null
  let controller = null
  try {
    electronApplication = await electronLauncher.launch({
      executablePath: prepared.executablePath,
      args: prepared.args,
      env: prepared.env,
    })
    const child = electronApplication.process()
    // Installed Playwright launches this PID as the POSIX process-group leader and
    // uses a targeted Windows tree. The controller verifies that whole identity.
    controller = await createProcessController({
      rootProcess: child,
      requestGracefulClose: () => electronApplication.close(),
    })
    const session = createElectronE2ESession(prepared, controller)
    return Object.freeze({
      ...session,
      electronApplication,
      firstWindow: (...args) => electronApplication.firstWindow(...args),
    })
  } catch (primaryError) {
    try {
      if (electronApplication) {
        if (!controller) {
          controller = await createProcessController({
            rootProcess: electronApplication.process(),
            requestGracefulClose: () => electronApplication.close(),
          })
        }
        await createElectronE2ESession(prepared, controller).cleanup()
      } else {
        // playwright-core@1.58.2 rejects launch only after a no-PID failure cleanup
        // or after force-killing and waiting for its detached process group.
        if (prepared.ownsDataRoot) await prepared.disposeOwnedDataRoot()
      }
    } catch (cleanupError) {
      attachCleanupError(primaryError, cleanupError)
    }
    throw primaryError
  }
}
