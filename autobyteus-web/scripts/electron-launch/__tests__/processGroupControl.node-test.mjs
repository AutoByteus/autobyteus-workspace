import assert from 'node:assert/strict'
import test from 'node:test'
import { createCloseAndConfirmTreeController } from '../processGroupControl.mjs'

function controllerFixture(overrides = {}) {
  return createCloseAndConfirmTreeController({
    pid: 41,
    identity: 'test-owned-tree:41',
    isRootRunning: () => false,
    requestGracefulClose: async () => undefined,
    forceOwnedTree: async () => undefined,
    isOwnedTreeAbsent: async () => true,
    ...overrides,
  })
}

test('whole-tree controller waits for a delayed descendant after the root has exited', async () => {
  let descendantAlive = true
  let forceCalls = 0
  const controller = controllerFixture({
    requestGracefulClose: async () => {
      setTimeout(() => { descendantAlive = false }, 20)
    },
    forceOwnedTree: async () => { forceCalls += 1 },
    isOwnedTreeAbsent: async () => !descendantAlive,
  })

  const completion = await controller.closeAndConfirmTree({
    gracefulTimeoutMs: 100,
    forceTimeoutMs: 20,
  })
  assert.equal(completion.status, 'complete')
  assert.equal(completion.forced, false)
  assert.equal(forceCalls, 0)
})

test('whole-tree controller force-escalates the same owned tree when a descendant ignores graceful close', async () => {
  let descendantAlive = true
  let forceCalls = 0
  const controller = controllerFixture({
    forceOwnedTree: async () => {
      forceCalls += 1
      descendantAlive = false
    },
    isOwnedTreeAbsent: async () => !descendantAlive,
  })

  const firstCleanup = controller.closeAndConfirmTree({
    gracefulTimeoutMs: 5,
    forceTimeoutMs: 50,
  })
  const secondCleanup = controller.closeAndConfirmTree({
    gracefulTimeoutMs: 5,
    forceTimeoutMs: 50,
  })
  assert.equal(firstCleanup, secondCleanup)
  const completion = await firstCleanup
  assert.equal(completion.status, 'complete')
  assert.equal(completion.forced, true)
  assert.equal(forceCalls, 1)
})

test('whole-tree controller fails when absence cannot be confirmed', async () => {
  const controller = controllerFixture({
    isOwnedTreeAbsent: async () => false,
  })

  await assert.rejects(
    controller.closeAndConfirmTree({ gracefulTimeoutMs: 1, forceTimeoutMs: 1 }),
    (error) => (
      error.code === 'ELECTRON_PROCESS_TREE_UNCONFIRMED'
      && error.treeIdentity === 'test-owned-tree:41'
    ),
  )
})

test('POSIX process-group controller closes a detached group owned by an earlier invocation', {
  skip: process.platform === 'win32',
}, async () => {
  const { spawn } = await import('node:child_process')
  const { createPosixProcessGroupController } = await import('../processGroupControl.mjs')
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  await new Promise((resolve) => child.once('spawn', resolve))

  const controller = createPosixProcessGroupController(child.pid)
  assert.equal(controller.isRunning(), true)
  const completion = await controller.closeAndConfirmTree({ gracefulTimeoutMs: 2000, forceTimeoutMs: 1000 })
  assert.equal(completion.status, 'complete')
  assert.equal(completion.identity, `posix-process-group:${child.pid}`)
  assert.equal(controller.isRunning(), false)
})
