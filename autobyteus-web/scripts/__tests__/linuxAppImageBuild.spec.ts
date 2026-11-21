// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const electronBuilder = vi.hoisted(() => ({ build: vi.fn(), cacheDuringBuild: [] as (string | undefined)[] }))
const runtime = vi.hoisted(() => ({ prepare: vi.fn(), assert: vi.fn() }))

vi.mock('electron-builder', () => ({
  Arch: { x64: 1, arm64: 3 },
  Platform: { LINUX: { name: 'linux' } },
  build: electronBuilder.build,
}))
vi.mock('../../build/scripts/arm64AppImageRuntime', () => ({
  prepareArm64AppImageToolset: runtime.prepare,
  assertArm64AppImageRuntime: runtime.assert,
}))

import { buildLinuxAppImage } from '../../build/scripts/linuxAppImageBuild'

describe('buildLinuxAppImage', () => {
  const config = { appId: 'com.autobyteus.app' }
  let previousCache: string | undefined

  beforeEach(() => {
    previousCache = process.env.ELECTRON_BUILDER_CACHE
    process.env.ELECTRON_BUILDER_CACHE = '/user/cache'
    electronBuilder.cacheDuringBuild = []
    electronBuilder.build.mockReset().mockImplementation(async () => {
      electronBuilder.cacheDuringBuild.push(process.env.ELECTRON_BUILDER_CACHE)
      return ['/out/latest-linux-arm64.yml', '/out/AutoByteus_personal_linux-arm64-1.0.0.AppImage']
    })
    runtime.prepare.mockReset().mockResolvedValue('/prepared/cache')
    runtime.assert.mockReset()
  })

  afterEach(() => {
    if (previousCache === undefined) delete process.env.ELECTRON_BUILDER_CACHE
    else process.env.ELECTRON_BUILDER_CACHE = previousCache
  })

  it('builds x64 with the normal cache and no prepared toolset', async () => {
    await buildLinuxAppImage('x64', config)
    expect(runtime.prepare).not.toHaveBeenCalled()
    expect(runtime.assert).not.toHaveBeenCalled()
    expect(electronBuilder.cacheDuringBuild).toEqual(['/user/cache'])
    const call = electronBuilder.build.mock.calls[0][0]
    expect(call.publish).toBe('never')
    expect([...call.targets.values()][0]).toEqual(new Map([[1, ['AppImage']]]))
  })

  it('builds arm64 with the prepared toolset, asserts the AppImage and restores the cache setting', async () => {
    const artifacts = await buildLinuxAppImage('arm64', config)
    expect(electronBuilder.cacheDuringBuild).toEqual(['/prepared/cache'])
    expect(runtime.assert).toHaveBeenCalledWith('/out/AutoByteus_personal_linux-arm64-1.0.0.AppImage')
    expect(artifacts).toHaveLength(2)
    expect(process.env.ELECTRON_BUILDER_CACHE).toBe('/user/cache')
  })

  it('removes the cache setting after arm64 when it was not set before', async () => {
    delete process.env.ELECTRON_BUILDER_CACHE
    await buildLinuxAppImage('arm64', config)
    expect('ELECTRON_BUILDER_CACHE' in process.env).toBe(false)
  })

  it.each([
    [[] as string[]],
    [['/out/a.AppImage', '/out/b.AppImage']],
  ])('fails arm64 unless electron-builder reports exactly one AppImage (%j)', async (artifacts) => {
    electronBuilder.build.mockResolvedValue(artifacts)
    await expect(buildLinuxAppImage('arm64', config)).rejects.toThrow(/Expected one arm64 AppImage/)
    expect(process.env.ELECTRON_BUILDER_CACHE).toBe('/user/cache')
  })

  it('fails arm64 when the runtime assertion fails, and restores the cache setting', async () => {
    runtime.assert.mockImplementation(() => { throw new Error('not the static runtime') })
    await expect(buildLinuxAppImage('arm64', config)).rejects.toThrow('not the static runtime')
    expect(process.env.ELECTRON_BUILDER_CACHE).toBe('/user/cache')
  })
})

describe('assertArm64AppImageRuntime', () => {
  it('refuses an image that does not start with the pinned static runtime', async () => {
    const { assertArm64AppImageRuntime } = await vi.importActual<typeof import('../../build/scripts/arm64AppImageRuntime')>(
      '../../build/scripts/arm64AppImageRuntime')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arm64-runtime-assert-'))
    try {
      const short = path.join(dir, 'short.AppImage')
      fs.writeFileSync(short, Buffer.from('\x7fELF'))
      expect(() => assertArm64AppImageRuntime(short)).toThrow(/does not start with the pinned static AppImage runtime/)
      const legacy = path.join(dir, 'legacy.AppImage')
      fs.writeFileSync(legacy, Buffer.alloc(2 * 1024 * 1024, 1))
      expect(() => assertArm64AppImageRuntime(legacy)).toThrow(/did not use the prepared arm64 toolset/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
