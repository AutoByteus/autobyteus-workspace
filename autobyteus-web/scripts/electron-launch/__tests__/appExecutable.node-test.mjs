import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  discoverWorktreeExecutable,
  resolveExplicitExecutable,
  resolveInstalledExecutable,
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
