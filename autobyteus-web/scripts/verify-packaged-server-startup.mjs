#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    serverRoot: '',
    runtimeExecutable: process.execPath,
    timeoutMs: 120000,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--server-root') {
      args.serverRoot = argv[++index] ?? ''
      continue
    }
    if (arg === '--runtime-executable') {
      args.runtimeExecutable = argv[++index] ?? ''
      continue
    }
    if (arg === '--timeout-ms') {
      args.timeoutMs = Number(argv[++index] ?? args.timeoutMs)
      continue
    }
  }

  if (!args.serverRoot) {
    throw new Error('Missing required --server-root')
  }
  if (!args.runtimeExecutable) {
    throw new Error('Missing required --runtime-executable')
  }

  return {
    ...args,
    serverRoot: path.resolve(args.serverRoot),
    runtimeExecutable: path.resolve(args.runtimeExecutable),
  }
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to reserve a local TCP port')))
        return
      }
      const port = address.port
      server.close(() => resolve(port))
    })
  })
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForHealth(baseUrl, child, output, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = ''

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Packaged server exited before health check passed with code ${child.exitCode}.\n${output.text}`)
    }

    try {
      const response = await fetch(`${baseUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload?.status === 'ok') {
        return
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = String(error)
    }
    await delay(500)
  }

  throw new Error(`Packaged server did not become healthy before timeout. Last error: ${lastError}\n${output.text}`)
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }

  await new Promise(resolve => {
    const forceTimer = setTimeout(() => {
      child.kill('SIGKILL')
    }, 5000)
    child.once('exit', () => {
      clearTimeout(forceTimer)
      resolve()
    })
    child.kill('SIGTERM')
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const port = await reservePort()
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-packaged-server-'))
  await mkdir(path.join(dataDir, 'db'), { recursive: true })
  const baseUrl = `http://127.0.0.1:${port}`
  const databaseUrl = `file:${path.join(dataDir, 'db', 'production.db')}`
  await writeFile(path.join(dataDir, '.env'), [
    'DB_TYPE=sqlite',
    `DATABASE_URL=${databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${baseUrl}`,
    'LOG_LEVEL=INFO',
    '',
  ].join('\n'))
  const output = { text: '' }
  const childEnv = { ...process.env }
  delete childEnv.PRISMA_QUERY_ENGINE_LIBRARY
  delete childEnv.PRISMA_SCHEMA_ENGINE_BINARY
  delete childEnv.PRISMA_CLI_BINARY_TARGETS

  const child = spawn(args.runtimeExecutable, [
    path.join(args.serverRoot, 'dist', 'app.js'),
    '--port', String(port),
    '--host', '127.0.0.1',
    '--data-dir', dataDir,
  ], {
    cwd: args.serverRoot,
    env: {
      ...childEnv,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(port),
      SERVER_PORT: String(port),
      DATABASE_URL: databaseUrl,
      DB_TYPE: 'sqlite',
      AUTOBYTEUS_DATA_DIR: dataDir,
      AUTOBYTEUS_SERVER_HOST: baseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', chunk => {
    const text = chunk.toString()
    output.text += text
    process.stdout.write(text)
  })
  child.stderr.on('data', chunk => {
    const text = chunk.toString()
    output.text += text
    process.stderr.write(text)
  })

  try {
    await waitForHealth(baseUrl, child, output, args.timeoutMs)
    if (
      !output.text.includes('Database migrations completed successfully') &&
      !output.text.includes('Baseline migration resolved; database migrations completed')
    ) {
      throw new Error(`Server became healthy but migration success was not observed in output.\n${output.text}`)
    }
    console.log(`Packaged server startup validation passed for ${args.serverRoot}`)
  } finally {
    await stopChild(child)
    await rm(dataDir, { recursive: true, force: true })
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
