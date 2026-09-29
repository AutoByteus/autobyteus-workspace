import { observePortRelease } from '../electron-launch/launchPorts.mjs'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function createElectronE2ESession(prepared, processController) {
  let cleanupPromise = null
  const waitUntilReady = async (timeoutMs = 120_000) => {
    const deadline = Date.now() + timeoutMs
    let lastError = null
    while (Date.now() < deadline) {
      if (!processController.isRunning()) {
        throw new Error(`Electron E2E process exited before readiness${processController.outputSummary?.() ?? ''}`)
      }
      try {
        const response = await fetch(prepared.healthUrl, { signal: AbortSignal.timeout(2000) })
        if (response.ok) return prepared.metadata
        lastError = new Error(`health returned ${response.status}`)
      } catch (error) {
        lastError = error
      }
      await delay(250)
    }
    throw new Error(`Electron E2E readiness timed out: ${lastError?.message ?? 'unknown error'}`)
  }

  const cleanup = () => {
    if (cleanupPromise) return cleanupPromise
    cleanupPromise = (async () => {
      const processTreeCompletion = await processController.closeAndConfirmTree({
        gracefulTimeoutMs: 5000,
        forceTimeoutMs: 3000,
      })
      if (processTreeCompletion?.status !== 'complete') {
        throw new Error(
          `Owned Electron process tree completion was not affirmative: ${processController.processTreeIdentity ?? 'unknown identity'}`,
        )
      }

      await prepared.disposeOwnedDataRoot()
      const portObservation = await observePortRelease(prepared.port)
      return Object.freeze({ processTreeCompletion, portObservation })
    })()
    return cleanupPromise
  }

  return Object.freeze({
    metadata: prepared.metadata,
    processController,
    waitUntilReady,
    cleanup,
  })
}
