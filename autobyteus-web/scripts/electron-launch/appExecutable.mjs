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

/** Marker file an app build ships in its resources directory (see build/scripts/isolatedLaunchMarker.ts). */
export const ISOLATED_LAUNCH_MARKER_FILE = 'isolated-launch.json'
/** Minimum isolated-launch contract (e2e server env policy + disabled update state) an app must honor. */
export const REQUIRED_ISOLATED_LAUNCH_CONTRACT = 1

export class AppIsolationUnsupportedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AppIsolationUnsupportedError'
    this.code = 'APP_ISOLATION_UNSUPPORTED'
  }
}

export class AppImageExtractionRequiredError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AppImageExtractionRequiredError'
    this.code = 'APPIMAGE_EXTRACTION_REQUIRED'
  }
}

/** Resources directory of a packaged app: `<App>.app/Contents/Resources` or `<unpacked>/resources`. */
export function resourcesDirForExecutable(executablePath) {
  const executableDir = path.dirname(executablePath)
  if (path.basename(executableDir) === 'MacOS' && path.basename(path.dirname(executableDir)) === 'Contents') {
    return path.join(path.dirname(executableDir), 'Resources')
  }
  return path.join(executableDir, 'resources')
}

/**
 * True for a packed AppImage: the `.AppImage` suffix or the type-2 magic (`AI\x02` at byte 8).
 * Only the file header is read; the file is never executed.
 */
export async function isPackedAppImage(executablePath) {
  if (executablePath.toLowerCase().endsWith('.appimage')) return true
  let handle
  try {
    handle = await fs.open(executablePath, 'r')
    const header = Buffer.alloc(11)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    return bytesRead === header.length
      && header[0] === 0x7f && header.subarray(1, 4).toString('latin1') === 'ELF'
      && header[8] === 0x41 && header[9] === 0x49 && header[10] === 0x02
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

/**
 * Gate for isolated launches: the app must be an unpacked build whose resources carry an
 * isolated-launch contract >= REQUIRED_ISOLATED_LAUNCH_CONTRACT. Returns the contract number.
 */
export async function readIsolatedLaunchContract(executablePath) {
  if (await isPackedAppImage(executablePath)) {
    const name = path.basename(executablePath)
    throw new AppImageExtractionRequiredError(
      `${executablePath} is a packed AppImage; its build cannot be checked for isolated-launch support without executing it. `
      + `Extract it first: run \`${name} --appimage-extract\` in a directory you choose, then start with `
      + '`--app <that directory>/squashfs-root/<AutoByteus executable>` (for example squashfs-root/autobyteus), '
      + 'or use --from-worktree/--build.',
    )
  }
  const markerPath = path.join(resourcesDirForExecutable(executablePath), ISOLATED_LAUNCH_MARKER_FILE)
  const unsupported = (reason) => new AppIsolationUnsupportedError(
    `${executablePath} does not support isolated launches (${reason}). Builds before isolated-launch support `
    + 'would pass your production settings to the instance. Use --from-worktree or --build, or update the installed app '
    + 'to a release with isolated-launch support.',
  )
  let raw
  try {
    raw = await fs.readFile(markerPath, 'utf8')
  } catch {
    throw unsupported(`no ${ISOLATED_LAUNCH_MARKER_FILE} in ${path.dirname(markerPath)}`)
  }
  let contract
  try {
    contract = JSON.parse(raw)?.isolatedLaunchContract
  } catch {
    throw unsupported(`${markerPath} is not valid JSON`)
  }
  if (!Number.isInteger(contract)) {
    throw unsupported(`${markerPath} has no integer isolatedLaunchContract`)
  }
  if (contract < REQUIRED_ISOLATED_LAUNCH_CONTRACT) {
    throw unsupported(`isolated-launch contract ${contract} is older than required ${REQUIRED_ISOLATED_LAUNCH_CONTRACT}`)
  }
  return contract
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
