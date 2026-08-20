import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildElectronE2ELaunchEnvironment } from './electronE2EEnvironment.mjs'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const defaultWebRoot = path.resolve(moduleDir, '..', '..')
const require = createRequire(import.meta.url)

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`))
    })
  })
}

function loadCompiledLaunchBoundaries(webRoot) {
  const safetyPath = path.join(webRoot, 'dist', 'electron', 'launch-profile', 'e2eDataRootSafety.js')
  if (!fsSync.existsSync(safetyPath)) {
    throw new Error('Compiled Electron launch-profile boundaries are missing; build or transpile this worktree first')
  }
  return { safety: require(safetyPath) }
}

function defaultProtectedPaths(sourceEnv, platform) {
  const home = sourceEnv.HOME || os.homedir()
  const roots = [path.join(home, '.autobyteus')]
  if (platform === 'darwin') {
    roots.push(
      path.join(home, 'Library', 'Application Support', 'autobyteus'),
      path.join(home, 'Library', 'Application Support', 'AutoByteus'),
      path.join(home, 'Library', 'Logs', 'AutoByteus'),
    )
  } else if (platform === 'linux') {
    const configHome = sourceEnv.XDG_CONFIG_HOME || path.join(home, '.config')
    roots.push(path.join(configHome, 'autobyteus'), path.join(configHome, 'AutoByteus'))
  } else if (platform === 'win32') {
    const appData = sourceEnv.APPDATA || path.join(home, 'AppData', 'Roaming')
    roots.push(path.join(appData, 'autobyteus'), path.join(appData, 'AutoByteus'))
  }
  return roots
}

async function selectListenerPort(requestedPort) {
  if (requestedPort !== undefined) {
    const port = Number(requestedPort)
    if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 29695) {
      throw new Error('Requested E2E port must be an integer from 1024..65535 other than 29695')
    }
    await assertPortAvailable(port)
    return port
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await new Promise((resolve, reject) => {
      const server = net.createServer()
      server.once('error', reject)
      server.listen({ host: '0.0.0.0', port: 0, exclusive: true }, () => {
        const address = server.address()
        const selected = typeof address === 'object' && address ? address.port : 0
        server.close((error) => error ? reject(error) : resolve(selected))
      })
    })
    if (port !== 29695 && port >= 1024) return port
  }
  throw new Error('Unable to allocate a non-default E2E listener port')
}

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', (error) => reject(
      new Error(`Requested E2E listener port ${port} is unavailable: ${error.message}`),
    ))
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      server.close((error) => error ? reject(error) : resolve())
    })
  })
}

async function walkFiles(rootPath, maxDepth, visit, depth = 0) {
  if (depth > maxDepth || !fsSync.existsSync(rootPath)) return
  for (const entry of await fs.readdir(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) await walkFiles(entryPath, maxDepth, visit, depth + 1)
    else if (entry.isFile()) visit(entryPath)
  }
}

async function discoverPackagedExecutable(webRoot, explicitPath, platform, arch) {
  if (explicitPath) {
    const canonical = await fs.realpath(path.resolve(explicitPath))
    const stat = await fs.stat(canonical)
    if (!stat.isFile()) throw new Error(`Packaged Electron executable is not a file: ${canonical}`)
    return canonical
  }

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
    throw new Error(
      `Expected exactly one current-worktree packaged executable for ${platform}/${arch}; found ${viable.length}`,
    )
  }
  return fs.realpath(viable[0])
}

async function createOrResolveDataRoot({ safety, requestedRoot, protectedPaths }) {
  if (requestedRoot) {
    const safeRoot = safety.resolveExistingSafeE2EDataRoot({
      selectedPath: path.resolve(requestedRoot),
      protectedPaths,
    })
    return { safeRoot, ownsDataRoot: false }
  }

  const safeTempParent = safety.resolveExistingSafeE2EDataRoot({
    selectedPath: await fs.realpath(os.tmpdir()),
    protectedPaths,
  })
  const parentPath = safety.getResolvedSafeE2EDataRootPath(safeTempParent)
  const createdRoot = await fs.mkdtemp(path.join(parentPath, 'autobyteus-e2e-'))
  await fs.chmod(createdRoot, 0o700)
  try {
    return {
      safeRoot: safety.resolveExistingSafeE2EDataRoot({
        selectedPath: createdRoot,
        protectedPaths,
      }),
      ownsDataRoot: true,
    }
  } catch (error) {
    await fs.rm(createdRoot, { recursive: true, force: true })
    throw error
  }
}

export async function prepareElectronE2ELaunch(options = {}) {
  const webRoot = path.resolve(options.webRoot ?? defaultWebRoot)
  if (options.build !== false) {
    await runCommand(options.packageManager ?? 'pnpm', ['build:electron'], webRoot)
  }
  const { safety } = loadCompiledLaunchBoundaries(webRoot)
  const platform = options.platform ?? process.platform
  const arch = options.arch ?? process.arch
  const sourceEnv = options.sourceEnv ?? process.env
  const protectedPaths = options.protectedPaths ?? defaultProtectedPaths(sourceEnv, platform)
  const executablePath = await discoverPackagedExecutable(
    webRoot,
    options.executablePath,
    platform,
    arch,
  )
  const port = await selectListenerPort(options.port)
  const { safeRoot, ownsDataRoot } = await createOrResolveDataRoot({
    safety,
    requestedRoot: options.dataRoot,
    protectedPaths,
  })
  const dataRoot = safety.getResolvedSafeE2EDataRootPath(safeRoot)

  try {
    const env = buildElectronE2ELaunchEnvironment({
      sourceEnv,
      launch: { port, dataRoot },
      extraEnv: options.extraEnv,
    })
    const clientBaseUrl = `http://127.0.0.1:${port}`
    let state = 'prepared'
    let disposed = false
    const disposeOwnedDataRoot = async () => {
      if (disposed || !ownsDataRoot) return
      disposed = true
      await fs.rm(dataRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    }
    const prepared = {
      executablePath,
      args: Object.freeze([...(options.args ?? [])]),
      env,
      port,
      dataRoot,
      ownsDataRoot,
      clientBaseUrl,
      healthUrl: `${clientBaseUrl}/rest/health`,
      claim(adapterName) {
        if (state !== 'prepared') {
          throw new Error(`Prepared Electron E2E launch has already been ${state}`)
        }
        state = `claimed by ${adapterName}`
        return prepared
      },
      getClaimState() {
        return state
      },
      disposeOwnedDataRoot,
      metadata: Object.freeze({
        executablePath,
        port,
        dataRoot,
        ownsDataRoot,
        clientBaseUrl,
        healthUrl: `${clientBaseUrl}/rest/health`,
      }),
    }
    return Object.freeze(prepared)
  } catch (error) {
    if (ownsDataRoot) await fs.rm(dataRoot, { recursive: true, force: true })
    throw error
  }
}
