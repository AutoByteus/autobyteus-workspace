import { spawn } from 'node:child_process'
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

export async function launchPreparedElectronDirect(preparedLaunch, dependencies = {}) {
  const prepared = preparedLaunch.claim('direct adapter')
  const spawnProcess = dependencies.spawnProcess ?? spawn
  const createProcessController = dependencies.createProcessController
    ?? createOwnedElectronProcessTreeController
  let child = null
  let controller = null
  try {
    child = spawnProcess(prepared.executablePath, prepared.args, {
      env: prepared.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32',
    })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })
    let output = ''
    const append = (chunk) => {
      output = `${output}${chunk}`.slice(-16_000)
    }
    child.stdout?.on('data', append)
    child.stderr?.on('data', append)
    controller = await createProcessController({
      rootProcess: child,
      outputSummary: () => output ? `\nRecent output:\n${output}` : '',
    })
    return createElectronE2ESession(prepared, controller)
  } catch (primaryError) {
    try {
      if (!controller && child?.pid) {
        controller = await createProcessController({ rootProcess: child })
      }
      if (controller) {
        await createElectronE2ESession(prepared, controller).cleanup()
      } else {
        await prepared.disposeOwnedDataRoot()
      }
    } catch (cleanupError) {
      attachCleanupError(primaryError, cleanupError)
    }
    throw primaryError
  }
}
