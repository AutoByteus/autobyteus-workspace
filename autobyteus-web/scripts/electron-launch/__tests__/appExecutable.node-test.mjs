import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  discoverWorktreeExecutable,
  isPackedAppImage,
  readIsolatedLaunchContract,
  REQUIRED_ISOLATED_LAUNCH_CONTRACT,
  resolveExplicitExecutable,
  resolveInstalledExecutable,
  resourcesDirForExecutable,
} from '../appExecutable.mjs'

function tempDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'app-executable-test-')))
}

function writeFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, '')
  return filePath
}

test('explicit executable file and macOS .app bundle both resolve to the binary', async (t) => {
  const root = tempDir()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const binary = writeFile(path.join(root, 'Custom.app', 'Contents', 'MacOS', 'AutoByteus'))

  assert.equal(await resolveExplicitExecutable(binary), binary)
  assert.equal(await resolveExplicitExecutable(path.join(root, 'Custom.app')), binary)
})

test('explicit application errors carry APP_NOT_FOUND', async (t) => {
  const root = tempDir()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  await assert.rejects(resolveExplicitExecutable(path.join(root, 'missing')), { code: 'APP_NOT_FOUND' })
  await assert.rejects(resolveExplicitExecutable(root), { code: 'APP_NOT_FOUND' })
})

test('installed application has no default location on Linux', async () => {
  assert.equal(await resolveInstalledExecutable({ platform: 'linux' }), null)
})

test('installed application resolves from ~/Applications on macOS when present', async (t) => {
  const home = tempDir()
  t.after(() => fs.rmSync(home, { recursive: true, force: true }))
  const binary = writeFile(path.join(home, 'Applications', 'AutoByteus.app', 'Contents', 'MacOS', 'AutoByteus'))

  const resolved = await resolveInstalledExecutable({ platform: 'darwin', homeDir: home })
  // /Applications/AutoByteus.app wins when the host has it installed.
  if (!fs.existsSync('/Applications/AutoByteus.app')) assert.equal(resolved, binary)
  else assert.ok(resolved.endsWith('/Contents/MacOS/AutoByteus'))
})

test('worktree discovery requires exactly one packaged executable', async (t) => {
  const webRoot = tempDir()
  t.after(() => fs.rmSync(webRoot, { recursive: true, force: true }))

  await assert.rejects(
    discoverWorktreeExecutable({ webRoot, platform: 'darwin', arch: 'arm64' }),
    { code: 'APP_NOT_FOUND' },
  )
  const binary = writeFile(path.join(
    webRoot, 'electron-dist', 'mac-arm64', 'AutoByteus.app', 'Contents', 'MacOS', 'AutoByteus',
  ))
  assert.equal(await discoverWorktreeExecutable({ webRoot, platform: 'darwin', arch: 'arm64' }), binary)
})

function appWithMarker(root, markerContent, { mac = false } = {}) {
  const executable = mac
    ? writeFile(path.join(root, 'AutoByteus.app', 'Contents', 'MacOS', 'AutoByteus'))
    : writeFile(path.join(root, 'linux-unpacked', 'autobyteus'))
  if (markerContent !== undefined) {
    fs.writeFileSync(path.join(resourcesDirForExecutable(executable), 'isolated-launch.json'), markerContent)
  }
  return executable
}

test('resources directory follows the macOS bundle and Linux unpacked layouts', () => {
  assert.equal(resourcesDirForExecutable('/A/AutoByteus.app/Contents/MacOS/AutoByteus'), '/A/AutoByteus.app/Contents/Resources')
  assert.equal(resourcesDirForExecutable('/opt/linux-unpacked/autobyteus'), '/opt/linux-unpacked/resources')
})

test('isolated-launch gate accepts the required contract and newer ones', async (t) => {
  const root = tempDir()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'AutoByteus.app', 'Contents', 'Resources'), { recursive: true })
  const mac = appWithMarker(root, '{"isolatedLaunchContract": 1}', { mac: true })
  assert.equal(await readIsolatedLaunchContract(mac), REQUIRED_ISOLATED_LAUNCH_CONTRACT)

  const linuxRoot = path.join(root, 'l')
  fs.mkdirSync(path.join(linuxRoot, 'linux-unpacked', 'resources'), { recursive: true })
  assert.equal(await readIsolatedLaunchContract(appWithMarker(linuxRoot, '{"isolatedLaunchContract": 2}')), 2)
})

test('isolated-launch gate refuses missing, malformed, non-integer and lower contracts', async (t) => {
  const cases = [
    ['missing', undefined, /no isolated-launch.json/],
    ['malformed', '{not json', /not valid JSON/],
    ['non-integer', '{"isolatedLaunchContract": "1"}', /no integer isolatedLaunchContract/],
    ['lower', '{"isolatedLaunchContract": 0}', /older than required 1/],
  ]
  for (const [name, content, reason] of cases) {
    const root = tempDir()
    t.after(() => fs.rmSync(root, { recursive: true, force: true }))
    fs.mkdirSync(path.join(root, 'linux-unpacked', 'resources'), { recursive: true })
    const executable = appWithMarker(root, content)
    await assert.rejects(readIsolatedLaunchContract(executable), (error) => (
      error.code === 'APP_ISOLATION_UNSUPPORTED'
      && reason.test(error.message)
      && error.message.includes(executable)
      && error.message.includes('--from-worktree')
    ), name)
  }
})

test('packed AppImages are detected by magic or suffix without being executed', async (t) => {
  const root = tempDir()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const sentinel = path.join(root, 'executed')
  // An executable whose header carries the AppImage type-2 magic; running it would create the sentinel.
  const header = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x41, 0x49, 0x02])
  const byMagic = path.join(root, 'autobyteus')
  fs.writeFileSync(byMagic, Buffer.concat([header, Buffer.from(`\n#!/bin/sh\ntouch ${sentinel}\n`)]))
  fs.chmodSync(byMagic, 0o755)
  const bySuffix = path.join(root, 'AutoByteus_linux-x64-1.5.0.AppImage')
  fs.writeFileSync(bySuffix, `#!/bin/sh\ntouch ${sentinel}\n`)
  fs.chmodSync(bySuffix, 0o755)
  const plainElf = path.join(root, 'plain')
  fs.writeFileSync(plainElf, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00]))

  assert.equal(await isPackedAppImage(byMagic), true)
  assert.equal(await isPackedAppImage(bySuffix), true)
  assert.equal(await isPackedAppImage(plainElf), false)
  for (const appImage of [byMagic, bySuffix]) {
    await assert.rejects(readIsolatedLaunchContract(appImage), (error) => (
      error.code === 'APPIMAGE_EXTRACTION_REQUIRED'
      && error.message.includes(`${path.basename(appImage)} --appimage-extract`)
      && error.message.includes('squashfs-root/')
      && error.message.includes('--from-worktree/--build')
    ))
  }
  assert.equal(fs.existsSync(sentinel), false)
})

test('an extracted AppImage layout goes through the normal marker gate', async (t) => {
  const root = tempDir()
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const executable = writeFile(path.join(root, 'squashfs-root', 'autobyteus'))
  await assert.rejects(readIsolatedLaunchContract(executable), { code: 'APP_ISOLATION_UNSUPPORTED' })
  fs.mkdirSync(path.join(root, 'squashfs-root', 'resources'))
  fs.writeFileSync(path.join(root, 'squashfs-root', 'resources', 'isolated-launch.json'), '{"isolatedLaunchContract": 1}')
  assert.equal(await readIsolatedLaunchContract(executable), 1)
})
