import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { launchPreparedElectronWithPlaywright } from '../playwrightElectronProcessAdapter.mjs'

test('Playwright adapter claims process-neutral resources and lets Playwright own launch', async () => {
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
  const electronLauncher = {
    launch: async (options) => {
      launchCalls.push(options)
      return electronApplication
    },
  }
  let claimCount = 0
  const prepared = {
    executablePath: '/artifact/AutoByteus',
    args: ['--test-argument'],
    env: { SAFE: '1' },
    port: 31001,
    healthUrl: 'http://127.0.0.1:31001/rest/health',
    metadata: { port: 31001 },
    claim: () => {
      claimCount += 1
      return prepared
    },
    disposeOwnedDataRoot: async () => undefined,
  }

  const session = await launchPreparedElectronWithPlaywright(prepared, electronLauncher)

  assert.equal(claimCount, 1)
  assert.deepEqual(launchCalls, [{
    executablePath: '/artifact/AutoByteus',
    args: ['--test-argument'],
    env: { SAFE: '1' },
  }])
  assert.equal(session.electronApplication, electronApplication)
  assert.deepEqual(await session.firstWindow(), { id: 'first-window' })
})

test('Playwright launch rejection retains an owned root when no process handle is observable', async () => {
  let disposed = false
  const prepared = {
    executablePath: '/artifact/AutoByteus',
    args: [],
    env: {},
    port: 31002,
    healthUrl: 'http://127.0.0.1:31002/rest/health',
    metadata: { port: 31002 },
    claim: () => prepared,
    disposeOwnedDataRoot: async () => { disposed = true },
  }

  await assert.rejects(
    launchPreparedElectronWithPlaywright(prepared, {
      launch: async () => { throw new Error('launch failed without a process handle') },
    }),
    /launch failed without a process handle/,
  )
  assert.equal(disposed, false)
})
