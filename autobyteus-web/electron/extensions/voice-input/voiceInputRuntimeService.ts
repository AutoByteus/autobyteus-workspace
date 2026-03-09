import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { createHash } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as tar from 'tar'
import type {
  ExtensionDescriptor,
  VoiceInputBackendKind,
  VoiceInputLanguageMode,
  VoiceInputRuntimeManifest,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
  VoiceRuntimeAsset,
} from '../types'
import { getCurrentArch, getCurrentPlatform } from '../extensionCatalog'

type InstallResult = {
  runtimeVersion: string
  modelVersion: string
  runtimeEntrypoint: string
  modelPath: string
  backendKind: VoiceInputBackendKind
}

type InstallInspection = {
  ready: boolean
  runtimeEntrypoint: string | null
  modelPath: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  backendKind: VoiceInputBackendKind | null
  error: string | null
}

type WorkerRequest =
  | {
      requestId: string
      type: 'transcribe-file'
      audioPath: string
      languageMode: VoiceInputLanguageMode
    }

type WorkerResponse =
  | {
      type: 'ready'
      backendKind: VoiceInputBackendKind
    }
  | {
      requestId: string
      ok: boolean
      text: string
      detectedLanguage: string | null
      noSpeech: boolean
      error: string | null
    }

type WorkerProcessState = {
  process: ChildProcessWithoutNullStreams
  stdoutBuffer: string
  stderrBuffer: string
  readyPromise: Promise<void>
  resolveReady: () => void
  rejectReady: (error: Error) => void
  pendingRequests: Map<string, { resolve: (response: WorkerResponse) => void; reject: (error: Error) => void }>
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download JSON from ${url}: ${response.status} ${response.statusText}`)
  }
  return await response.json() as T
}

async function downloadFile(url: string, targetPath: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.status} ${response.statusText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer))
}

async function computeSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  hash.update(await fs.readFile(filePath))
  return hash.digest('hex')
}

async function verifySha256(filePath: string, expectedSha256: string): Promise<void> {
  const actualSha256 = await computeSha256(filePath)
  if (actualSha256 !== expectedSha256) {
    throw new Error(`Checksum mismatch for ${path.basename(filePath)}`)
  }
}

function resolvePlatformAsset(manifest: VoiceInputRuntimeManifest): VoiceRuntimeAsset {
  const platform = getCurrentPlatform()
  const arch = getCurrentArch()
  const asset = manifest.assets.find((candidate) => candidate.platform === platform && candidate.arch === arch)
  if (!asset) {
    throw new Error(`No runtime asset found for ${platform}/${arch}`)
  }
  return asset
}

async function extractArchive(archivePath: string, destinationDir: string): Promise<void> {
  await ensureDir(destinationDir)
  await tar.x({
    cwd: destinationDir,
    file: archivePath,
  })
}

function getRuntimeFilePaths(extensionRoot: string, asset: VoiceRuntimeAsset): {
  runtimeDir: string
  modelsDir: string
  tempDir: string
  downloadsDir: string
  runtimeBundlePath: string
  runtimeEntrypoint: string
  modelPath: string
} {
  const runtimeDir = path.join(extensionRoot, 'runtime')
  const modelsDir = path.join(extensionRoot, 'models')
  const tempDir = path.join(extensionRoot, 'temp')
  const downloadsDir = path.join(extensionRoot, 'downloads')

  return {
    runtimeDir,
    modelsDir,
    tempDir,
    downloadsDir,
    runtimeBundlePath: path.join(downloadsDir, asset.fileName),
    runtimeEntrypoint: path.join(runtimeDir, asset.entrypoint),
    modelPath: path.join(modelsDir, asset.model.id),
  }
}

function isReadyResponse(response: WorkerResponse): response is Extract<WorkerResponse, { type: 'ready' }> {
  return 'type' in response && response.type === 'ready'
}

export class VoiceInputRuntimeService {
  private readonly workerStates = new Map<string, WorkerProcessState>()
  private requestCounter = 0

  private shouldUseShell(runtimeEntrypoint: string): boolean {
    return process.platform === 'win32' && runtimeEntrypoint.toLowerCase().endsWith('.cmd')
  }

  private async runRuntimeCommand(runtimeEntrypoint: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return await new Promise((resolve, reject) => {
      const child = spawn(runtimeEntrypoint, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: this.shouldUseShell(runtimeEntrypoint),
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString()
      })

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString()
      })

      child.on('error', (error) => {
        reject(error)
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
          return
        }

        const message = stderr.trim() || stdout.trim() || `Voice Input runtime command failed with exit code ${code}.`
        reject(new Error(message))
      })
    })
  }

  private handleWorkerStdout(extensionRoot: string, state: WorkerProcessState, chunk: string): void {
    state.stdoutBuffer += chunk
    const lines = state.stdoutBuffer.split('\n')
    state.stdoutBuffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) {
        continue
      }

      let payload: WorkerResponse
      try {
        payload = JSON.parse(line) as WorkerResponse
      } catch {
        continue
      }

      if (isReadyResponse(payload)) {
        state.resolveReady()
        continue
      }

      const pending = state.pendingRequests.get(payload.requestId)
      if (pending) {
        state.pendingRequests.delete(payload.requestId)
        pending.resolve(payload)
      }
    }
  }

  private handleWorkerExit(extensionRoot: string, state: WorkerProcessState, error?: Error): void {
    const failure = error || new Error(state.stderrBuffer.trim() || 'Voice Input worker exited unexpectedly.')
    state.rejectReady(failure)
    for (const pending of state.pendingRequests.values()) {
      pending.reject(failure)
    }
    state.pendingRequests.clear()
    this.workerStates.delete(extensionRoot)
  }

  private async ensureWorkerReady(extensionRoot: string): Promise<WorkerProcessState> {
    const existing = this.workerStates.get(extensionRoot)
    if (existing) {
      await existing.readyPromise
      return existing
    }

    const inspection = await this.inspectInstallation(extensionRoot)
    if (!inspection.ready || !inspection.runtimeEntrypoint || !inspection.modelPath || !inspection.backendKind) {
      throw new Error(inspection.error || 'Voice Input is not installed')
    }

    let resolveReady!: () => void
    let rejectReady!: (error: Error) => void
    const readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })

    const child = spawn(
      inspection.runtimeEntrypoint,
      [
        'serve',
        '--backend',
        inspection.backendKind,
        '--model-path',
        inspection.modelPath,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: this.shouldUseShell(inspection.runtimeEntrypoint),
      },
    )

    const state: WorkerProcessState = {
      process: child,
      stdoutBuffer: '',
      stderrBuffer: '',
      readyPromise,
      resolveReady,
      rejectReady,
      pendingRequests: new Map(),
    }

    child.stdout.on('data', (chunk: Buffer | string) => {
      this.handleWorkerStdout(extensionRoot, state, chunk.toString())
    })

    child.stderr.on('data', (chunk: Buffer | string) => {
      state.stderrBuffer += chunk.toString()
    })

    child.on('error', (error) => {
      this.handleWorkerExit(extensionRoot, state, error)
    })

    child.on('close', () => {
      this.handleWorkerExit(extensionRoot, state)
    })

    this.workerStates.set(extensionRoot, state)
    await readyPromise
    return state
  }

  private async sendWorkerRequest(extensionRoot: string, request: WorkerRequest): Promise<Extract<WorkerResponse, { requestId: string }>> {
    const state = await this.ensureWorkerReady(extensionRoot)
    const response = await new Promise<WorkerResponse>((resolve, reject) => {
      state.pendingRequests.set(request.requestId, { resolve, reject })
      state.process.stdin.write(`${JSON.stringify(request)}\n`, 'utf8', (error) => {
        if (error) {
          state.pendingRequests.delete(request.requestId)
          reject(error)
        }
      })
    })

    return response as Extract<WorkerResponse, { requestId: string }>
  }

  async inspectInstallation(extensionRoot: string): Promise<InstallInspection> {
    const metadataPath = path.join(extensionRoot, 'installation.json')

    try {
      const rawMetadata = await fs.readFile(metadataPath, 'utf8')
      const metadata = JSON.parse(rawMetadata) as InstallResult
      await fs.access(metadata.runtimeEntrypoint)
      await fs.access(metadata.modelPath)
      return {
        ready: true,
        runtimeEntrypoint: metadata.runtimeEntrypoint,
        modelPath: metadata.modelPath,
        runtimeVersion: metadata.runtimeVersion,
        modelVersion: metadata.modelVersion,
        backendKind: metadata.backendKind,
        error: null,
      }
    } catch (error) {
      return {
        ready: false,
        runtimeEntrypoint: null,
        modelPath: null,
        runtimeVersion: null,
        modelVersion: null,
        backendKind: null,
        error: error instanceof Error ? error.message : 'Runtime is not installed',
      }
    }
  }

  async installRuntime(descriptor: ExtensionDescriptor, extensionRoot: string): Promise<InstallResult> {
    const manifest = await fetchJson<VoiceInputRuntimeManifest>(descriptor.runtimeManifestUrl)
    const asset = resolvePlatformAsset(manifest)
    const paths = getRuntimeFilePaths(extensionRoot, asset)

    await this.stopWorkerIfRunning(extensionRoot)
    await fs.rm(extensionRoot, { recursive: true, force: true })

    await ensureDir(paths.runtimeDir)
    await ensureDir(paths.modelsDir)
    await ensureDir(paths.tempDir)
    await ensureDir(paths.downloadsDir)

    await downloadFile(asset.url, paths.runtimeBundlePath)
    await verifySha256(paths.runtimeBundlePath, asset.sha256)

    if (asset.distributionType === 'archive') {
      await extractArchive(paths.runtimeBundlePath, paths.runtimeDir)
    } else {
      await fs.copyFile(paths.runtimeBundlePath, paths.runtimeEntrypoint)
    }

    if (process.platform !== 'win32') {
      await fs.chmod(paths.runtimeEntrypoint, 0o755)
    }

    await this.runRuntimeCommand(
      paths.runtimeEntrypoint,
      [
        'prepare',
        '--backend',
        asset.backendKind,
        '--model-path',
        paths.modelPath,
        '--model-source-repo',
        asset.model.sourceRepo,
        ...(asset.model.sourceRevision ? ['--model-source-revision', asset.model.sourceRevision] : []),
      ],
    )
    await fs.access(paths.modelPath)

    const installResult: InstallResult = {
      runtimeVersion: manifest.runtimeVersion,
      modelVersion: asset.model.version,
      runtimeEntrypoint: paths.runtimeEntrypoint,
      modelPath: paths.modelPath,
      backendKind: asset.backendKind,
    }

    await fs.writeFile(
      path.join(extensionRoot, 'installation.json'),
      `${JSON.stringify(installResult, null, 2)}\n`,
      'utf8',
    )

    return installResult
  }

  async stopWorkerIfRunning(extensionRoot: string): Promise<void> {
    const state = this.workerStates.get(extensionRoot)
    if (!state) {
      return
    }

    await new Promise<void>((resolve) => {
      state.process.once('close', () => resolve())
      state.process.kill()
    })
  }

  async removeRuntime(extensionRoot: string): Promise<void> {
    await this.stopWorkerIfRunning(extensionRoot)
    await fs.rm(extensionRoot, { recursive: true, force: true })
  }

  async transcribe(request: VoiceInputTranscriptionRequest, extensionRoot: string): Promise<VoiceInputTranscriptionResult> {
    const inspection = await this.inspectInstallation(extensionRoot)
    if (!inspection.ready) {
      return {
        ok: false,
        text: '',
        detectedLanguage: null,
        noSpeech: false,
        error: inspection.error || 'Voice Input is not installed',
      }
    }

    const tempDir = path.join(extensionRoot, 'temp')
    await ensureDir(tempDir)
    const tempBaseName = `voice-input-${Date.now()}`
    const tempAudioPath = path.join(tempDir, `${tempBaseName}.wav`)

    try {
      await fs.writeFile(tempAudioPath, Buffer.from(request.audioData))

      const response = await this.sendWorkerRequest(extensionRoot, {
        requestId: `voice-input-${++this.requestCounter}`,
        type: 'transcribe-file',
        audioPath: tempAudioPath,
        languageMode: request.languageMode || 'auto',
      })

      return {
        ok: response.ok,
        text: response.text || '',
        detectedLanguage: response.detectedLanguage || null,
        noSpeech: response.noSpeech,
        error: response.error || null,
      }
    } catch (error) {
      return {
        ok: false,
        text: '',
        detectedLanguage: null,
        noSpeech: false,
        error: error instanceof Error ? error.message : 'Voice Input worker request failed',
      }
    } finally {
      await fs.rm(tempAudioPath, { force: true })
    }
  }
}
