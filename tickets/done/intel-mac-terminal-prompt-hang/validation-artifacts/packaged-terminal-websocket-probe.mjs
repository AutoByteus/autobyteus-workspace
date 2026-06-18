#!/usr/bin/env node
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const appServerRoot = process.argv[2] ? path.resolve(process.argv[2]) : ''
const appBin = process.argv[3] ? path.resolve(process.argv[3]) : ''
const artifactsDir = process.argv[4] ? path.resolve(process.argv[4]) : ''
const cwdForTerminal = path.resolve(process.argv[5] ?? repoRoot)

if (!appServerRoot || !appBin || !artifactsDir) {
  console.error('Usage: node packaged-terminal-websocket-probe.mjs <app-server-root> <app-bin> <artifacts-dir> [terminal-cwd]')
  process.exit(2)
}

const serverLogPath = path.join(artifactsDir, 'packaged-terminal-websocket-server-round2.log')
const summaryPath = path.join(artifactsDir, 'packaged-terminal-websocket-summary-round2.json')

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function pickPort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      const port = typeof address === 'object' && address ? address.port : 0
      srv.close(() => resolve(port))
    })
  })
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + 120_000
  let lastError = null
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited before health check succeeded; exitCode=${child.exitCode}`)
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/rest/health`)
      const text = await response.text()
      if (response.ok) {
        return { status: response.status, body: text }
      }
      lastError = new Error(`health status=${response.status} body=${text}`)
    } catch (error) {
      lastError = error
    }
    await delay(500)
  }
  throw new Error(`Timed out waiting for /rest/health: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

function decodeFrame(raw) {
  let text
  if (typeof raw === 'string') {
    text = raw
  } else if (raw instanceof ArrayBuffer) {
    text = Buffer.from(raw).toString('utf8')
  } else if (ArrayBuffer.isView(raw)) {
    text = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8')
  } else {
    text = String(raw)
  }
  const parsed = JSON.parse(text)
  if (parsed.type === 'output' && typeof parsed.data === 'string') {
    return { type: 'output', text: Buffer.from(parsed.data, 'base64').toString('utf8') }
  }
  if (parsed.type === 'error') {
    return { type: 'error', text: parsed.message ?? '' }
  }
  return { type: parsed.type ?? 'unknown', text }
}

async function runTerminalProbe(port) {
  const sessionId = `pkg-probe-${Date.now()}`
  const marker = `__AUTOBYTEUS_PACKAGED_TERMINAL_MARKER_${Date.now()}__`
  const url = `ws://127.0.0.1:${port}/ws/terminal/${sessionId}?cwd=${encodeURIComponent(cwdForTerminal)}`
  const ws = new WebSocket(url)
  const frames = []
  let output = ''
  let errors = []
  let opened = false
  let closed = null
  let initialOutputObserved = false
  let commandSent = false

  const openedPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for websocket open')), 15_000)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      opened = true
      resolve()
    }, { once: true })
    ws.addEventListener('error', () => {
      if (!opened) {
        clearTimeout(timer)
        reject(new Error('WebSocket error before open'))
      }
    }, { once: true })
  })

  ws.addEventListener('message', event => {
    try {
      const frame = decodeFrame(event.data)
      frames.push(frame)
      if (frame.type === 'output') {
        output += frame.text
        if (!commandSent) {
          initialOutputObserved = true
        }
      } else if (frame.type === 'error') {
        errors.push(frame.text)
      }
    } catch (error) {
      errors.push(`decode error: ${error instanceof Error ? error.message : String(error)}`)
    }
  })

  ws.addEventListener('close', event => {
    closed = { code: event.code, reason: event.reason, wasClean: event.wasClean }
  })

  await openedPromise

  const initialDeadline = Date.now() + 5_000
  while (!initialOutputObserved && !closed && Date.now() < initialDeadline) {
    await delay(100)
  }

  const command = `printf '${marker}:%s\\n' "$PWD"\n`
  commandSent = true
  ws.send(JSON.stringify({ type: 'input', data: Buffer.from(command, 'utf8').toString('base64') }))

  const markerDeadline = Date.now() + 20_000
  while (!output.includes(marker) && errors.length === 0 && !closed && Date.now() < markerDeadline) {
    await delay(100)
  }

  const markerObserved = output.includes(marker)
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close(1000, 'probe complete')
  }
  await delay(500)

  return {
    sessionId,
    url,
    opened,
    initialOutputObserved,
    markerObserved,
    marker,
    outputPreview: output.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '').slice(0, 2000),
    outputLength: output.length,
    frameCount: frames.length,
    errorFrames: errors,
    closed,
  }
}

async function terminateChild(child) {
  if (child.exitCode !== null) return
  child.kill('SIGTERM')
  const deadline = Date.now() + 5_000
  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100)
  }
  if (child.exitCode === null) {
    child.kill('SIGKILL')
  }
}

async function main() {
  await mkdir(artifactsDir, { recursive: true })
  const port = await pickPort()
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-packaged-server-probe-'))
  await mkdir(path.join(dataDir, 'logs'), { recursive: true })
  await mkdir(path.join(dataDir, 'db'), { recursive: true })
  const envPath = path.join(dataDir, '.env')
  await writeFile(envPath, [
    'APP_ENV=production',
    'DB_TYPE=sqlite',
    'LOG_LEVEL=INFO',
    'PRISMA_LOG_QUERIES=0',
    `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`,
    `AUTOBYTEUS_LOG_DIR=${path.join(dataDir, 'logs')}`,
    'CODEX_SEND_MESSAGE_RELAY_DEBUG=0',
    '',
  ].join('\n'), 'utf8')

  const logStream = createWriteStream(serverLogPath, { flags: 'w' })
  const child = spawn(appBin, [path.join(appServerRoot, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: appServerRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`,
      LOG_LEVEL: 'INFO',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.pipe(logStream, { end: false })
  child.stderr.pipe(logStream, { end: false })

  const summary = {
    startedAt: new Date().toISOString(),
    appServerRoot,
    appBin,
    port,
    dataDir,
    envPath,
    cwdForTerminal,
    health: null,
    terminal: null,
    serverExitCode: null,
    result: 'UNKNOWN',
  }

  try {
    summary.health = await waitForHealth(port, child)
    summary.terminal = await runTerminalProbe(port)
    if (!summary.terminal.initialOutputObserved) {
      throw new Error('Terminal websocket did not emit initial output/prompt before probe input')
    }
    if (!summary.terminal.markerObserved) {
      throw new Error('Terminal websocket did not echo marker command output')
    }
    if (summary.terminal.errorFrames.length > 0) {
      throw new Error(`Terminal websocket emitted error frame(s): ${summary.terminal.errorFrames.join('; ')}`)
    }
    summary.result = 'PASS'
  } catch (error) {
    summary.result = 'FAIL'
    summary.error = error instanceof Error ? error.stack ?? error.message : String(error)
    throw error
  } finally {
    await terminateChild(child)
    summary.serverExitCode = child.exitCode
    summary.completedAt = new Date().toISOString()
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    logStream.end()
    // Keep dataDir for evidence only if failed; remove successful temp runtime state.
    if (summary.result === 'PASS') {
      await rm(dataDir, { recursive: true, force: true }).catch(() => undefined)
      summary.dataDirRemovedAfterPass = true
      await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
