import { createElectronE2ESession } from './electronE2ESession.mjs'

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
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

export async function launchPreparedElectronWithPlaywright(preparedLaunch, electronLauncher) {
  const prepared = preparedLaunch.claim('Playwright adapter')
  let electronApplication = null
  let controller = null
  try {
    electronApplication = await electronLauncher.launch({
      executablePath: prepared.executablePath,
      args: prepared.args,
      env: prepared.env,
    })
    const child = electronApplication.process()
    controller = Object.freeze({
      pid: child?.pid,
      electronApplication,
      firstWindow: (...args) => electronApplication.firstWindow(...args),
      isRunning: () => !!child && child.exitCode === null && child.signalCode === null,
      waitForExit: (timeoutMs) => waitForExit(child, timeoutMs),
      closeGracefully: async () => electronApplication.close(),
      outputSummary: () => '',
    })
    return Object.freeze({
      ...createElectronE2ESession(prepared, controller),
      electronApplication,
      firstWindow: controller.firstWindow,
    })
  } catch (error) {
    if (electronApplication) {
      const child = electronApplication.process()
      const failedLaunchController = controller ?? Object.freeze({
        pid: child?.pid,
        isRunning: () => !!child && child.exitCode === null && child.signalCode === null,
        waitForExit: (timeoutMs) => waitForExit(child, timeoutMs),
        closeGracefully: async () => electronApplication.close(),
        outputSummary: () => '',
      })
      await createElectronE2ESession(prepared, failedLaunchController).cleanup()
    }
    // If Playwright rejects without returning an application/process handle, retain an
    // owned root rather than deleting storage that an unobservable child might still use.
    throw error
  }
}
