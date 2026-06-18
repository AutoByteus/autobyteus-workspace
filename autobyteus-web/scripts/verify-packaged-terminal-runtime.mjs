#!/usr/bin/env node

import { constants as fsConstants } from 'node:fs'
import { access, readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const nativeDirOrder = ['build/Release', 'build/Debug']

function parseArgs(argv) {
  const args = {
    serverRoot: '',
    platform: '',
    arch: '',
    spawnProbe: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--server-root') {
      args.serverRoot = argv[++index] ?? ''
    } else if (arg === '--platform') {
      args.platform = argv[++index] ?? ''
    } else if (arg === '--arch') {
      args.arch = argv[++index] ?? ''
    } else if (arg === '--spawn-probe') {
      args.spawnProbe = true
    } else if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (!args.serverRoot || !args.platform || !args.arch) {
    printUsage()
    throw new Error('Missing required --server-root, --platform, or --arch')
  }

  return {
    ...args,
    serverRoot: path.resolve(args.serverRoot),
  }
}

function printUsage() {
  console.log(`Usage: node ${path.basename(scriptPath)} --server-root <path> --platform darwin --arch x64|arm64 [--spawn-probe]`)
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

async function isExecutable(filePath) {
  try {
    await access(filePath, fsConstants.X_OK)
    return true
  } catch {
    return false
  }
}

async function findNodePtyRoots(serverRoot) {
  const nodeModulesRoot = path.join(serverRoot, 'node_modules')
  const roots = []
  const directRoot = path.join(nodeModulesRoot, 'node-pty')
  if (await exists(path.join(directRoot, 'lib', 'utils.js'))) {
    roots.push(directRoot)
  }

  const pnpmRoot = path.join(nodeModulesRoot, '.pnpm')
  if (await exists(pnpmRoot)) {
    const stack = [pnpmRoot]
    while (stack.length > 0) {
      const current = stack.pop()
      const entries = await readdir(current, { withFileTypes: true }).catch(() => [])
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name)
        if (!entry.isDirectory()) {
          continue
        }
        if (entry.name === 'node-pty' && await exists(path.join(fullPath, 'lib', 'utils.js'))) {
          roots.push(fullPath)
          continue
        }
        if (fullPath.split(path.sep).length - pnpmRoot.split(path.sep).length < 5) {
          stack.push(fullPath)
        }
      }
    }
  }

  return [...new Set(roots)]
}

function expectedDarwinArchToken(arch) {
  if (arch === 'x64') return 'x86_64'
  if (arch === 'arm64') return 'arm64'
  throw new Error(`Unsupported Darwin arch: ${arch}`)
}

async function runFileCommand(filePath) {
  return new Promise((resolve) => {
    const child = spawn('file', [filePath], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', () => resolve(null))
    child.on('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      resolve((stdout || stderr).trim())
    })
  })
}

async function fileMatchesDarwinArchitecture(filePath, arch) {
  const output = await runFileCommand(filePath)
  if (!output) {
    console.warn(`[terminal-runtime] warning: could not inspect architecture for ${filePath}`)
    return true
  }
  return output.includes(expectedDarwinArchToken(arch))
}

async function assertDarwinArchitecture(filePath, arch) {
  if (!(await fileMatchesDarwinArchitecture(filePath, arch))) {
    const output = await runFileCommand(filePath)
    throw new Error(`Expected ${filePath} to match Darwin ${arch}; file output: ${output}`)
  }
}

async function assertExecutableHelper(helperPath) {
  if (!(await exists(helperPath))) {
    throw new Error(`Missing node-pty spawn-helper: ${helperPath}`)
  }
  if (!(await isExecutable(helperPath))) {
    const mode = ((await stat(helperPath)).mode & 0o777).toString(8)
    throw new Error(`node-pty spawn-helper is not executable: ${helperPath} mode=${mode}`)
  }
}

async function resolveStaticSelectedNativeDir(nodePtyRoot, platform, arch) {
  const orderedDirs = [
    ...nativeDirOrder,
    path.join('prebuilds', `${platform}-${arch}`),
  ]

  for (const relativeDir of orderedDirs) {
    const nativeDir = path.join(nodePtyRoot, relativeDir)
    const ptyNodePath = path.join(nativeDir, 'pty.node')
    if (!(await exists(ptyNodePath))) {
      continue
    }
    if (platform === 'darwin' && !(await fileMatchesDarwinArchitecture(ptyNodePath, arch))) {
      console.log(`[terminal-runtime] skipping ${ptyNodePath}; architecture does not match ${arch}`)
      continue
    }
    return nativeDir
  }

  return null
}

async function verifyTargetDarwinPrebuild(nodePtyRoot, arch) {
  const targetDir = path.join(nodePtyRoot, 'prebuilds', `darwin-${arch}`)
  const ptyNodePath = path.join(targetDir, 'pty.node')
  const helperPath = path.join(targetDir, 'spawn-helper')

  if (!(await exists(ptyNodePath))) {
    throw new Error(`Missing target node-pty native module: ${ptyNodePath}`)
  }
  await assertDarwinArchitecture(ptyNodePath, arch)
  await assertExecutableHelper(helperPath)
  await assertDarwinArchitecture(helperPath, arch)
  console.log(`[terminal-runtime] ok target helper: ${helperPath}`)
}

async function verifySelectedHelper(nodePtyRoot, platform, arch) {
  if (platform !== 'darwin') {
    throw new Error(`Only darwin packaged terminal validation is supported by this guard, got: ${platform}`)
  }

  await verifyTargetDarwinPrebuild(nodePtyRoot, arch)

  const selectedDir = await resolveStaticSelectedNativeDir(nodePtyRoot, platform, arch)
  if (!selectedDir) {
    throw new Error(`Could not resolve selected node-pty native dir for ${platform}-${arch}`)
  }

  const helperPath = path.join(selectedDir, 'spawn-helper')
  await assertExecutableHelper(helperPath)
  await assertDarwinArchitecture(helperPath, arch)
  console.log(`[terminal-runtime] ok selected helper: ${helperPath}`)
}

async function runSpawnProbe(serverRoot, nodePtyRoot, platform, arch) {
  if (platform !== process.platform || arch !== process.arch) {
    console.log(`[terminal-runtime] skipped spawn probe: target ${platform}/${arch} differs from host ${process.platform}/${process.arch}`)
    return
  }

  const nodePtyRequirePath = JSON.stringify(nodePtyRoot)
  const probe = `
const pty = require(${nodePtyRequirePath})
const terminal = pty.spawn('bash', ['--noprofile', '--norc', '-lc', 'echo AUTOBYTEUS_TERMINAL_PROBE'], {
  cols: 80,
  rows: 24,
  cwd: process.cwd(),
  env: process.env,
})
let output = ''
const timer = setTimeout(() => {
  terminal.kill()
  console.error('Timed out waiting for node-pty probe output')
  process.exit(1)
}, 5000)
terminal.onData(data => {
  output += data
  if (output.includes('AUTOBYTEUS_TERMINAL_PROBE')) {
    clearTimeout(timer)
    terminal.kill()
    process.exit(0)
  }
})
terminal.onExit(({ exitCode }) => {
  clearTimeout(timer)
  if (output.includes('AUTOBYTEUS_TERMINAL_PROBE')) process.exit(0)
  console.error('node-pty probe exited before expected output, exit=' + exitCode + ', output=' + output)
  process.exit(1)
})
`

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--eval', probe], {
      cwd: serverRoot,
      env: { ...process.env },
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`node-pty spawn probe failed with exit code ${code}`))
    })
  })
  console.log('[terminal-runtime] ok: node-pty spawn probe')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const roots = await findNodePtyRoots(args.serverRoot)
  if (roots.length === 0) {
    throw new Error(`Could not find node-pty package under ${args.serverRoot}`)
  }

  const root = roots[0]
  console.log(`[terminal-runtime] node-pty root: ${root}`)
  await verifySelectedHelper(root, args.platform, args.arch)

  if (args.spawnProbe) {
    await runSpawnProbe(args.serverRoot, root, args.platform, args.arch)
  }
}

main().catch((error) => {
  console.error(`[terminal-runtime] error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
