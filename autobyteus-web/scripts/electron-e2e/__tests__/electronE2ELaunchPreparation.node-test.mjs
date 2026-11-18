import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { hostElectronBuildScript, prepareElectronE2ELaunch } from '../electronE2ELaunchPreparation.mjs'

test('maps each host platform to its own build script, never the all-platform one', () => {
  assert.equal(hostElectronBuildScript('darwin'), 'build:electron:mac')
  assert.equal(hostElectronBuildScript('linux'), 'build:electron:linux')
  assert.equal(hostElectronBuildScript('win32'), 'build:electron:windows')
})

test('refuses a platform without a build script and names it', () => {
  assert.throws(() => hostElectronBuildScript('freebsd'), /"freebsd"/)
})

test('every mapped script exists in package.json', async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL('../../../package.json', import.meta.url), 'utf8'))
  for (const platform of ['darwin', 'linux', 'win32']) {
    assert.ok(packageJson.scripts[hostElectronBuildScript(platform)], `${platform} script is declared`)
  }
})

// The build is a real child process: a recording shell script stands in for the package manager.
const posixOnly = { skip: process.platform === 'win32' }

async function recordingPackageManager(directory) {
  const record = path.join(directory, 'args.txt')
  const script = path.join(directory, 'fake-pnpm')
  await fs.writeFile(script, `#!/bin/sh\necho "$@" > "${record}"\n`, { mode: 0o755 })
  return { script, record }
}

test('builds with the script of the requested platform before preparing the launch', posixOnly, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'electron-e2e-prep-'))
  try {
    const { script, record } = await recordingPackageManager(directory)
    // Nothing is compiled in this empty web root, so preparation stops right after the build.
    await assert.rejects(
      prepareElectronE2ELaunch({ webRoot: directory, packageManager: script, platform: 'darwin' }),
      /Compiled Electron launch-profile boundaries are missing/,
    )
    assert.equal((await fs.readFile(record, 'utf8')).trim(), 'build:electron:mac')
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test('skips the build when build is false', posixOnly, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'electron-e2e-prep-'))
  try {
    const { script, record } = await recordingPackageManager(directory)
    await assert.rejects(
      prepareElectronE2ELaunch({ webRoot: directory, packageManager: script, platform: 'darwin', build: false }),
      /Compiled Electron launch-profile boundaries are missing/,
    )
    await assert.rejects(fs.access(record))
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
})
