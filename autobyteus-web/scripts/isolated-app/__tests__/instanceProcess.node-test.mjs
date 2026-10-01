import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildInstanceArgs,
  INSTANCE_MARKER_SWITCH,
  isRecordedInstanceRunning,
  waitForInstanceReady,
} from '../instanceProcess.mjs'

const record = { id: 'iso-9333-abcd', pid: 5150 }

test('instance args carry the control port, occlusion switches and identity marker', () => {
  assert.deepEqual(buildInstanceArgs({ instanceId: 'iso-9333-abcd', controlPort: 9333 }), [
    '--remote-debugging-port=9333',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `${INSTANCE_MARKER_SWITCH}=iso-9333-abcd`,
  ])
})

test('identity guard: absent group, reused pid, marked leader and leaderless live group', async () => {
  assert.equal(await isRecordedInstanceRunning(record, { isGroupAbsent: () => true }), false)
  assert.equal(await isRecordedInstanceRunning(record, {
    isGroupAbsent: () => false,
    isLeaderAlive: () => true,
    readCommand: async () => '/usr/bin/some-other-process --flag',
  }), false)
  assert.equal(await isRecordedInstanceRunning(record, {
    isGroupAbsent: () => false,
    isLeaderAlive: () => true,
    readCommand: async () => `/Applications/AutoByteus.app/Contents/MacOS/AutoByteus ${INSTANCE_MARKER_SWITCH}=iso-9333-abcd`,
  }), true)
  assert.equal(await isRecordedInstanceRunning(record, {
    isGroupAbsent: () => false,
    isLeaderAlive: () => false,
  }), true)
})

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}

test('readiness waits for backend health and the renderer main page', async () => {
  let calls = 0
  const fetchImpl = async (url) => {
    calls += 1
    if (url.endsWith('/rest/health')) return calls < 3 ? jsonResponse({}, false, 503) : jsonResponse({})
    return jsonResponse([
      { type: 'service_worker', url: 'x' },
      { type: 'page', id: 'T1', url: 'file:///app.asar/dist/renderer/index.html#/agents' },
    ])
  }
  const result = await waitForInstanceReady({
    pid: 1, serverPort: 40001, controlPort: 9333, pollMs: 1, timeoutMs: 2000,
    fetchImpl, isGroupAbsent: () => false,
  })
  assert.equal(result.ready, true)
  assert.equal(result.mainPage.id, 'T1')
})

test('readiness reports an early exit and a timeout', async () => {
  const exited = await waitForInstanceReady({
    pid: 1, serverPort: 1, controlPort: 2, pollMs: 1, timeoutMs: 1000,
    fetchImpl: async () => { throw new Error('refused') }, isGroupAbsent: () => true,
  })
  assert.equal(exited.reason, 'exited')
  const timedOut = await waitForInstanceReady({
    pid: 1, serverPort: 1, controlPort: 2, pollMs: 1, timeoutMs: 20,
    fetchImpl: async () => { throw new Error('refused') }, isGroupAbsent: () => false,
  })
  assert.equal(timedOut.reason, 'timeout')
  assert.equal(timedOut.lastState, 'refused')
})
