import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { PackageStore } from '../package-store.mjs'
import { installPackage, makeStarterRoot, memoryLog, writeState } from './fixtures.mjs'

const facts = { arch: process.arch, nodeModuleVersion: process.versions.modules, systemLevel: 1 }

function store(paths) {
  const log = memoryLog()
  return { log, store: new PackageStore({ root: paths.packagesRoot, builtInDir: paths.builtInPackage, log }) }
}
const state = (paths) => JSON.parse(readFileSync(path.join(paths.packagesRoot, 'state.json'), 'utf8'))

test('a first boot runs the built-in package and records it as current', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  const choice = store(paths).store.choose(facts)
  assert.equal(choice.outcome, 'run')
  assert.deepEqual([choice.package.source, choice.package.version, choice.package.dir], ['builtIn', '1.5.11', paths.builtInPackage])
  assert.deepEqual(state(paths), { current: { source: 'builtIn', version: '1.5.11' } })
})

test('an installed package newer than the built-in one keeps running (AC-006, older image)', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  installPackage(paths, { version: '1.5.12' })
  writeState(paths, { current: { source: 'installed', version: '1.5.12' }, previous: { source: 'builtIn', version: '1.5.11' } })
  const choice = store(paths).store.choose(facts)
  assert.deepEqual([choice.outcome, choice.package.source, choice.package.version], ['run', 'installed', '1.5.12'])
  assert.equal(choice.package.dir, path.join(paths.packagesRoot, 'packages', '1.5.12'))
  assert.equal(state(paths).current.version, '1.5.12')
})

test('a newer image runs its built-in package instead of an older installed one (AC-006, newer image)', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.13' })
  installPackage(paths, { version: '1.5.12' })
  writeState(paths, { current: { source: 'installed', version: '1.5.12' } })
  const choice = store(paths).store.choose(facts)
  assert.deepEqual([choice.outcome, choice.package.source, choice.package.version], ['run', 'builtIn', '1.5.13'])
  assert.deepEqual(state(paths).current, { source: 'builtIn', version: '1.5.13' })
})

test('an installed package that does not fit and an older built-in one give NEEDS_NEW_IMAGE (AC-006 alternate)', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  installPackage(paths, { version: '1.5.12', systemLevel: 2 })
  writeState(paths, { current: { source: 'installed', version: '1.5.12' } })
  const { store: packageStore, log } = store(paths)
  const choice = packageStore.choose(facts)
  assert.equal(choice.outcome, 'needsNewImage')
  assert.equal(choice.newest, '1.5.12')
  assert.equal(choice.message, 'This node already ran 1.5.12; this image can run only 1.5.11. ' +
    'Use an image of version 1.5.12 or newer: autobyteus-docker upgrade --all --tag 1.5.12')
  assert.deepEqual(log.entries[0], { event: 'installed-package-not-chosen', version: '1.5.12',
    reason: 'it needs system level 2, this image provides 1' })
  assert.deepEqual(state(paths).current, { source: 'installed', version: '1.5.12' }, 'state unchanged')
})

test('a built-in version that already ran on a newer image cannot be run by an older image', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  writeState(paths, { current: { source: 'builtIn', version: '1.5.13' } })
  const choice = store(paths).store.choose(facts)
  assert.equal(choice.outcome, 'needsNewImage')
  assert.equal(choice.newest, '1.5.13')
})

test('a missing installed package, or one holding another version, is not run', () => {
  const missing = makeStarterRoot({ builtInVersion: '1.5.11' }).paths
  writeState(missing, { current: { source: 'installed', version: '1.5.12' } })
  assert.equal(store(missing).store.choose(facts).outcome, 'needsNewImage')

  const mislabelled = makeStarterRoot({ builtInVersion: '1.5.11' }).paths
  const folder = installPackage(mislabelled, { version: '1.5.10' })
  renameSync(folder, path.join(mislabelled.packagesRoot, 'packages', '1.5.12'))
  writeState(mislabelled, { current: { source: 'installed', version: '1.5.12' } })
  assert.equal(store(mislabelled).store.choose(facts).outcome, 'needsNewImage')
})

test('rollBackTrial makes the version before the trial current again', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  writeState(paths, {
    current: { source: 'installed', version: '1.5.12' }, previous: { source: 'builtIn', version: '1.5.11' },
    trial: { source: 'installed', version: '1.5.12', previous: { source: 'builtIn', version: '1.5.11' }, dataCopy: false },
  })
  store(paths).store.rollBackTrial()
  assert.deepEqual(state(paths), { current: { source: 'builtIn', version: '1.5.11' }, previous: { source: 'builtIn', version: '1.5.11' } })
})

test('removeLeftovers removes downloads, partial unpacks and self-check folders only', () => {
  const { paths } = makeStarterRoot({ builtInVersion: '1.5.11' })
  const keep = installPackage(paths, { version: '1.5.12' })
  const leftovers = ['downloads/autobyteus-server-1.5.13-linux-x64.tar.gz', 'packages/.1.5.13.partial/dist', 'self-check-ab12/data']
  for (const leftover of leftovers) mkdirSync(path.join(paths.packagesRoot, leftover), { recursive: true })
  writeState(paths, { current: { source: 'installed', version: '1.5.12' } })
  const { store: packageStore, log } = store(paths)
  packageStore.removeLeftovers()
  assert.equal(existsSync(path.join(paths.packagesRoot, 'downloads', 'autobyteus-server-1.5.13-linux-x64.tar.gz')), false)
  assert.equal(existsSync(path.join(paths.packagesRoot, 'packages', '.1.5.13.partial')), false)
  assert.equal(existsSync(path.join(paths.packagesRoot, 'self-check-ab12')), false)
  assert.equal(existsSync(keep), true)
  assert.equal(existsSync(path.join(paths.packagesRoot, 'state.json')), true)
  assert.equal(log.entries.length, 1)
})
