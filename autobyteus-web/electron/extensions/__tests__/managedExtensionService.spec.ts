import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import * as tar from 'tar'
import { createHash } from 'crypto'
import { createServer, type Server } from 'http'
import { ManagedExtensionService } from '../managedExtensionService'

async function createWorkerArchive(targetPath: string): Promise<void> {
  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-worker-'))
  const binDir = path.join(stagingDir, 'bin')
  await fs.mkdir(binDir, { recursive: true })

  const workerScriptPath = path.join(stagingDir, 'worker.js')
  const workerScript = [
    '#!/usr/bin/env node',
    "const fs = require('fs')",
    "const path = require('path')",
    "const readline = require('readline')",
    'const args = process.argv.slice(2)',
    'const command = args[0]',
    'function readArg(name) {',
    '  const index = args.indexOf(name)',
    '  return index === -1 ? undefined : args[index + 1]',
    '}',
    "if (command === 'prepare') {",
    "  const modelPath = readArg('--model-path')",
    "  if (!modelPath) throw new Error('missing --model-path')",
    "  fs.mkdirSync(modelPath, { recursive: true })",
    "  fs.writeFileSync(path.join(modelPath, 'model.txt'), 'fixture-model', 'utf8')",
    '  process.exit(0)',
    '}',
    "if (command !== 'serve') throw new Error(`unsupported command: ${command}`)",
    "process.stdout.write(JSON.stringify({ type: 'ready', backendKind: 'faster-whisper' }) + '\\n')",
    'const rl = readline.createInterface({ input: process.stdin })',
    "rl.on('line', (line) => {",
    '  const payload = JSON.parse(line)',
    "  process.stdout.write(JSON.stringify({ requestId: payload.requestId, ok: true, text: payload.languageMode === 'zh' ? 'ni hao' : 'fixture transcript', detectedLanguage: payload.languageMode === 'zh' ? 'zh' : 'en', noSpeech: false, error: null }) + '\\n')",
    '})',
  ].join('\n')
  await fs.writeFile(workerScriptPath, workerScript, 'utf8')

  const workerPath = path.join(binDir, process.platform === 'win32' ? 'voice-input-worker.cmd' : 'voice-input-worker')
  if (process.platform === 'win32') {
    await fs.writeFile(workerPath, '@echo off\r\nnode "%~dp0\\..\\worker.js" %*\r\n', 'utf8')
  } else {
    await fs.writeFile(workerPath, '#!/usr/bin/env bash\nset -euo pipefail\nSCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"\nexec node "$SCRIPT_DIR/../worker.js" "$@"\n', 'utf8')
    await fs.chmod(workerPath, 0o755)
    await fs.chmod(workerScriptPath, 0o755)
  }

  await tar.c(
    {
      gzip: true,
      cwd: stagingDir,
      file: targetPath,
    },
    ['.'],
  )

  await fs.rm(stagingDir, { recursive: true, force: true })
}

describe('ManagedExtensionService', () => {
  let tempDir: string
  let server: Server
  let serverBaseUrl: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-extension-'))

    server = createServer(async (request, response) => {
      const runtimeArchivePath = path.join(tempDir, 'runtime.tar.gz')

      await createWorkerArchive(runtimeArchivePath)

      const runtimeSha = createHash('sha256').update(await fs.readFile(runtimeArchivePath)).digest('hex')

      const manifest = {
        schemaVersion: 2,
        runtimeId: 'voice-input',
        runtimeVersion: '0.2.0',
        generatedAt: new Date().toISOString(),
        assets: [
          {
            platform: process.platform,
            arch: process.arch,
            fileName: 'voice-input-runtime.tar.gz',
            url: `${serverBaseUrl}/runtime`,
            sha256: runtimeSha,
            entrypoint: process.platform === 'win32' ? 'bin/voice-input-worker.cmd' : 'bin/voice-input-worker',
            distributionType: 'archive',
            backendKind: 'faster-whisper',
            model: {
              id: 'fixture-model',
              sourceRepo: 'fixtures/faster-whisper-small',
              version: 'fixture-model-v1',
            },
          },
        ],
      }

      if (request.url === '/manifest.json') {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify(manifest))
        return
      }

      if (request.url === '/runtime') {
        response.end(await fs.readFile(runtimeArchivePath))
        return
      }

      response.statusCode = 404
      response.end('not found')
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          throw new Error('Failed to bind fixture server')
        }
        serverBaseUrl = `http://127.0.0.1:${address.port}`
        resolve()
      })
    })

    vi.stubEnv('AUTOBYTEUS_VOICE_INPUT_MANIFEST_URL', `${serverBaseUrl}/manifest.json`)
  })

  afterEach(async () => {
    vi.unstubAllEnvs()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('installs disabled by default, enables explicitly, and transcribes via the worker', async () => {
    const service = new ManagedExtensionService(tempDir)

    const installedState = await service.install('voice-input')
    const voiceInput = installedState.find((entry) => entry.id === 'voice-input')
    const extensionRoot = path.join(tempDir, 'extensions', 'voice-input')
    const registryPath = path.join(tempDir, 'extensions', 'registry.json')

    expect(voiceInput?.status).toBe('installed')
    expect(voiceInput?.enabled).toBe(false)
    expect(await fs.readFile(registryPath, 'utf8')).toContain('"enabled": false')
    await expect(fs.access(path.join(extensionRoot, 'runtime', 'bin', process.platform === 'win32' ? 'voice-input-worker.cmd' : 'voice-input-worker'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(extensionRoot, 'models', 'fixture-model', 'model.txt'))).resolves.toBeUndefined()

    const disabledResult = await service.transcribeVoiceInput({
      audioData: new Uint8Array([82, 73, 70, 70]).buffer,
    })
    expect(disabledResult.ok).toBe(false)
    expect(disabledResult.error).toContain('disabled')

    const enabledState = await service.enable('voice-input')
    expect(enabledState.find((entry) => entry.id === 'voice-input')?.enabled).toBe(true)

    const result = await service.transcribeVoiceInput({
      audioData: new Uint8Array([82, 73, 70, 70]).buffer,
      languageMode: 'zh',
    })

    expect(result).toEqual({
      ok: true,
      text: 'ni hao',
      detectedLanguage: 'zh',
      noSpeech: false,
      error: null,
    })
  })

  it('preserves enabled state and language mode across reinstall', async () => {
    const service = new ManagedExtensionService(tempDir)

    await service.install('voice-input')
    await service.updateVoiceInputSettings('voice-input', { languageMode: 'zh', audioInputDeviceId: 'virtual-source' })
    await service.enable('voice-input')

    const state = await service.reinstall('voice-input')
    const voiceInput = state.find((entry) => entry.id === 'voice-input')

    expect(voiceInput?.status).toBe('installed')
    expect(voiceInput?.enabled).toBe(true)
    expect(voiceInput?.settings.languageMode).toBe('zh')
    expect(voiceInput?.settings.audioInputDeviceId).toBe('virtual-source')
  })

  it('marks a broken installation as requiring attention', async () => {
    const service = new ManagedExtensionService(tempDir)
    await service.install('voice-input')

    await fs.rm(
      path.join(tempDir, 'extensions', 'voice-input', 'runtime', 'bin', process.platform === 'win32' ? 'voice-input-worker.cmd' : 'voice-input-worker'),
      { force: true },
    )

    const state = await service.listExtensions()
    const voiceInput = state.find((entry) => entry.id === 'voice-input')

    expect(voiceInput?.status).toBe('error')
    expect(voiceInput?.enabled).toBe(false)
    expect(voiceInput?.lastError).toBeTruthy()
  })
})
