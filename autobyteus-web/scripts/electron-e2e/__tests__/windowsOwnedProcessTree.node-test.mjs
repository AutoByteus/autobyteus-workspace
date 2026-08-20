import assert from 'node:assert/strict'
import test from 'node:test'
import { createCloseAndConfirmTreeController } from '../ownedElectronProcessTree.mjs'
import { createWindowsOwnedProcessTree } from '../windowsOwnedProcessTree.mjs'

const processEntry = (pid, parentPid, createdAt) => ({ pid, parentPid, createdAt })

function snapshotSequence(...snapshots) {
  let index = 0
  return async () => snapshots[Math.min(index++, snapshots.length - 1)]
}

test('Windows cleanup fails closed when a late child remains after the root exits', async () => {
  const terminatedPids = []
  const tree = await createWindowsOwnedProcessTree(41, {
    listProcesses: snapshotSequence(
      [processEntry(41, 1, 'root-created-at')],
      [processEntry(52, 41, 'late-child-created-at')],
    ),
    terminateProcessTree: async (pid) => { terminatedPids.push(pid) },
    captureTimeoutMs: 1,
  })
  const controller = createCloseAndConfirmTreeController({
    pid: 41,
    identity: tree.identity,
    isRootRunning: () => false,
    requestGracefulClose: async () => undefined,
    forceOwnedTree: tree.forceOwnedTree,
    refreshOwnedTree: tree.refreshOwnedTree,
    isOwnedTreeAbsent: tree.isOwnedTreeAbsent,
  })

  await assert.rejects(
    controller.closeAndConfirmTree({ gracefulTimeoutMs: 1, forceTimeoutMs: 1 }),
    (error) => (
      error.code === 'ELECTRON_E2E_TREE_UNCONFIRMED'
      && error.message.includes('captured root disappeared')
    ),
  )
  assert.deepEqual(terminatedPids, [])
})

test('Windows cleanup never targets a reused root PID with another creation identity', async () => {
  const terminatedPids = []
  const tree = await createWindowsOwnedProcessTree(41, {
    listProcesses: snapshotSequence(
      [processEntry(41, 1, 'owned-root-created-at')],
      [processEntry(41, 1, 'foreign-reuse-created-at')],
    ),
    terminateProcessTree: async (pid) => { terminatedPids.push(pid) },
    captureTimeoutMs: 1,
  })

  await tree.requestDefaultGracefulClose()
  await assert.rejects(
    tree.isOwnedTreeAbsent(),
    (error) => error.code === 'ELECTRON_E2E_WINDOWS_TREE_HISTORY_UNCONFIRMED',
  )
  assert.deepEqual(terminatedPids, [])
})

test('Windows cleanup accepts root absence only after targeting the captured creation identity', async () => {
  const terminatedPids = []
  let terminated = false
  const tree = await createWindowsOwnedProcessTree(41, {
    listProcesses: async () => terminated
      ? [processEntry(41, 1, 'foreign-reuse-created-at')]
      : [processEntry(41, 1, 'owned-root-created-at')],
    terminateProcessTree: async (pid) => {
      terminatedPids.push(pid)
      terminated = true
    },
    captureTimeoutMs: 1,
  })

  await tree.requestDefaultGracefulClose()
  assert.equal(await tree.isOwnedTreeAbsent(), true)
  assert.deepEqual(terminatedPids, [41])
})
