import net from 'node:net'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function observeSelectedPort(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const server = net.createServer()
    let settled = false
    const finish = (observation) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(Object.freeze(observation))
    }
    const timer = setTimeout(() => {
      try {
        server.close(() => undefined)
      } catch {
        // The diagnostic is already complete if the probe never reached listening state.
      }
      finish({
        status: 'occupied-after-owned-tree-exit',
        port,
        detail: 'listener observation timed out',
      })
    }, timeoutMs)
    server.once('error', (error) => finish({
      status: 'occupied-after-owned-tree-exit',
      port,
      detail: error instanceof Error ? error.message : String(error),
    }))
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      server.close((error) => finish(error
        ? {
            status: 'occupied-after-owned-tree-exit',
            port,
            detail: error.message,
          }
        : { status: 'available', port, detail: null }))
    })
  })
}

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
      const portObservation = await observeSelectedPort(prepared.port)
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
