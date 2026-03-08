import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
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

function createFakeRuntimeScript(): Buffer {
  return Buffer.from('#!/usr/bin/env bash\nprintf "fixture transcript\\n"\n', 'utf8')
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

    const runtimeSha = createHash('sha256').update(createFakeRuntimeScript()).digest('hex')
    const modelSha = createHash('sha256').update('fixture-model').digest('hex')

    server = createServer((request, response) => {
      const manifest = {
        schemaVersion: 1,
        runtimeId: 'voice-input',
        runtimeVersion: '0.1.0',
        generatedAt: new Date().toISOString(),
        assets: [
          {
            platform: process.platform,
            arch: process.arch,
            fileName: process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
            url: `${serverBaseUrl}/runtime`,
            sha256: runtimeSha,
            entrypoint: process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
            distributionType: 'file',
          },
        ],
        model: {
          fileName: 'ggml-tiny.en-q5_1.bin',
          url: `${serverBaseUrl}/model`,
          sha256: modelSha,
          sizeBytes: 'fixture-model'.length,
          version: 'tiny.en-q5_1',
        },
      }

      if (request.url === '/manifest.json') {
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify(manifest))
        return
      }

      if (request.url === '/runtime') {
        response.end(createFakeRuntimeScript())
        return
      }

      if (request.url === '/model') {
        response.end('fixture-model')
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
      removeExtension: (id: 'voice-input') => managedExtensionService.remove(id),
      reinstallExtension: (id: 'voice-input') => managedExtensionService.reinstall(id),
      transcribeVoiceInput: (audioData: ArrayBuffer, language?: string) =>
        managedExtensionService.transcribeVoiceInput({ audioData, language }),
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

  it('installs the runtime and inserts transcript text into the draft', async () => {
    const extensionsStore = useExtensionsStore()
    const voiceInputStore = useVoiceInputStore()
    const audioBuffer = new Uint8Array([1, 2, 3]).buffer

    await extensionsStore.initialize()
    expect(extensionsStore.voiceInput?.status).toBe('not-installed')

    await extensionsStore.installExtension('voice-input')
    expect(extensionsStore.voiceInput?.status).toBe('installed')

    voiceInputStore.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            voiceInputStore.flushPromiseResolve?.(audioBuffer)
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
