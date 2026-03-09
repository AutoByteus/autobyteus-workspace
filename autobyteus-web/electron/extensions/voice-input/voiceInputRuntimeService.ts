import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'
import type {
  ExtensionDescriptor,
  VoiceInputBackendKind,
  VoiceInputLanguageMode,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
} from '../types'
import {
  buildVoiceInputRuntimeEnv,
  downloadFile,
  ensureDir,
  extractArchive,
  getRuntimeFilePaths,
  type InstallInspection,
  type InstallResult,
  loadRuntimeManifest,
  resolvePlatformAsset,
  type RuntimeInstallProgressCallback,
  verifySha256,
} from './voiceInputRuntimeSupport'

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
        env: buildVoiceInputRuntimeEnv(),
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
        env: buildVoiceInputRuntimeEnv(),
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

  async installRuntime(
    descriptor: ExtensionDescriptor,
    extensionRoot: string,
    onProgress?: RuntimeInstallProgressCallback,
  ): Promise<InstallResult> {
    if (onProgress) {
      await onProgress({
        phase: 'fetching-manifest',
        message: 'Fetching runtime manifest...',
        percent: null,
        bytesReceived: null,
        bytesTotal: null,
      })
    }

    const manifest = await loadRuntimeManifest(descriptor)
    const asset = resolvePlatformAsset(manifest)
    const paths = getRuntimeFilePaths(extensionRoot, asset)

    await this.stopWorkerIfRunning(extensionRoot)
    await fs.rm(extensionRoot, { recursive: true, force: true })

    await ensureDir(paths.runtimeDir)
    await ensureDir(paths.modelsDir)
    await ensureDir(paths.tempDir)
    await ensureDir(paths.downloadsDir)

    await downloadFile(asset.url, paths.runtimeBundlePath, onProgress)
    await verifySha256(paths.runtimeBundlePath, asset.sha256)

    if (asset.distributionType === 'archive') {
      if (onProgress) {
        await onProgress({
          phase: 'extracting-runtime',
          message: 'Extracting runtime bundle...',
          percent: null,
          bytesReceived: null,
          bytesTotal: null,
        })
      }
      await extractArchive(paths.runtimeBundlePath, paths.runtimeDir)
    } else {
      await fs.copyFile(paths.runtimeBundlePath, paths.runtimeEntrypoint)
    }

    if (process.platform !== 'win32') {
      await fs.chmod(paths.runtimeEntrypoint, 0o755)
    }

    if (onProgress) {
      await onProgress({
        phase: 'bootstrapping-runtime',
        message: 'Bootstrapping local runtime dependencies...',
        percent: null,
        bytesReceived: null,
        bytesTotal: null,
      })
    }

    if (onProgress) {
      await onProgress({
        phase: 'bootstrapping-model',
        message: 'Downloading and preparing the local speech model...',
        percent: null,
        bytesReceived: null,
        bytesTotal: null,
      })
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

    if (onProgress) {
      await onProgress({
        phase: 'ready',
        message: 'Voice Input is ready.',
        percent: 100,
        bytesReceived: null,
        bytesTotal: null,
      })
    }

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
