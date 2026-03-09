import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import * as tar from 'tar'
import { createHash } from 'crypto'
import { createServer, type Server } from 'http'

const {
  activeContextStoreMock,
  addToastMock,
} = vi.hoisted(() => ({
  activeContextStoreMock: {
    currentRequirement: 'draft',
    updateRequirement: vi.fn(),
  },
  addToastMock: vi.fn(),
}))

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => activeContextStoreMock,
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}))

import { ManagedExtensionService } from '~/electron/extensions/managedExtensionService'
import { useExtensionsStore } from '~/stores/extensionsStore'
import { useVoiceInputStore } from '~/stores/voiceInputStore'

async function createWorkerArchive(targetPath: string): Promise<void> {
  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-integration-worker-'))
  const binDir = path.join(stagingDir, 'bin')
  await fs.mkdir(binDir, { recursive: true })

  const workerScriptPath = path.join(stagingDir, 'worker.js')
  const contents = [
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
  await fs.writeFile(workerScriptPath, contents, 'utf8')

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

describe('voice input extension integration', () => {
  let tempDir: string
  let server: Server
  let serverBaseUrl: string
  let managedExtensionService: ManagedExtensionService

  beforeEach(async () => {
    setActivePinia(createPinia())
    activeContextStoreMock.currentRequirement = 'draft'
    activeContextStoreMock.updateRequirement.mockReset()
    addToastMock.mockReset()

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-extension-integration-'))
    managedExtensionService = new ManagedExtensionService(tempDir)

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

    ;(window as typeof window & { electronAPI?: any }).electronAPI = {
      getExtensionsState: () => managedExtensionService.listExtensions(),
      installExtension: (id: 'voice-input') => managedExtensionService.install(id),
      enableExtension: (id: 'voice-input') => managedExtensionService.enable(id),
      disableExtension: (id: 'voice-input') => managedExtensionService.disable(id),
      updateVoiceInputSettings: (id: 'voice-input', payload: { languageMode?: 'auto' | 'en' | 'zh'; audioInputDeviceId?: string | null }) =>
        managedExtensionService.updateVoiceInputSettings(id, payload),
      removeExtension: (id: 'voice-input') => managedExtensionService.remove(id),
      reinstallExtension: (id: 'voice-input') => managedExtensionService.reinstall(id),
      openExtensionFolder: vi.fn().mockResolvedValue({ success: true }),
      transcribeVoiceInput: (request: { audioData: ArrayBuffer; languageMode?: 'auto' | 'en' | 'zh' }) =>
        managedExtensionService.transcribeVoiceInput(request),
    }
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

  it('installs, enables, and inserts transcript text into the draft', async () => {
    const extensionsStore = useExtensionsStore()
    const voiceInputStore = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1000,
        rms: 0.032,
        peak: 0.4,
        sampleCount: 48000,
      },
    }

    await extensionsStore.initialize()
    expect(extensionsStore.voiceInput?.status).toBe('not-installed')

    await extensionsStore.installExtension('voice-input')
    expect(extensionsStore.voiceInput?.status).toBe('installed')
    expect(extensionsStore.voiceInput?.enabled).toBe(false)

    await extensionsStore.enableExtension('voice-input')
    expect(extensionsStore.voiceInput?.enabled).toBe(true)

    voiceInputStore.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            voiceInputStore.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    voiceInputStore.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    voiceInputStore.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    voiceInputStore.isRecording = true

    await voiceInputStore.stopRecording()

    expect(activeContextStoreMock.updateRequirement).toHaveBeenCalledWith('draft fixture transcript')
    expect(addToastMock).not.toHaveBeenCalled()
  })
})
