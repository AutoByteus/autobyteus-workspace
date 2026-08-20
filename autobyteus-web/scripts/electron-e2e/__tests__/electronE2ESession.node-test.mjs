import assert from 'node:assert/strict'
import net from 'node:net'
import test from 'node:test'
import { createElectronE2ESession } from '../electronE2ESession.mjs'

function listenOnWildcard() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen({ host: '0.0.0.0', port: 0, exclusive: true }, () => resolve(server))
  })
}

function closeServer(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function controller(overrides = {}) {
  return {
    processTreeIdentity: 'test-tree:52',
    isRunning: () => true,
    closeAndConfirmTree: async () => ({
      status: 'complete',
      identity: 'test-tree:52',
      forced: false,
    }),
    ...overrides,
  }
}

test('session disposes its owned root only after affirmative whole-tree completion', async () => {
  const events = []
  const prepared = {
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    disposeOwnedDataRoot: async () => { events.push('dispose-root') },
  }
  const session = createElectronE2ESession(prepared, controller({
    closeAndConfirmTree: async () => {
      events.push('confirm-tree')
      return { status: 'complete', identity: 'test-tree:52', forced: false }
    },
  }))

  const firstCleanup = session.cleanup()
  const secondCleanup = session.cleanup()
  assert.equal(firstCleanup, secondCleanup)
  const result = await firstCleanup
  assert.deepEqual(events, ['confirm-tree', 'dispose-root'])
  assert.equal(result.portObservation.status, 'available')
})

test('session retains the root and fails when whole-tree completion is unconfirmed', async () => {
  let disposed = false
  const prepared = {
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    disposeOwnedDataRoot: async () => { disposed = true },
  }
  const unconfirmedError = Object.assign(new Error('tree remains'), {
    code: 'ELECTRON_E2E_TREE_UNCONFIRMED',
  })
  const session = createElectronE2ESession(prepared, controller({
    closeAndConfirmTree: async () => { throw unconfirmedError },
  }))

  await assert.rejects(session.cleanup(), (error) => error === unconfirmedError)
  assert.equal(disposed, false)
})

test('session rejects a non-affirmative controller result without disposing the root', async () => {
  let disposed = false
  const prepared = {
    port: 0,
    healthUrl: 'http://127.0.0.1:1/rest/health',
    metadata: { port: 0 },
    disposeOwnedDataRoot: async () => { disposed = true },
  }
  const session = createElectronE2ESession(prepared, controller({
    closeAndConfirmTree: async () => ({
      status: 'unconfirmed',
      identity: 'test-tree:52',
    }),
  }))

  await assert.rejects(session.cleanup(), /completion was not affirmative/)
  assert.equal(disposed, false)
})

test('foreign port occupancy is diagnostic and cannot veto owned-root disposal', async () => {
  const foreignServer = await listenOnWildcard()
  try {
    const address = foreignServer.address()
    assert.equal(typeof address, 'object')
    let disposed = false
    const prepared = {
      port: address.port,
      healthUrl: `http://127.0.0.1:${address.port}/rest/health`,
      metadata: { port: address.port },
      disposeOwnedDataRoot: async () => { disposed = true },
    }
    const session = createElectronE2ESession(prepared, controller())

    const result = await session.cleanup()
    assert.equal(disposed, true)
    assert.equal(result.portObservation.status, 'occupied-after-owned-tree-exit')
    assert.equal(foreignServer.listening, true)
  } finally {
    await closeServer(foreignServer)
  }
})
