import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { launchPreparedElectronWithPlaywright } from '../playwrightElectronProcessAdapter.mjs'

function preparedLaunch(overrides = {}) {
  const prepared = {
    executablePath: '/artifact/AutoByteus',
    args: ['--test-argument'],
    env: { CALLER_PROVIDER_SENTINEL: 'preserved' },
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    ownsDataRoot: true,
    claim: () => prepared,
    disposeOwnedDataRoot: async () => undefined,
    ...overrides,
  }
  return prepared
}

test('Playwright adapter lets Playwright own launch and exposes its application', async () => {
  const child = Object.assign(new EventEmitter(), {
    pid: 12345,
    exitCode: null,
    signalCode: null,
  })
  const electronApplication = {
    process: () => child,
    firstWindow: async () => ({ id: 'first-window' }),
    close: async () => undefined,
  }
  const launchCalls = []
  const controller = {
    pid: child.pid,
    processTreeIdentity: `test-tree:${child.pid}`,
    isRunning: () => true,
    closeAndConfirmTree: async () => ({ status: 'complete', identity: `test-tree:${child.pid}` }),
  }
  let controllerInput = null
  let claimCount = 0
  const prepared = preparedLaunch({
    claim: () => {
      claimCount += 1
      return prepared
    },
  })

  const session = await launchPreparedElectronWithPlaywright(prepared, {
    launch: async (options) => {
      launchCalls.push(options)
      return electronApplication
    },
  }, {
    createProcessController: async (input) => {
      controllerInput = input
      return controller
    },
  })

  assert.equal(claimCount, 1)
  assert.deepEqual(launchCalls, [{
    executablePath: '/artifact/AutoByteus',
    args: ['--test-argument'],
    env: { CALLER_PROVIDER_SENTINEL: 'preserved' },
  }])
  assert.equal(controllerInput.rootProcess, child)
  assert.equal(session.electronApplication, electronApplication)
  assert.deepEqual(await session.firstWindow(), { id: 'first-window' })
})

test('verified Playwright launch rejection disposes an owned root and preserves the primary error', async () => {
  let disposed = false
  const primaryError = new Error('launch failed without a process handle')
  const prepared = preparedLaunch({
    disposeOwnedDataRoot: async () => { disposed = true },
  })

  let receivedError = null
  try {
    await launchPreparedElectronWithPlaywright(prepared, {
      launch: async () => { throw primaryError },
    })
  } catch (error) {
    receivedError = error
  }
  assert.equal(receivedError, primaryError)
  assert.equal(disposed, true)
})

test('Playwright rejection retains caller-owned roots', async () => {
  let disposeCalled = false
  const prepared = preparedLaunch({
    ownsDataRoot: false,
    disposeOwnedDataRoot: async () => { disposeCalled = true },
  })

  await assert.rejects(
    launchPreparedElectronWithPlaywright(prepared, {
      launch: async () => { throw new Error('launch rejected') },
    }),
    /launch rejected/,
  )
  assert.equal(disposeCalled, false)
})

test('Playwright rejection never replaces its primary error with disposal failure', async () => {
  const primaryError = new Error('primary launch error')
  const cleanupError = new Error('owned root disposal failed')
  const prepared = preparedLaunch({
    disposeOwnedDataRoot: async () => { throw cleanupError },
  })

  let receivedError = null
  try {
    await launchPreparedElectronWithPlaywright(prepared, {
      launch: async () => { throw primaryError },
    })
  } catch (error) {
    receivedError = error
  }
  assert.equal(receivedError, primaryError)
  assert.equal(receivedError.cleanupError, cleanupError)
})
