import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { exitCodeOf, ServerSupervisor } from '../server-supervisor.mjs'
import { freePort, makePackage, memoryLog, tempDir } from './fixtures.mjs'

const envKeys = ['FAKE_SERVER_IGNORE_SIGTERM', 'FAKE_SERVER_CHILD_PID_FILE', 'FAKE_SERVER_EXIT_CODE']
afterEach(() => { for (const key of envKeys) delete process.env[key] })

const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function setUp(limits = {}) {
  const root = tempDir('supervisor-')
  const pkg = { dir: makePackage(path.join(root, 'pkg'), { version: '1.5.11' }), version: '1.5.11', source: 'builtIn' }
  const port = await freePort()
  const log = memoryLog()
  const supervisor = new ServerSupervisor({
    host: '127.0.0.1', port, dataDir: path.join(root, 'data'), socketPath: path.join(root, 'starter.sock'),
    stopMs: limits.stopMs ?? 5_000, portFreeMs: limits.portFreeMs ?? 2_000, log,
  })
  return { root, pkg, port, log, supervisor }
}

async function waitForHealth(port) {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/rest/health`)
      return await response.json()
    } catch { await sleep(50) }
  }
  throw new Error('fake server never answered')
}

test('starts the package with the C4 arguments, its folder as working directory and the starter socket', async () => {
  const { pkg, port, supervisor, root } = await setUp()
  const { pid } = await supervisor.start(pkg)
  const answer = await waitForHealth(port)
  assert.deepEqual(answer.args, ['--host', '127.0.0.1', '--port', String(port), '--data-dir', path.join(root, 'data')])
  assert.equal(answer.cwd, pkg.dir)
  assert.equal(answer.socket, path.join(root, 'starter.sock'))
  assert.ok(pid > 0)
  assert.deepEqual(await supervisor.stop(), { forced: false })
  assert.equal(alive(pid), false)
})

test('reports the server exit with its code, and kills what it left in its process group', async () => {
  const { pkg, root, supervisor, log } = await setUp()
  const pidFile = path.join(root, 'child.pid')
  process.env.FAKE_SERVER_CHILD_PID_FILE = pidFile
  process.env.FAKE_SERVER_EXIT_CODE = '3'
  const { exited } = await supervisor.start(pkg)
  const ended = await exited
  assert.deepEqual(ended, { code: 3, signal: null })
  assert.equal(exitCodeOf(ended), 3)
  const leftover = Number(readFileSync(pidFile, 'utf8'))
  await sleep(100)
  assert.equal(alive(leftover), false, 'the server child in its group was killed')
  assert.equal(log.entries.at(-1).event, 'server-exited')
})

test('a server that ignores SIGTERM is killed with its group after the stop limit', async () => {
  const { pkg, port, supervisor, log } = await setUp({ stopMs: 300 })
  process.env.FAKE_SERVER_IGNORE_SIGTERM = '1'
  const { pid } = await supervisor.start(pkg)
  await waitForHealth(port)
  assert.deepEqual(await supervisor.stop(), { forced: true })
  assert.equal(alive(pid), false)
  assert.ok(log.entries.some((entry) => entry.event === 'server-stop-timeout'))
})

test('a start waits for the server port to be free, then starts anyway after the limit', async () => {
  const { pkg, port, supervisor, log } = await setUp({ portFreeMs: 400 })
  const blocker = net.createServer().listen(port, '127.0.0.1')
  await new Promise((resolve) => blocker.once('listening', resolve))
  setTimeout(() => blocker.close(), 200)
  const started = Date.now()
  await supervisor.start(pkg)
  assert.ok(Date.now() - started >= 150, 'waited for the port')
  assert.ok(!log.entries.some((entry) => entry.event === 'server-port-still-in-use'))
  await supervisor.stop()
})

test('exitCodeOf reports a signal as 128 + its number', () => {
  assert.equal(exitCodeOf({ code: null, signal: 'SIGKILL' }), 137)
  assert.equal(exitCodeOf({ code: 0, signal: null }), 0)
})
