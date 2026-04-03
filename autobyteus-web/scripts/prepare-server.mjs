#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, stat, writeFile, lstat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LINUX_PRISMA_BINARY_TARGETS = 'debian-openssl-1.1.x,debian-openssl-3.0.x'
const COLORS = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, '..')
const workspaceRoot = path.resolve(webRoot, '..')
const serverSourceRoot = path.resolve(workspaceRoot, 'autobyteus-server-ts')
const targetDir = path.resolve(webRoot, 'resources', 'server')
const stageDir = path.resolve(webRoot, '.server-packaging-stage')
const localPackageDir = path.resolve(stageDir, '_local-packages')

function color(text, value) {
  return `${value}${text}${COLORS.reset}`
}

function info(message) {
  console.log(color(message, COLORS.green))
}

function warn(message) {
  console.log(color(message, COLORS.yellow))
}

function fail(message) {
  console.error(color(message, COLORS.red))
}

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function isWorkspaceDependency(version) {
  return typeof version === 'string' && version.startsWith('workspace:')
}

async function runCommand(command, args, options = {}) {
  const executable = resolveExecutable(command)
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: 'inherit',
      shell: process.platform === 'win32' && executable.endsWith('.cmd'),
    })

    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed (${code}): ${executable} ${args.join(' ')}`))
    })
  })
}

function resolveExecutable(command) {
  if (process.platform !== 'win32') {
    return command
  }
  if (
    command.includes('\\') ||
    command.includes('/') ||
    command.endsWith('.exe') ||
    command.endsWith('.cmd')
  ) {
    return command
  }
  return `${command}.cmd`
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function cleanDirectory(directoryPath) {
  await rm(directoryPath, { recursive: true, force: true })
  await mkdir(directoryPath, { recursive: true })
}

async function copyIfExists(sourcePath, targetPath) {
  if (!(await exists(sourcePath))) {
    return
  }
  await cp(sourcePath, targetPath, { recursive: true, force: true })
}

async function buildWorkspaceArtifacts() {
  warn('\nBuilding server source artifacts...')

  const serverLockfile = path.join(serverSourceRoot, 'pnpm-lock.yaml')
  if (await exists(serverLockfile)) {
    await runCommand('pnpm', ['-C', serverSourceRoot, 'install', '--frozen-lockfile'])
  } else {
    await runCommand('pnpm', ['-C', serverSourceRoot, 'install', '--no-frozen-lockfile'])
  }

  await runCommand('pnpm', ['-C', serverSourceRoot, 'exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'])
  await runCommand('pnpm', ['-C', serverSourceRoot, 'build'])
}

async function deployServerPackageToStage() {
  warn('\nDeploying server package files into staging directory...')

  const workspaceManifest = path.join(workspaceRoot, 'pnpm-workspace.yaml')
  if (await exists(workspaceManifest)) {
    await runCommand('pnpm', ['-C', workspaceRoot, '--filter', 'autobyteus-server-ts', 'deploy', stageDir, '--legacy'])
  } else {
    await runCommand('pnpm', ['-C', serverSourceRoot, 'deploy', stageDir, '--legacy'])
  }

  // Deploy output contains pnpm link graphs; runtime dependencies are rebuilt in staging.
  await rm(path.join(stageDir, 'node_modules'), { recursive: true, force: true })
}

async function getPackedTarballName(outputDirectory, previousEntries) {
  const currentEntries = new Set((await readdir(outputDirectory)).filter(name => name.endsWith('.tgz')))
  const created = [...currentEntries].filter(name => !previousEntries.has(name))
  if (created.length !== 1) {
    throw new Error(`Expected exactly one packed tarball, found ${created.length}`)
  }
  return created[0]
}

async function packWorkspaceDependencies(serverManifest) {
  const dependencyEntries = Object.entries(serverManifest.dependencies ?? {})
  const workspaceDependencies = dependencyEntries.filter(([, version]) => isWorkspaceDependency(version))

  if (workspaceDependencies.length === 0) {
    return {}
  }

  warn('\nPacking local workspace dependencies...')

  const packed = {}
  for (const [packageName] of workspaceDependencies) {
    const packageRoot = path.join(workspaceRoot, packageName)
    if (!(await exists(packageRoot))) {
      throw new Error(`Workspace package not found: ${packageRoot}`)
    }

    const before = new Set((await readdir(localPackageDir)).filter(name => name.endsWith('.tgz')))
    await runCommand('pnpm', ['pack', '--pack-destination', localPackageDir], { cwd: packageRoot })
    const tarballName = await getPackedTarballName(localPackageDir, before)
    packed[packageName] = `file:${toPosixPath(path.join('./_local-packages', tarballName))}`
  }

  return packed
}

async function rewriteStagePackageManifest(localDependencySpecs) {
  const manifestPath = path.join(stageDir, 'package.json')
  const manifest = await readJson(manifestPath)
  const sourceManifest = await readJson(path.join(serverSourceRoot, 'package.json'))

  manifest.dependencies = {
    ...(manifest.dependencies ?? {}),
  }
  for (const [name, spec] of Object.entries(localDependencySpecs)) {
    manifest.dependencies[name] = spec
  }

  // Keep only Prisma CLI in devDependencies for bundled client generation.
  manifest.devDependencies = {}
  if (sourceManifest.devDependencies?.prisma) {
    manifest.devDependencies.prisma = sourceManifest.devDependencies.prisma
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

async function installPortableRuntimeDependencies() {
  warn('\nInstalling portable runtime dependencies...')
  await runCommand('npm', ['install', '--no-audit', '--no-fund'], { cwd: stageDir })

  warn('\nGenerating Prisma client in staging...')
  const prismaEnv = {}
  if (process.platform === 'linux' && !process.env.PRISMA_CLI_BINARY_TARGETS) {
    prismaEnv.PRISMA_CLI_BINARY_TARGETS = LINUX_PRISMA_BINARY_TARGETS
  }
  await runCommand('npx', ['prisma', 'generate', '--schema', 'prisma/schema.prisma'], {
    cwd: stageDir,
    env: prismaEnv,
  })

  warn('\nPruning development dependencies from staging...')
  await runCommand('npm', ['prune', '--omit=dev', '--no-audit', '--no-fund'], { cwd: stageDir })

  await rm(path.join(stageDir, 'package-lock.json'), { force: true })
}

async function removeTestFixtureDirectories(rootPath) {
  const fixtureNames = new Set(['test', 'tests', '__tests__'])

  async function walk(currentPath) {
    const entries = await readdir(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue
      }
      const fullPath = path.join(currentPath, entry.name)
      if (fixtureNames.has(entry.name)) {
        await rm(fullPath, { recursive: true, force: true })
        continue
      }
      await walk(fullPath)
    }
  }

  if (await exists(rootPath)) {
    await walk(rootPath)
  }
}

async function pruneNativePrebuilds(nodePtyPrebuildsPath) {
  if (!(await exists(nodePtyPrebuildsPath))) {
    return
  }

  const keepPrefixByPlatform = {
    win32: 'win32-',
    linux: 'linux-',
    darwin: 'darwin-',
  }
  const keepPrefix = keepPrefixByPlatform[process.platform]
  if (!keepPrefix) {
    return
  }

  const entries = await readdir(nodePtyPrebuildsPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    if (entry.name.startsWith(keepPrefix)) {
      continue
    }
    await rm(path.join(nodePtyPrebuildsPath, entry.name), { recursive: true, force: true })
  }
}

async function assertNoSymlinks(rootPath) {
  const symlinks = []

  async function walk(currentPath) {
    const entries = await readdir(currentPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      const entryStat = await lstat(fullPath)
      if (entryStat.isSymbolicLink()) {
        symlinks.push(fullPath)
        continue
      }
      if (entry.isDirectory()) {
        await walk(fullPath)
      }
    }
  }

  await walk(rootPath)
  if (symlinks.length > 0) {
    const preview = symlinks.slice(0, 20).join('\n')
    throw new Error(`Found ${symlinks.length} symlink/junction entries in packaged node_modules:\n${preview}`)
  }
}

async function validateCriticalImports() {
  warn('\nValidating critical runtime imports...')
  const validationScript = `
import path from 'node:path'
import { pathToFileURL } from 'node:url'

await import('type-graphql')

const serverEntryFile = pathToFileURL(
  path.join(process.cwd(), 'dist', 'index.js')
).href
await import(serverEntryFile)

const parserFile = pathToFileURL(
  path.join(process.cwd(), 'node_modules', 'htmlparser2', 'dist', 'esm', 'Parser.js')
).href
await import(parserFile)

console.log('Runtime dependency import validation passed')
`
  await runCommand(process.execPath, ['--input-type=module', '--eval', validationScript], { cwd: stageDir })
}

async function validateLinuxPrismaEngines(nodeModulesRoot) {
  if (process.platform !== 'linux') {
    return
  }

  warn('\nValidating Linux Prisma engine targets...')
  const enginesDir = path.join(nodeModulesRoot, '@prisma', 'engines')
  if (!(await exists(enginesDir))) {
    throw new Error(`Prisma engines directory not found: ${enginesDir}`)
  }

  const requiredEngines = [
    'libquery_engine-debian-openssl-1.1.x.so.node',
    'libquery_engine-debian-openssl-3.0.x.so.node',
    'schema-engine-debian-openssl-1.1.x',
    'schema-engine-debian-openssl-3.0.x',
  ]
  for (const engineName of requiredEngines) {
    const enginePath = path.join(enginesDir, engineName)
    if (!(await exists(enginePath))) {
      throw new Error(`Missing required Prisma engine: ${enginePath}`)
    }
  }

  const prismaClientEnginesDir = path.join(nodeModulesRoot, '.prisma', 'client')
  if (!(await exists(prismaClientEnginesDir))) {
    throw new Error(`Prisma client runtime directory not found: ${prismaClientEnginesDir}`)
  }

  for (const engineName of ['libquery_engine-debian-openssl-1.1.x.so.node', 'libquery_engine-debian-openssl-3.0.x.so.node']) {
    const clientEnginePath = path.join(prismaClientEnginesDir, engineName)
    if (!(await exists(clientEnginePath))) {
      throw new Error(`Missing required Prisma client engine: ${clientEnginePath}`)
    }
  }
}

async function stageRuntimeBundle() {
  await cleanDirectory(stageDir)

  await deployServerPackageToStage()
  await mkdir(localPackageDir, { recursive: true })

  const stageManifest = await readJson(path.join(stageDir, 'package.json'))
  const localDependencySpecs = await packWorkspaceDependencies(stageManifest)
  await rewriteStagePackageManifest(localDependencySpecs)
  await installPortableRuntimeDependencies()

  warn('\nRemoving runtime test fixture directories...')
  await removeTestFixtureDirectories(path.join(stageDir, 'node_modules'))

  warn('\nPruning node-pty prebuilds for host platform...')
  await pruneNativePrebuilds(path.join(stageDir, 'node_modules', 'node-pty', 'prebuilds'))

  await rm(localPackageDir, { recursive: true, force: true })
  await assertNoSymlinks(path.join(stageDir, 'node_modules'))
  await validateCriticalImports()
  await validateLinuxPrismaEngines(path.join(stageDir, 'node_modules'))
}

function getElectronVersionSpecifier(webManifest) {
  const version = webManifest.devDependencies?.electron
  if (!version || typeof version !== 'string') {
    throw new Error('Could not resolve devDependencies.electron from autobyteus-web/package.json')
  }
  return version.replace(/^[~^]/, '')
}

async function rebuildNativeModulesForElectron() {
  warn('\nRebuilding native modules for Electron...')
  const webManifest = await readJson(path.join(webRoot, 'package.json'))
  const electronVersion = getElectronVersionSpecifier(webManifest)
  const args = ['-v', electronVersion, '-m', targetDir, '-w', 'node-pty']

  try {
    await runCommand('pnpm', ['-C', webRoot, 'exec', 'electron-rebuild', ...args])
  } catch {
    warn('electron-rebuild not found in project dependencies; using pnpm dlx fallback...')
    await runCommand('pnpm', ['-C', webRoot, 'dlx', 'electron-rebuild', ...args])
  }
}

async function publishStageToTarget() {
  warn('\nPublishing staged server bundle...')
  await rm(targetDir, { recursive: true, force: true })
  await cp(stageDir, targetDir, { recursive: true, dereference: true })
}

async function copyDownloadIfPresent() {
  const sourceDownloadDir = path.join(serverSourceRoot, 'download')
  const targetDownloadDir = path.join(stageDir, 'download')
  await copyIfExists(sourceDownloadDir, targetDownloadDir)
}

async function run() {
  info('=======================================')
  info('   Preparing AutoByteus Server Files   ')
  info('=======================================')

  if (!(await exists(serverSourceRoot))) {
    throw new Error(`Server repository not found at ${serverSourceRoot}`)
  }

  await buildWorkspaceArtifacts()
  await stageRuntimeBundle()
  await copyDownloadIfPresent()
  await publishStageToTarget()
  await rebuildNativeModulesForElectron()

  info('\n=======================================')
  info('   Server files prepared successfully! ')
  info('=======================================')
  info(`Target directory: ${targetDir}`)
}

run().catch(error => {
  fail(`\nError: ${error.message}`)
  process.exit(1)
})
