import { createHash } from 'crypto'
import { execFileSync } from 'child_process'
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, writeFileSync } from 'fs'
import * as path from 'path'
import { path7za } from '7zip-bin'
import * as tar from 'tar'

// The Linux arm64 AppImage starts with electron-builder's static AppImage runtime (type2, no shared-library
// dependency) instead of electron-builder 25's legacy runtime-arm64, which needs `libz.so` (zlib's development
// package only) and `libfuse.so.2`, so no stock arm64 desktop could start it (autobyteus-28).
// electron-builder 25 has no option for the runtime: its Go `app-builder` takes the toolset folder
// `$ELECTRON_BUILDER_CACHE/appimage/appimage-12.0.1`, reuses that folder when it exists and prepends its
// `runtime-<arch>` unchanged. So the arm64 build gets a prepared copy of that toolset whose runtime-arm64 is the
// static runtime, and `assertArm64AppImageRuntime` refuses an image that does not start with it.
// An upgrade to electron-builder 26+ replaces all of this with `toolsets.appimage` (FU-003).

const LEGACY_TOOLSET = {
  url: 'https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage-12.0.1/appimage-12.0.1.7z',
  sha256: 'd12ff7eb8f1d1ec4652ca5237a7fbdca33acc0c758045636feca62dc6ecb8ec4',
}
const STATIC_TOOLSET = {
  url: 'https://github.com/electron-userland/electron-builder-binaries/releases/download/appimage%401.0.3/appimage-tools-runtime-20251108.tar.gz',
  sha256: '84021a78ee214ae6fd33a2d62a92ba25542dd10bc86bf117a9b2d0bba44e7665',
}
const STATIC_RUNTIME_ARM64 = {
  member: 'runtimes/runtime-arm64',
  size: 936456,
  sha256: '00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444',
}

// The value for ELECTRON_BUILDER_CACHE: reused across local builds, fresh on a release runner.
const CACHE_ROOT = path.resolve(__dirname, '../../node_modules/.cache/autobyteus-arm64-appimage-toolset')
const TOOLSET_DIR = path.join(CACHE_ROOT, 'appimage', 'appimage-12.0.1')

const sha256 = (data: Buffer): string => createHash('sha256').update(data).digest('hex')

async function downloadVerified(source: { url: string, sha256: string }, file: string): Promise<void> {
  const response = await fetch(source.url)
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${source.url}`)
  const data = Buffer.from(await response.arrayBuffer())
  if (sha256(data) !== source.sha256) throw new Error(`Checksum mismatch: ${source.url}`)
  writeFileSync(file, data)
}

// app-builder reuses any existing folder, so only a folder with the pinned runtime and the arm64 tools counts.
function isPreparedToolset(): boolean {
  const runtime = path.join(TOOLSET_DIR, 'runtime-arm64')
  return existsSync(runtime) && sha256(readFileSync(runtime)) === STATIC_RUNTIME_ARM64.sha256 &&
    existsSync(path.join(TOOLSET_DIR, 'linux-arm64', 'mksquashfs'))
}

/** Ensures the prepared toolset folder exists, complete and verified; returns the value for ELECTRON_BUILDER_CACHE. */
export async function prepareArm64AppImageToolset(): Promise<string> {
  if (isPreparedToolset()) return CACHE_ROOT
  const staging = path.join(CACHE_ROOT, 'appimage', `.appimage-12.0.1.tmp-${process.pid}`)
  const downloads = `${staging}.downloads`
  for (const dir of [staging, downloads]) {
    rmSync(dir, { recursive: true, force: true })
    mkdirSync(dir, { recursive: true })
  }
  try {
    const legacyArchive = path.join(downloads, 'appimage-12.0.1.7z')
    await downloadVerified(LEGACY_TOOLSET, legacyArchive)
    execFileSync(path7za, ['x', '-y', `-o${staging}`, legacyArchive], { stdio: 'pipe' })

    const staticArchive = path.join(downloads, 'appimage-tools-runtime.tar.gz')
    await downloadVerified(STATIC_TOOLSET, staticArchive)
    await tar.x({ file: staticArchive, cwd: downloads }, [`./${STATIC_RUNTIME_ARM64.member}`])
    const runtime = readFileSync(path.join(downloads, STATIC_RUNTIME_ARM64.member))
    if (sha256(runtime) !== STATIC_RUNTIME_ARM64.sha256) throw new Error('Static runtime-arm64 checksum mismatch')
    const installed = path.join(staging, 'runtime-arm64')
    writeFileSync(installed, runtime)
    chmodSync(installed, 0o755)

    // The folder appears only complete: a half-written one would be reused by app-builder.
    rmSync(TOOLSET_DIR, { recursive: true, force: true })
    renameSync(staging, TOOLSET_DIR)
  } finally {
    rmSync(staging, { recursive: true, force: true })
    rmSync(downloads, { recursive: true, force: true })
  }
  if (!isPreparedToolset()) throw new Error(`Prepared AppImage toolset is incomplete: ${TOOLSET_DIR}`)
  return CACHE_ROOT
}

/** Throws unless the AppImage starts with the pinned static runtime, i.e. app-builder used the prepared toolset. */
export function assertArm64AppImageRuntime(imagePath: string): void {
  const prefix = Buffer.alloc(STATIC_RUNTIME_ARM64.size)
  const fd = openSync(imagePath, 'r')
  let read: number
  try {
    read = readSync(fd, prefix, 0, prefix.length, 0)
  } finally {
    closeSync(fd)
  }
  if (read !== prefix.length || sha256(prefix) !== STATIC_RUNTIME_ARM64.sha256) {
    throw new Error(`${imagePath} does not start with the pinned static AppImage runtime: electron-builder did not use the prepared arm64 toolset (autobyteus-28)`)
  }
}
