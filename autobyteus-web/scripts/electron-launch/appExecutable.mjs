import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const MAC_BUNDLE_NAME = 'AutoByteus.app'

export class AppExecutableNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AppExecutableNotFoundError'
    this.code = 'APP_NOT_FOUND'
  }
}

async function walkFiles(rootPath, maxDepth, visit, depth = 0) {
  if (depth > maxDepth || !fsSync.existsSync(rootPath)) return
  for (const entry of await fs.readdir(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) await walkFiles(entryPath, maxDepth, visit, depth + 1)
    else if (entry.isFile()) visit(entryPath)
  }
}

async function statIfPresent(candidate) {
  try {
    return await fs.stat(candidate)
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null
    throw error
  }
}

async function resolveMacBundleExecutable(bundlePath) {
  const macOSDir = path.join(bundlePath, 'Contents', 'MacOS')
  const preferred = path.join(macOSDir, 'AutoByteus')
  if ((await statIfPresent(preferred))?.isFile()) return preferred
  const entries = fsSync.existsSync(macOSDir) ? await fs.readdir(macOSDir) : []
  if (entries.length === 1) return path.join(macOSDir, entries[0])
  throw new AppExecutableNotFoundError(`No application executable found inside ${bundlePath}`)
}

/**
 * Resolve an explicitly given application: an executable file, or on macOS an `.app` bundle.
 */
export async function resolveExplicitExecutable(explicitPath) {
  const resolved = path.resolve(explicitPath)
  const stat = await statIfPresent(resolved)
  if (!stat) throw new AppExecutableNotFoundError(`Application not found: ${resolved}`)
  const canonical = await fs.realpath(resolved)
  if (stat.isDirectory()) {
    if (canonical.endsWith('.app')) return fs.realpath(await resolveMacBundleExecutable(canonical))
    throw new AppExecutableNotFoundError(`Application path is a directory, not an executable: ${canonical}`)
  }
  if (!stat.isFile()) throw new AppExecutableNotFoundError(`Application executable is not a file: ${canonical}`)
  return canonical
}

/**
 * The installed desktop app for this host, or null when the platform has no standard location
 * (Linux AppImage/deb installs vary; callers must pass an explicit application there).
 */
export async function resolveInstalledExecutable({
  platform = process.platform,
  homeDir = os.homedir(),
} = {}) {
  if (platform !== 'darwin') return null
  for (const bundle of [
    path.join('/Applications', MAC_BUNDLE_NAME),
    path.join(homeDir, 'Applications', MAC_BUNDLE_NAME),
  ]) {
    if ((await statIfPresent(bundle))?.isDirectory()) {
      return fs.realpath(await resolveMacBundleExecutable(bundle))
    }
  }
  return null
}

/**
 * The single packaged executable built into `<webRoot>/electron-dist` for this host.
 */
export async function discoverWorktreeExecutable({
  webRoot,
  platform = process.platform,
  arch = process.arch,
}) {
  const distRoot = path.join(webRoot, 'electron-dist')
  const candidates = []
  await walkFiles(distRoot, 6, (candidate) => {
    const normalized = candidate.replaceAll('\\', '/')
    if (platform === 'darwin' && normalized.endsWith('/AutoByteus.app/Contents/MacOS/AutoByteus')) {
      candidates.push(candidate)
    } else if (
      platform === 'linux'
      && /\/linux[^/]*-unpacked\/(AutoByteus|autobyteus)$/.test(normalized)
    ) {
      candidates.push(candidate)
    } else if (platform === 'win32' && /\/win[^/]*-unpacked\/AutoByteus\.exe$/i.test(normalized)) {
      candidates.push(candidate)
    }
  })
  const archToken = platform === 'darwin' ? `/mac-${arch}/` : `-${arch}-unpacked/`
  const preferred = candidates.filter((candidate) => candidate.replaceAll('\\', '/').includes(archToken))
  const viable = preferred.length > 0 ? preferred : candidates
  if (viable.length !== 1) {
    throw new AppExecutableNotFoundError(
      `Expected exactly one current-worktree packaged executable for ${platform}/${arch} under ${distRoot}; found ${viable.length}`,
    )
  }
  return fs.realpath(viable[0])
}
