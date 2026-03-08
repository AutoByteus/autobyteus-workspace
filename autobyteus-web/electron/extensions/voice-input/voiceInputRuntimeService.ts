import { spawn } from 'child_process'
import { createHash } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import type {
  ExtensionDescriptor,
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
}

type InstallInspection = {
  ready: boolean
  runtimeEntrypoint: string | null
  modelPath: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  error: string | null
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

function getRuntimeFilePaths(extensionRoot: string, asset: VoiceRuntimeAsset, manifest: VoiceInputRuntimeManifest): {
  binDir: string
  modelsDir: string
  tempDir: string
  runtimePath: string
  modelPath: string
} {
  const binDir = path.join(extensionRoot, 'bin')
  const modelsDir = path.join(extensionRoot, 'models')
  const tempDir = path.join(extensionRoot, 'temp')
  return {
    binDir,
    modelsDir,
    tempDir,
    runtimePath: path.join(binDir, asset.fileName),
    modelPath: path.join(modelsDir, manifest.model.fileName),
  }
}

export class VoiceInputRuntimeService {
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
        error: null,
      }
    } catch (error) {
      return {
        ready: false,
        runtimeEntrypoint: null,
        modelPath: null,
        runtimeVersion: null,
        modelVersion: null,
        error: error instanceof Error ? error.message : 'Runtime is not installed',
      }
    }
  }

  async installRuntime(descriptor: ExtensionDescriptor, extensionRoot: string): Promise<InstallResult> {
    const manifest = await fetchJson<VoiceInputRuntimeManifest>(descriptor.runtimeManifestUrl)
    const asset = resolvePlatformAsset(manifest)
    const paths = getRuntimeFilePaths(extensionRoot, asset, manifest)

    await ensureDir(paths.binDir)
    await ensureDir(paths.modelsDir)
    await ensureDir(paths.tempDir)

    await downloadFile(asset.url, paths.runtimePath)
    await verifySha256(paths.runtimePath, asset.sha256)

    if (process.platform !== 'win32') {
      await fs.chmod(paths.runtimePath, 0o755)
    }

    await downloadFile(manifest.model.url, paths.modelPath)
    await verifySha256(paths.modelPath, manifest.model.sha256)

    const installResult: InstallResult = {
      runtimeVersion: manifest.runtimeVersion,
      modelVersion: manifest.model.version,
      runtimeEntrypoint: paths.runtimePath,
      modelPath: paths.modelPath,
    }

    await fs.writeFile(
      path.join(extensionRoot, 'installation.json'),
      `${JSON.stringify(installResult, null, 2)}\n`,
      'utf8',
    )

    return installResult
  }

  async removeRuntime(extensionRoot: string): Promise<void> {
    await fs.rm(extensionRoot, { recursive: true, force: true })
  }

  async transcribe(request: VoiceInputTranscriptionRequest, extensionRoot: string): Promise<VoiceInputTranscriptionResult> {
    const inspection = await this.inspectInstallation(extensionRoot)
    if (!inspection.ready || !inspection.runtimeEntrypoint || !inspection.modelPath) {
      return {
        ok: false,
        text: '',
        error: inspection.error || 'Voice Input is not installed',
      }
    }

    const tempDir = path.join(extensionRoot, 'temp')
    await ensureDir(tempDir)
    const tempBaseName = `voice-input-${Date.now()}`
    const tempAudioPath = path.join(tempDir, `${tempBaseName}.wav`)

    try {
      await fs.writeFile(tempAudioPath, Buffer.from(request.audioData))

      const result = await new Promise<VoiceInputTranscriptionResult>((resolve) => {
        const child = spawn(inspection.runtimeEntrypoint!, [
          '-m',
          inspection.modelPath!,
          '-f',
          tempAudioPath,
          '-l',
          request.language || 'en',
          '-nt',
          '-np',
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
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
          resolve({
            ok: false,
            text: '',
            error: error.message,
          })
        })

        child.on('close', (code) => {
          if (code !== 0) {
            resolve({
              ok: false,
              text: '',
              error: stderr.trim() || `Runtime exited with code ${code}`,
            })
            return
          }

          resolve({
            ok: true,
            text: stdout.trim(),
            error: null,
          })
        })
      })

      return result
    } finally {
      await fs.rm(tempAudioPath, { force: true })
    }
  }
}
