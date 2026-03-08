import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { createServer, type Server } from 'http'
import { ManagedExtensionService } from '../managedExtensionService'

function createFakeRuntimeScript(): Buffer {
  return Buffer.from('#!/usr/bin/env bash\nprintf "fixture transcript\\n"\n', 'utf8')
}

describe('ManagedExtensionService', () => {
  let tempDir: string
  let server: Server
  let serverBaseUrl: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-input-extension-'))

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
            sha256: '',
            entrypoint: process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
            distributionType: 'file',
          },
        ],
        model: {
          fileName: 'ggml-tiny.en-q5_1.bin',
          url: `${serverBaseUrl}/model`,
          sha256: '',
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
        const runtime = createFakeRuntimeScript()
        response.end(runtime)
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

    const crypto = await import('crypto')
    const runtimeSha = crypto.createHash('sha256').update(createFakeRuntimeScript()).digest('hex')
    const modelSha = crypto.createHash('sha256').update('fixture-model').digest('hex')

    server.removeAllListeners('request')
    server.on('request', (request, response) => {
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

  it('installs, invokes, and removes voice input', async () => {
    const service = new ManagedExtensionService(tempDir)

    const installedState = await service.install('voice-input')
    const voiceInput = installedState.find((entry) => entry.id === 'voice-input')
    const extensionRoot = path.join(tempDir, 'extensions', 'voice-input')
    const registryPath = path.join(tempDir, 'extensions', 'registry.json')

    expect(voiceInput?.status).toBe('installed')
    expect(await fs.readFile(registryPath, 'utf8')).toContain('"status": "installed"')
    await expect(fs.access(path.join(extensionRoot, 'bin', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'))).resolves.toBeUndefined()
    await expect(fs.access(path.join(extensionRoot, 'models', 'ggml-tiny.en-q5_1.bin'))).resolves.toBeUndefined()
    await expect(service.getInstalledExtensionPath('voice-input')).resolves.toBe(extensionRoot)

    const result = await service.transcribeVoiceInput({
      audioData: new Uint8Array([82, 73, 70, 70]).buffer,
      language: 'en',
    })

    expect(result).toEqual({
      ok: true,
      text: 'fixture transcript',
      error: null,
    })

    const removedState = await service.remove('voice-input')
    expect(removedState.find((entry) => entry.id === 'voice-input')?.status).toBe('not-installed')
    await expect(service.getInstalledExtensionPath('voice-input')).rejects.toThrow('Voice Input is not installed yet.')
  })

  it('marks a broken installation as requiring attention', async () => {
    const service = new ManagedExtensionService(tempDir)
    await service.install('voice-input')

    await fs.rm(
      path.join(tempDir, 'extensions', 'voice-input', 'bin', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'),
      { force: true },
    )

    const state = await service.listExtensions()
    const voiceInput = state.find((entry) => entry.id === 'voice-input')

    expect(voiceInput?.status).toBe('error')
    expect(voiceInput?.lastError).toBeTruthy()
  })
})
