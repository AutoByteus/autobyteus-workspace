import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { NodeStarter } from '../starter.mjs'
import { freePort, makeStarterRoot, memoryLog, writeState } from './fixtures.mjs'

const CLI = fileURLToPath(new URL('../cli.mjs', import.meta.url))
afterEach(() => { delete process.env.FAKE_SERVER_EXIT_CODE })

/** Runs cli.mjs against a socket: { exitCode, lines }. */
function cli(socket, ...args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { env: { ...process.env, AUTOBYTEUS_STARTER_SOCKET: socket } }, (error, stdout) => {
      resolve({ exitCode: error ? error.code : 0, lines: stdout.trim().split('\n') })
    })
  })
}

async function boot(paths, dataDir) {
  const exits = []
  let exited
  const exitedOnce = new Promise((resolve) => { exited = resolve })
  const log = memoryLog()
  const starter = new NodeStarter({
    paths, limits: { stopMs: 5_000, portFreeMs: 2_000 }, log,
    server: { host: '127.0.0.1', port: await freePort(), dataDir },
    exit: (code) => { exits.push(code); exited(code) },
  })
  const running = starter.run()
  return { starter, running, exits, exitedOnce, log }
}

async function waitFor(check) {
  for (let i = 0; i < 100; i += 1) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('condition not met')
}

test('boots the built-in package, serves its status to cli.mjs, and stops it on request', async () => {
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  const { starter, running, exits } = await boot(paths, dataDir)
  await waitFor(() => existsSync(paths.socket))
  assert.equal(statSync(paths.socket).mode & 0o777, 0o600)
  const { exitCode, lines } = await cli(paths.socket, 'status')
  assert.equal(exitCode, 0)
  assert.equal(lines.length, 1, 'one JSON line')
  const status = JSON.parse(lines[0])
  assert.equal(status.version, '1.5.11')
  assert.equal(status.state, 'running')
  assert.equal(status.server.source, 'builtIn')
  assert.equal(status.update.state, 'idle')
  await starter.stop('SIGTERM')
  await running
  assert.deepEqual(exits, [0])
  assert.equal(existsSync(paths.socket), false)
})

test('the server exit ends the starter with the server exit code', async () => {
  process.env.FAKE_SERVER_EXIT_CODE = '7'
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  const { running, exits } = await boot(paths, dataDir)
  await running
  assert.deepEqual(exits, [7])
})

test('NEEDS_NEW_IMAGE: no server runs, the starter stays up and its status says which image is needed', async () => {
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  writeState(paths, { current: { source: 'builtIn', version: '1.5.13' } })
  const { starter, running, exits, log } = await boot(paths, dataDir)
  await running
  assert.deepEqual(exits, [], 'still running')
  const { exitCode, lines } = await cli(paths.socket, 'status')
  assert.equal(exitCode, 0)
  const status = JSON.parse(lines[0])
  assert.equal(status.state, 'needsNewImage')
  assert.equal(status.version, '1.5.13')
  assert.equal(status.server, undefined)
  assert.match(status.message, /autobyteus-docker upgrade --all --tag 1\.5\.13$/)
  assert.ok(log.entries.some((entry) => entry.event === 'needs-new-image' && entry.code === 'NEEDS_NEW_IMAGE'))
  await starter.stop('SIGTERM')
  assert.deepEqual(exits, [0])
})

test('boot rolls back an interrupted trial, restores its data copy and records INTERRUPTED', async () => {
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  mkdirSync(path.join(dataDir, 'db'), { recursive: true })
  writeFileSync(path.join(dataDir, 'db', 'app.db'), 'migrated by 1.5.12')
  writeFileSync(path.join(dataDir, 'new-file'), 'written by 1.5.12')
  const copy = path.join(paths.packagesRoot, 'data-copy')
  mkdirSync(path.join(copy, 'db'), { recursive: true })
  writeFileSync(path.join(copy, 'db', 'app.db'), 'as before the update')
  mkdirSync(path.join(paths.packagesRoot, 'downloads'), { recursive: true })
  writeFileSync(path.join(paths.packagesRoot, 'downloads', 'leftover.tar.gz'), 'x')
  writeState(paths, {
    current: { source: 'installed', version: '1.5.12' },
    trial: { source: 'installed', version: '1.5.12', previous: { source: 'builtIn', version: '1.5.11' }, dataCopy: true },
  })
  writeFileSync(path.join(paths.packagesRoot, 'update.json'), JSON.stringify({ state: 'running', targetVersion: '1.5.12', step: 'confirm' }))

  const { starter, running, exits } = await boot(paths, dataDir)
  await waitFor(() => existsSync(paths.socket))
  assert.equal(readFileSync(path.join(dataDir, 'db', 'app.db'), 'utf8'), 'as before the update')
  assert.equal(existsSync(path.join(dataDir, 'new-file')), false)
  assert.equal(existsSync(copy), false, 'the copy is deleted after the restore')
  assert.equal(existsSync(path.join(paths.packagesRoot, 'downloads', 'leftover.tar.gz')), false)
  const state = JSON.parse(readFileSync(path.join(paths.packagesRoot, 'state.json'), 'utf8'))
  assert.deepEqual(state.current, { source: 'builtIn', version: '1.5.11' })
  assert.equal(state.trial, undefined)
  const status = JSON.parse((await cli(paths.socket, 'status')).lines[0])
  assert.equal(status.version, '1.5.11')
  assert.deepEqual([status.update.state, status.update.code, status.update.targetVersion], ['failed', 'INTERRUPTED', '1.5.12'])
  await starter.stop('SIGTERM')
  await running
  assert.deepEqual(exits, [0])
})

test('without a trial, boot deletes a partial data copy and marks a running update INTERRUPTED', async () => {
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(path.join(dataDir, 'keep'), 'data')
  mkdirSync(path.join(paths.packagesRoot, 'data-copy'), { recursive: true })
  writeFileSync(path.join(paths.packagesRoot, 'update.json'), JSON.stringify({ state: 'running', targetVersion: '1.5.12', step: 'download' }))
  const { starter, running } = await boot(paths, dataDir)
  await waitFor(() => existsSync(paths.socket))
  assert.equal(existsSync(path.join(paths.packagesRoot, 'data-copy')), false)
  assert.equal(readFileSync(path.join(dataDir, 'keep'), 'utf8'), 'data')
  const update = JSON.parse(readFileSync(path.join(paths.packagesRoot, 'update.json'), 'utf8'))
  assert.deepEqual([update.state, update.code], ['failed', 'INTERRUPTED'])
  await starter.stop('SIGTERM')
  await running
})

test('cli.mjs: an unknown command and an unreachable starter are errors with one JSON line', async () => {
  const unknown = await cli('/nonexistent/starter.sock', 'update')
  assert.equal(unknown.exitCode, 1)
  assert.deepEqual(JSON.parse(unknown.lines[0]), { message: 'Usage: cli.mjs status' })
  const unreachable = await cli('/nonexistent/starter.sock', 'status')
  assert.equal(unreachable.exitCode, 1)
  assert.match(JSON.parse(unreachable.lines[0]).message, /^Cannot reach the starter at \/nonexistent\/starter.sock: /)
})

test('the socket answers 400 INVALID_VERSION for a target that is not a release version', async () => {
  const { paths, dataDir } = makeStarterRoot({ builtInVersion: '1.5.11' })
  const { starter, running } = await boot(paths, dataDir)
  await waitFor(() => existsSync(paths.socket))
  const http = await import('node:http')
  const answer = await new Promise((resolve) => {
    http.get({ socketPath: paths.socket, path: '/status?target=latest' }, (response) => {
      let text = ''
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => resolve({ statusCode: response.statusCode, body: JSON.parse(text) }))
    })
  })
  assert.equal(answer.statusCode, 400)
  assert.equal(answer.body.code, 'INVALID_VERSION')
  await starter.stop('SIGTERM')
  await running
})
