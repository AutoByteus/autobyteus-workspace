import { build, Arch, Platform, type Configuration } from 'electron-builder'
import { assertArm64AppImageRuntime, prepareArm64AppImageToolset } from './arm64AppImageRuntime'

export type LinuxTargetArch = 'x64' | 'arm64'

/** Builds the Linux AppImage of one arch; returns the artifact paths electron-builder reports. */
export async function buildLinuxAppImage(targetArch: LinuxTargetArch, config: Configuration): Promise<string[]> {
  const builderArch = targetArch === 'arm64' ? Arch.arm64 : Arch.x64
  const buildAppImage = () => build({
    config,
    publish: 'never',
    targets: new Map([[Platform.LINUX, new Map([[builderArch, ['AppImage']]])]]),
  })
  if (targetArch === 'x64') return buildAppImage()

  // arm64: electron-builder reads its toolset folder from ELECTRON_BUILDER_CACHE (see arm64AppImageRuntime.ts).
  // Set only around this build, so the other platform builds of an ALL build use the normal cache.
  const previousCache = process.env.ELECTRON_BUILDER_CACHE
  process.env.ELECTRON_BUILDER_CACHE = await prepareArm64AppImageToolset()
  try {
    const artifacts = await buildAppImage()
    const images = artifacts.filter((file) => file.endsWith('.AppImage'))
    if (images.length !== 1) {
      throw new Error(`Expected one arm64 AppImage from electron-builder, got ${images.length}: ${artifacts.join(', ')}`)
    }
    assertArm64AppImageRuntime(images[0])
    return artifacts
  } finally {
    if (previousCache === undefined) delete process.env.ELECTRON_BUILDER_CACHE
    else process.env.ELECTRON_BUILDER_CACHE = previousCache
  }
}
