import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { launchPreparedElectronDirect } from '../directElectronProcessAdapter.mjs'

test('direct adapter spawns the exact artifact in a controllable process tree', async () => {
  const child = Object.assign(new EventEmitter(), {
    pid: 43210,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  })
  let spawnCall = null
  const spawnProcess = (executablePath, args, options) => {
    spawnCall = { executablePath, args, options }
    process.nextTick(() => child.emit('spawn'))
    return child
  }
  let controllerInput = null
  const treeController = {
    pid: child.pid,
    processTreeIdentity: 'test-tree:43210',
    isRunning: () => true,
    closeAndConfirmTree: async () => ({
      status: 'complete',
      identity: 'test-tree:43210',
      forced: false,
    }),
  }
  let disposed = false
  const prepared = {
    executablePath: '/artifact/AutoByteus',
    args: ['--caller-argument'],
    env: { PROVIDER_SENTINEL: 'preserved' },
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    claim: () => prepared,
    disposeOwnedDataRoot: async () => { disposed = true },
  }

  const session = await launchPreparedElectronDirect(prepared, {
    spawnProcess,
    createProcessController: async (input) => {
      controllerInput = input
      return treeController
    },
  })
  assert.equal(spawnCall.executablePath, '/artifact/AutoByteus')
  assert.deepEqual(spawnCall.args, ['--caller-argument'])
  assert.equal(spawnCall.options.env.PROVIDER_SENTINEL, 'preserved')
  assert.equal(spawnCall.options.detached, process.platform !== 'win32')
  assert.equal(controllerInput.rootProcess, child)

  await session.cleanup()
  assert.equal(disposed, true)
})

test('direct launch failure preserves its primary error and retains the root when tree completion fails', async () => {
  const primaryError = new Error('direct spawn failed after assigning a PID')
  const treeError = Object.assign(new Error('owned descendant remains'), {
    code: 'ELECTRON_E2E_TREE_UNCONFIRMED',
  })
  const child = Object.assign(new EventEmitter(), {
    pid: 43211,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  })
  const prepared = {
    executablePath: '/artifact/AutoByteus',
    args: [],
    env: {},
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    claim: () => prepared,
    disposeOwnedDataRoot: async () => {
      throw new Error('root must be retained')
    },
  }
  process.nextTick(() => child.emit('error', primaryError))

  let receivedError = null
  try {
    await launchPreparedElectronDirect(prepared, {
      spawnProcess: () => child,
      createProcessController: async () => ({
        pid: child.pid,
        processTreeIdentity: 'test-tree:43211',
        isRunning: () => false,
        closeAndConfirmTree: async () => { throw treeError },
      }),
    })
  } catch (error) {
    receivedError = error
  }

  assert.equal(receivedError, primaryError)
  assert.equal(receivedError.cleanupError, treeError)
})
