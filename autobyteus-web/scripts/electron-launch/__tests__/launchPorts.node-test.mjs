import assert from 'node:assert/strict'
import net from 'node:net'
import test from 'node:test'
import {
  assertPortAvailable,
  isPortAvailable,
  PRODUCTION_SERVER_PORT,
  selectListenerPort,
} from '../launchPorts.mjs'

function listen(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen({ host, port: 0 }, () => resolve(server))
  })
}

test('a loopback-only listener makes the port unavailable', async () => {
  const server = await listen('127.0.0.1')
  const { port } = server.address()
  try {
    assert.equal(await isPortAvailable(port), false)
    await assert.rejects(assertPortAvailable(port), /Requested listener port \d+ is unavailable/)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  assert.equal(await isPortAvailable(port), true)
})

test('selectListenerPort rejects the production port and honours exclusions', async () => {
  await assert.rejects(selectListenerPort(PRODUCTION_SERVER_PORT), /other than 29695/)
  await assert.rejects(selectListenerPort(80), /1024\.\.65535/)
  const port = await selectListenerPort(undefined, { exclude: [9333] })
  assert.ok(port >= 1024 && port !== PRODUCTION_SERVER_PORT && port !== 9333)
})
