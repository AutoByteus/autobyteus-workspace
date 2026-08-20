import { createWindowsOwnedProcessTree } from './windowsOwnedProcessTree.mjs'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

async function waitForTreeAbsence({ refreshOwnedTree, isOwnedTreeAbsent }, deadline) {
  let lastVerificationError = null
  while (true) {
    try {
      await refreshOwnedTree()
      if (await isOwnedTreeAbsent()) {
        return { confirmed: true, lastVerificationError }
      }
      lastVerificationError = null
    } catch (error) {
      lastVerificationError = error
    }
    if (Date.now() >= deadline) {
      return { confirmed: false, lastVerificationError }
    }
    await delay(Math.min(100, Math.max(1, deadline - Date.now())))
  }
}

export function createCloseAndConfirmTreeController({
  pid,
  identity,
  isRootRunning,
  requestGracefulClose,
  forceOwnedTree,
  refreshOwnedTree = async () => undefined,
  isOwnedTreeAbsent,
  outputSummary = () => '',
}) {
  let closePromise = null
  const closeAndConfirmTree = (options = {}) => {
    if (closePromise) return closePromise
    closePromise = (async () => {
      const gracefulTimeoutMs = options.gracefulTimeoutMs ?? 5000
      const forceTimeoutMs = options.forceTimeoutMs ?? 3000
      let gracefulError = null
      let initialVerificationError = null
      try {
        await refreshOwnedTree()
      } catch (error) {
        initialVerificationError = error
      }
      const gracefulDeadline = Date.now() + gracefulTimeoutMs
      void Promise.resolve()
        .then(requestGracefulClose)
        .catch((error) => { gracefulError = error })

      let result = await waitForTreeAbsence(
        { refreshOwnedTree, isOwnedTreeAbsent },
        gracefulDeadline,
      )
      if (result.confirmed) {
        return Object.freeze({
          status: 'complete',
          identity,
          forced: false,
          gracefulError: gracefulError ? errorMessage(gracefulError) : null,
        })
      }

      let forceError = null
      try {
        await forceOwnedTree()
      } catch (error) {
        forceError = error
      }
      result = await waitForTreeAbsence(
        { refreshOwnedTree, isOwnedTreeAbsent },
        Date.now() + forceTimeoutMs,
      )
      if (result.confirmed) {
        return Object.freeze({
          status: 'complete',
          identity,
          forced: true,
          gracefulError: gracefulError ? errorMessage(gracefulError) : null,
        })
      }

      const details = [
        gracefulError ? `graceful close failed: ${errorMessage(gracefulError)}` : null,
        forceError ? `targeted force failed: ${errorMessage(forceError)}` : null,
        result.lastVerificationError
          ? `tree verification failed: ${errorMessage(result.lastVerificationError)}`
          : null,
        initialVerificationError
          ? `initial tree capture failed: ${errorMessage(initialVerificationError)}`
          : null,
      ].filter(Boolean)
      const error = new Error(
        `Unable to confirm completion of owned Electron process tree ${identity}`
        + (details.length ? ` (${details.join('; ')})` : ''),
      )
      error.code = 'ELECTRON_E2E_TREE_UNCONFIRMED'
      error.treeIdentity = identity
      throw error
    })()
    return closePromise
  }

  return Object.freeze({
    pid,
    processTreeIdentity: identity,
    isRunning: isRootRunning,
    outputSummary,
    closeAndConfirmTree,
  })
}

function isPosixProcessGroupAbsent(processGroupId) {
  try {
    process.kill(-processGroupId, 0)
    return false
  } catch (error) {
    if (error.code === 'ESRCH') return true
    if (error.code === 'EPERM') return false
    throw error
  }
}

function signalPosixProcessGroup(processGroupId, signal) {
  try {
    process.kill(-processGroupId, signal)
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

export async function createOwnedElectronProcessTreeController({
  rootProcess,
  platform = process.platform,
  requestGracefulClose,
  outputSummary,
}) {
  const pid = rootProcess?.pid
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error('Owned Electron process tree requires a positive root PID')
  }
  const isRootRunning = () => rootProcess.exitCode === null && rootProcess.signalCode === null

  if (platform !== 'win32') {
    return createCloseAndConfirmTreeController({
      pid,
      identity: `posix-process-group:${pid}`,
      isRootRunning,
      requestGracefulClose: requestGracefulClose
        ?? (() => signalPosixProcessGroup(pid, 'SIGTERM')),
      forceOwnedTree: () => signalPosixProcessGroup(pid, 'SIGKILL'),
      isOwnedTreeAbsent: () => isPosixProcessGroupAbsent(pid),
      outputSummary,
    })
  }

  const tree = await createWindowsOwnedProcessTree(pid)
  return createCloseAndConfirmTreeController({
    pid,
    identity: tree.identity,
    isRootRunning,
    requestGracefulClose: requestGracefulClose ?? tree.requestDefaultGracefulClose,
    forceOwnedTree: tree.forceOwnedTree,
    refreshOwnedTree: tree.refreshOwnedTree,
    isOwnedTreeAbsent: tree.isOwnedTreeAbsent,
    outputSummary,
  })
}
