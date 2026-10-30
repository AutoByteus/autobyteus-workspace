// The in-place update (DS-006, DS-007, UpdateService gates) end to end inside one NodeStarter: real
// child processes for the servers and the self-check, a local release source, real tar archives, and
// descriptions signed with the fixture key. Each case records what the node runs before and after.
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'
import { NodeStarter } from '../starter.mjs'
import { freePort, makeStarterRoot, memoryLog, publishPackage, runCli, startReleaseSource, waitFor, writeState } from './fixtures.mjs'

const LIMITS = { stopMs: 5_000, portFreeMs: 3_000, selfCheckMs: 5_000, confirmHealthMs: 5_000, confirmAliveMs: 1_500, spareBytes: 0 }
const starters = []
after(async () => { for (const starter of starters) await starter.stop('SIGTERM') })

async function boot(node, source, limits = LIMITS) {
  const exits = []
  const log = memoryLog()
  const port = await freePort()
  const starter = new NodeStarter({
    paths: node.paths, limits, releaseSourceBase: source.base, log,
    server: { host: '127.0.0.1', port, dataDir: node.dataDir },
    exit: (code) => exits.push(code),
  })
  starters.push(starter)
  const running = starter.run()
  await waitFor(() => existsSync(node.paths.socket))
  return { starter, running, exits, log, port }
}

const status = async (node) => (await runCli(node.paths.socket, 'status')).body
const update = (node, ...args) => runCli(node.paths.socket, 'update', ...args)
const state = (node) => JSON.parse(readFileSync(path.join(node.paths.packagesRoot, 'state.json'), 'utf8'))
const finished = (node) => waitFor(async () => {
  const current = await status(node)
  return ['succeeded', 'failed', 'refused'].includes(current.update.state) ? current : null
}, 30_000)
const serverAnswer = async (port) => (await fetch(`http://127.0.0.1:${port}/rest/health`)).json()
const listOrEmpty = (folder) => {
  try { return readdirSync(folder).sort() } catch { return [] }
}
const packageFolders = (node) => listOrEmpty(path.join(node.paths.packagesRoot, 'packages'))

async function setUp(nodeOptions = {}, sourceOptions = {}) {
  const node = makeStarterRoot({ builtInVersion: '1.5.11', ...nodeOptions })
  const source = await startReleaseSource(sourceOptions)
  after(() => source.close())
  return { node, source }
}

test('AC-001/AC-002: a newer package is downloaded, verified, self-checked and switched to', async () => {
  const { node, source } = await setUp()
  await publishPackage(source, node.privateKey, { version: '1.5.12' })
  const { port, log } = await boot(node, source)
  const before = await status(node)
  const accepted = await update(node, '--version', '1.5.12')
  assert.equal(accepted.exitCode, 0)
  assert.deepEqual(accepted.body, { accepted: true, version: '1.5.12' })
  const after = await finished(node)
  assert.equal(after.update.state, 'succeeded', after.update.message)
  assert.deepEqual([after.version, after.server.source, after.server.packageVersion], ['1.5.12', 'installed', '1.5.12'])
  assert.notEqual(after.server.pid, before.server.pid)
  assert.equal(after.update.requestedFrom, 'host command')
  assert.equal((await serverAnswer(port)).cwd, path.join(node.paths.packagesRoot, 'packages', '1.5.12'))
  assert.deepEqual(state(node), { current: { source: 'installed', version: '1.5.12' }, previous: { source: 'builtIn', version: '1.5.11' } })
  assert.deepEqual(packageFolders(node), ['1.5.12'])
  assert.equal(existsSync(path.join(node.paths.packagesRoot, 'data-copy')), false, 'no migration, no copy')
  assert.ok(log.entries.some((entry) => entry.event === 'self-check-passed'))
  const steps = log.entries.filter((entry) => entry.event.startsWith('update-')).map((entry) => entry.event)
  assert.deepEqual(steps, ['update-requested', 'update-started', 'update-succeeded'])
})

test('an update that brings a data migration copies the data first and deletes the copy once confirmed', async () => {
  const { node, source } = await setUp({ builtInMigrations: ['prisma/one'] })
  writeFileSync(path.join(node.dataDir, 'app.db'), 'before')
  await publishPackage(source, node.privateKey, { version: '1.5.12', dataMigrations: ['prisma/one', 'prisma/two'], behavior: { writeDataFile: 'migrated' } })
  await boot(node, source)
  await update(node, '--version', '1.5.12')
  const after = await finished(node)
  assert.equal(after.update.state, 'succeeded', after.update.message)
  assert.equal(readFileSync(path.join(node.dataDir, 'migrated'), 'utf8'), 'written by the new version')
  assert.equal(existsSync(path.join(node.paths.packagesRoot, 'data-copy')), false)
})

test('AC-004: a new version that fails after the switch is rolled back, with the data as before', async () => {
  const { node, source } = await setUp({ builtInMigrations: ['prisma/one'] })
  writeFileSync(path.join(node.dataDir, 'app.db'), 'before')
  await publishPackage(source, node.privateKey, {
    version: '1.5.12', dataMigrations: ['prisma/one', 'prisma/two'], behavior: { writeDataFile: 'migrated', exitWhenSupervised: 3 },
  })
  const { port, exits } = await boot(node, source)
  await update(node, '--version', '1.5.12')
  const after = await finished(node)
  assert.deepEqual([after.update.state, after.update.code], ['failed', 'FAILED_AFTER_SWITCH'])
  assert.equal(after.update.message, '1.5.12 did not come up (it exited with code 3 before answering its health check); ' +
    '1.5.11 runs again on the data as it was before the update.')
  assert.deepEqual([after.version, after.server.source], ['1.5.11', 'builtIn'])
  assert.equal(existsSync(path.join(node.dataDir, 'migrated')), false, 'data restored')
  assert.equal(readFileSync(path.join(node.dataDir, 'app.db'), 'utf8'), 'before')
  assert.deepEqual(state(node), { current: { source: 'builtIn', version: '1.5.11' } })
  assert.deepEqual(packageFolders(node), [])
  assert.equal(existsSync(path.join(node.paths.packagesRoot, 'data-copy')), false)
  // The rollback is recorded once the old server is started again; it answers a moment later.
  assert.equal((await waitFor(() => serverAnswer(port).catch(() => null))).cwd, node.paths.builtInPackage)
  assert.deepEqual(exits, [], 'the starter stays up')
})

test('refusals before anything changes: the old server keeps serving with the same pid (AC-003, AC-005, AC-013)', async (t) => {
  const { node, source } = await setUp()
  const otherKey = generateKeyPairSync('ed25519').privateKey
  await publishPackage(source, otherKey, { version: '1.5.20' })
  await publishPackage(source, node.privateKey, { version: '1.5.21', tamper: ({ descriptionBytes }) => ({ descriptionBytes: Buffer.from(descriptionBytes.toString().replace('"systemLevel": 1', '"systemLevel": 0')) }) })
  await publishPackage(source, node.privateKey, { version: '1.5.11', publishAs: '1.5.22' })
  await publishPackage(source, node.privateKey, { version: '1.5.23', systemLevel: 2 })
  await publishPackage(source, node.privateKey, { version: '1.5.24', tamper: ({ archiveBytes }) => ({ archiveBytes: Buffer.concat([archiveBytes, Buffer.from('x')]) }) })
  await publishPackage(source, node.privateKey, { version: '1.5.25', tamper: ({ archiveBytes }) => { const changed = Buffer.from(archiveBytes); changed[changed.length - 10] ^= 0xff; return { archiveBytes: changed } } })
  await publishPackage(source, node.privateKey, { version: '1.5.26', behavior: { exitImmediately: 1 } })
  await publishPackage(source, node.privateKey, { version: '1.5.27', describe: (d) => ({ ...d, dataMigrations: ['prisma/not-in-the-archive'] }) })
  await publishPackage(source, node.privateKey, { version: '1.5.28' })
  rmSync(path.join(source.dir, 'v1.5.28', `autobyteus-server-1.5.28-linux-${process.arch}.tar.gz`))
  const { port } = await boot(node, source)
  const before = await status(node)
  const cases = [
    ['1.5.19', 'refused', 'NO_PACKAGE_FOR_VERSION'],
    ['1.5.20', 'refused', 'SIGNATURE_INVALID'],
    ['1.5.21', 'refused', 'SIGNATURE_INVALID'],
    ['1.5.22', 'refused', 'DESCRIPTION_MISMATCH'],
    ['1.5.23', 'refused', 'NEEDS_NEW_IMAGE'],
    ['1.5.24', 'refused', 'ARCHIVE_MISMATCH'],
    ['1.5.25', 'refused', 'ARCHIVE_MISMATCH'],
    ['1.5.26', 'failed', 'SELF_CHECK_FAILED'],
    ['1.5.27', 'refused', 'DESCRIPTION_MISMATCH'],
    ['1.5.28', 'failed', 'DOWNLOAD_FAILED'],
  ]
  for (const [version, outcome, code] of cases) {
    await t.test(`${version}: ${code}`, async () => {
      assert.equal((await update(node, '--version', version)).exitCode, 0, 'accepted, then checked')
      const after = await finished(node)
      assert.deepEqual([after.update.targetVersion, after.update.state, after.update.code], [version, outcome, code], after.update.message)
      assert.deepEqual([after.version, after.server.pid], ['1.5.11', before.server.pid], 'the old server was not touched')
      assert.deepEqual(state(node), { current: { source: 'builtIn', version: '1.5.11' } })
      assert.deepEqual(packageFolders(node), [])
      assert.deepEqual(listOrEmpty(path.join(node.paths.packagesRoot, 'downloads')), [])
      assert.ok(!readdirSync(node.paths.packagesRoot).some((name) => name.startsWith('self-check-')))
      assert.equal((await serverAnswer(port)).status, 'ok')
    })
  }
  assert.ok((await status(node)).update.finishedAt)
})

test('NOT_ENOUGH_SPACE is refused before the stop, with what is needed and free', async () => {
  const { node, source } = await setUp()
  await publishPackage(source, node.privateKey, { version: '1.5.12' })
  await boot(node, source, { ...LIMITS, spareBytes: 1e15 })
  const before = await status(node)
  await update(node, '--version', '1.5.12')
  const after = await finished(node)
  assert.deepEqual([after.update.state, after.update.code], ['refused', 'NOT_ENOUGH_SPACE'])
  assert.match(after.update.message, /needs [\d.]+ GB free on the server-packages volume; [\d.]+ GB is free/)
  assert.equal(after.server.pid, before.server.pid)
})

test('request gates: INVALID_VERSION, NOT_NEWER, UPDATE_RUNNING, and the CLI exit code 2', async () => {
  const { node, source } = await setUp()
  await publishPackage(source, node.privateKey, { version: '1.5.12', behavior: { listenAfterMs: 1_500 } })
  await boot(node, source)
  for (const [args, code] of [
    [['--version', 'latest'], 'INVALID_VERSION'],
    [['--track', 'nightly'], 'INVALID_VERSION'],
    [['--version', '1.5.11'], 'NOT_NEWER'],
    [['--version', '1.5.10'], 'NOT_NEWER'],
  ]) {
    const answer = await update(node, ...args)
    assert.equal(answer.exitCode, 2, args.join(' '))
    assert.equal(answer.body.refused, code)
  }
  assert.equal((await update(node, '--version', '1.5.12')).exitCode, 0)
  const second = await update(node, '--version', '1.5.12')
  assert.deepEqual([second.exitCode, second.body.refused], [2, 'UPDATE_RUNNING'])
  assert.equal((await finished(node)).update.state, 'succeeded')
  assert.equal((await status(node)).update.targetVersion, '1.5.12', 'refused requests leave update.json alone')
})

test('tracks: stable is the latest redirect, beta the newest recognized release in the feed', async () => {
  const { node, source } = await setUp({}, { stable: '1.5.12', feed: ['1.5.13-beta.2', '1.5.13-rc1', '1.5.12', '1.5.13-beta.10'] })
  await boot(node, source)
  // Neither version is published: the run refuses after the answer, which is what this case checks.
  assert.deepEqual((await update(node, '--track', 'stable')).body, { accepted: true, version: '1.5.12' })
  await finished(node)
  assert.deepEqual((await update(node, '--track', 'beta')).body, { accepted: true, version: '1.5.13-beta.10' })
  assert.equal((await finished(node)).update.code, 'NO_PACKAGE_FOR_VERSION')
})

test('NO_PACKAGES_VOLUME: without its own volume the node refuses and says so in its status', async () => {
  const { node, source } = await setUp({ ownVolume: false })
  await publishPackage(source, node.privateKey, { version: '1.5.12' })
  await boot(node, source)
  const before = await status(node)
  assert.equal(before.updateBlocker.code, 'NO_PACKAGES_VOLUME')
  assert.match(before.updateBlocker.message, /Reinstall the launcher, then run: autobyteus-docker upgrade --all$/)
  const answer = await update(node, '--version', '1.5.12')
  assert.deepEqual([answer.exitCode, answer.body.refused, answer.body.message], [2, 'NO_PACKAGES_VOLUME', before.updateBlocker.message])
  assert.equal((await status(node)).update.state, 'idle')
})

test('NEEDS_NEW_IMAGE at boot: the status blocker and a request give the same refusal', async () => {
  const { node, source } = await setUp()
  writeState(node.paths, { current: { source: 'builtIn', version: '1.5.13' } })
  await boot(node, source)
  const current = await status(node)
  assert.equal(current.updateBlocker.code, 'NEEDS_NEW_IMAGE')
  assert.equal(current.updateBlocker.message, current.message)
  const answer = await update(node, '--version', '1.5.14')
  assert.deepEqual([answer.body.refused, answer.body.message], ['NEEDS_NEW_IMAGE', current.message])
})

test('the old server exiting by itself during an update aborts it: SERVER_EXITED_DURING_UPDATE, files removed', async () => {
  const { node, source } = await setUp()
  await publishPackage(source, node.privateKey, { version: '1.5.12', behavior: { listenAfterMs: 3_000 } })
  const { exits, running } = await boot(node, source)
  const before = await status(node)
  await update(node, '--version', '1.5.12')
  await waitFor(async () => (await status(node)).update.step === 'preparing')
  process.kill(before.server.pid, 'SIGKILL')
  await running
  assert.deepEqual(exits, [137])
  const update_ = JSON.parse(readFileSync(path.join(node.paths.packagesRoot, 'update.json'), 'utf8'))
  assert.deepEqual([update_.state, update_.code], ['failed', 'SERVER_EXITED_DURING_UPDATE'])
  assert.deepEqual(packageFolders(node), [])
  assert.ok(!readdirSync(node.paths.packagesRoot).some((name) => name.startsWith('self-check-')))
})

test('a stop during the trial leaves the trial recorded; the next boot rolls it back (INTERRUPTED)', async () => {
  const { node, source } = await setUp({ builtInMigrations: ['prisma/one'] })
  writeFileSync(path.join(node.dataDir, 'app.db'), 'before')
  await publishPackage(source, node.privateKey, {
    version: '1.5.12', dataMigrations: ['prisma/one', 'prisma/two'], behavior: { writeDataFile: 'migrated', listenAfterMs: 1_000 },
  })
  const first = await boot(node, source, { ...LIMITS, confirmAliveMs: 20_000 })
  await update(node, '--version', '1.5.12')
  await waitFor(async () => (await status(node)).update.step === 'confirming')
  await waitFor(() => existsSync(path.join(node.dataDir, 'migrated')))
  await first.starter.stop('SIGTERM')
  assert.deepEqual(first.exits, [0])
  assert.equal(state(node).trial.version, '1.5.12')

  await boot(node, source)
  const after = await status(node)
  assert.deepEqual([after.version, after.update.state, after.update.code], ['1.5.11', 'failed', 'INTERRUPTED'])
  assert.equal(after.update.message, 'The update to 1.5.12 was interrupted; this node runs 1.5.11 again.')
  assert.deepEqual(packageFolders(node), [], 'the interrupted version is removed')
  assert.equal(existsSync(path.join(node.dataDir, 'migrated')), false, 'data restored at boot')
  assert.equal(readFileSync(path.join(node.dataDir, 'app.db'), 'utf8'), 'before')
  assert.equal(state(node).trial, undefined)
})

test('a stop before the point of no return aborts the update: INTERRUPTED, nothing changed', async () => {
  const { node, source } = await setUp()
  await publishPackage(source, node.privateKey, { version: '1.5.12', behavior: { listenAfterMs: 3_000 } })
  const { starter, exits } = await boot(node, source)
  await update(node, '--version', '1.5.12')
  await waitFor(async () => (await status(node)).update.step === 'preparing')
  await starter.stop('SIGTERM')
  assert.deepEqual(exits, [0])
  const update_ = JSON.parse(readFileSync(path.join(node.paths.packagesRoot, 'update.json'), 'utf8'))
  assert.deepEqual([update_.state, update_.code], ['failed', 'INTERRUPTED'])
  assert.deepEqual(state(node), { current: { source: 'builtIn', version: '1.5.11' } })
  assert.deepEqual(packageFolders(node), [])
})
