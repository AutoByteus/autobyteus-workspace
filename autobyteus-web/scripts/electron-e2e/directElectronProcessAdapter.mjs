import { spawn } from 'node:child_process'
import { createElectronE2ESession, terminateOwnedProcessTree } from './electronE2ESession.mjs'

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer)
      resolve(true)
    }
    const timer = setTimeout(() => {
      child.removeListener('exit', onExit)
      resolve(false)
    }, timeoutMs)
    child.once('exit', onExit)
  })
}

export async function launchPreparedElectronDirect(preparedLaunch) {
  const prepared = preparedLaunch.claim('direct adapter')
  let child = null
  let controller = null
  try {
    child = spawn(prepared.executablePath, prepared.args, {
      env: prepared.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
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
    controller = Object.freeze({
      pid: child.pid,
      child,
      isRunning: () => child.exitCode === null && child.signalCode === null,
      waitForExit: (timeoutMs) => waitForExit(child, timeoutMs),
      closeGracefully: async () => {
        if (child.pid && child.exitCode === null) {
          await terminateOwnedProcessTree(child.pid, false)
        }
      },
      outputSummary: () => output ? `\nRecent output:\n${output}` : '',
    })
    return createElectronE2ESession(prepared, controller)
  } catch (error) {
    if (controller) {
      await createElectronE2ESession(prepared, controller).cleanup()
    } else if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const failedLaunchController = Object.freeze({
        pid: child.pid,
        isRunning: () => child.exitCode === null && child.signalCode === null,
        waitForExit: (timeoutMs) => waitForExit(child, timeoutMs),
        closeGracefully: async () => terminateOwnedProcessTree(child.pid, false),
        outputSummary: () => '',
      })
      await createElectronE2ESession(prepared, failedLaunchController).cleanup()
    } else {
      await prepared.disposeOwnedDataRoot()
    }
    throw error
  }
}
