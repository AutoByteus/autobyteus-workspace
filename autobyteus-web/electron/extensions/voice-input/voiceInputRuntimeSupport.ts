import { createHash } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as tar from 'tar'
import type {
  ExtensionDescriptor,
  ExtensionInstallProgress,
  VoiceInputBackendKind,
  VoiceInputRuntimeManifest,
  VoiceRuntimeAsset,
} from '../types'
import { getCurrentArch, getCurrentPlatform } from '../extensionCatalog'
import { getLoginShellPath } from '../../utils/shellEnv'

export type InstallResult = {
  runtimeVersion: string
  modelVersion: string
  runtimeEntrypoint: string
  modelPath: string
  backendKind: VoiceInputBackendKind
}

export type InstallInspection = {
  ready: boolean
  runtimeEntrypoint: string | null
  modelPath: string | null
  runtimeVersion: string | null
  modelVersion: string | null
  backendKind: VoiceInputBackendKind | null
  error: string | null
}

export type RuntimeInstallProgress = ExtensionInstallProgress & {
  message: string
}

export type RuntimeInstallProgressCallback = (progress: RuntimeInstallProgress) => Promise<void> | void

export type RuntimeFilePaths = {
  runtimeDir: string
  modelsDir: string
  tempDir: string
  downloadsDir: string
  runtimeBundlePath: string
  runtimeEntrypoint: string
  modelPath: string
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

const runtimeFetch: typeof fetch = globalThis.fetch
  ? globalThis.fetch.bind(globalThis)
  : (async () => {
      throw new Error('Fetch API is unavailable in the Electron runtime process')
    }) as typeof fetch

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await runtimeFetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download JSON from ${url}: ${response.status} ${response.statusText}`)
  }
  return await response.json() as T
}

export async function downloadFile(
  url: string,
  targetPath: string,
  onProgress?: RuntimeInstallProgressCallback,
): Promise<void> {
  const response = await runtimeFetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.status} ${response.statusText}`)
  }

  const body = response.body
  const totalHeader = response.headers.get('content-length')
  const totalBytes = totalHeader ? Number(totalHeader) : null

  if (!body) {
    const arrayBuffer = await response.arrayBuffer()
    await fs.writeFile(targetPath, Buffer.from(arrayBuffer))
    if (onProgress) {
      await onProgress({
        phase: 'downloading-runtime',
        message: 'Downloading runtime bundle...',
        percent: 100,
        bytesReceived: arrayBuffer.byteLength,
        bytesTotal: arrayBuffer.byteLength,
      })
    }
    return
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let bytesReceived = 0
  let lastPercent = -1
  let emittedUnknownLength = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    if (!value) {
      continue
    }

    chunks.push(value)
    bytesReceived += value.byteLength

    if (!onProgress) {
      continue
    }

    const percent = totalBytes && totalBytes > 0
      ? Math.max(0, Math.min(100, Math.round((bytesReceived / totalBytes) * 100)))
      : null

    if ((percent === null && !emittedUnknownLength) || (percent !== null && percent !== lastPercent)) {
      if (percent === null) {
        emittedUnknownLength = true
      }
      lastPercent = percent ?? lastPercent
      await onProgress({
        phase: 'downloading-runtime',
        message: percent === null
          ? 'Downloading runtime bundle...'
          : `Downloading runtime bundle... ${percent}%`,
        percent,
        bytesReceived,
        bytesTotal: totalBytes,
      })
    }
  }

  await fs.writeFile(targetPath, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))

  if (onProgress && totalBytes && lastPercent < 100) {
    await onProgress({
      phase: 'downloading-runtime',
      message: 'Downloading runtime bundle... 100%',
      percent: 100,
      bytesReceived,
      bytesTotal: totalBytes,
    })
  }
}

async function computeSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  hash.update(await fs.readFile(filePath))
  return hash.digest('hex')
}

export async function verifySha256(filePath: string, expectedSha256: string): Promise<void> {
  const actualSha256 = await computeSha256(filePath)
  if (actualSha256 !== expectedSha256) {
    throw new Error(`Checksum mismatch for ${path.basename(filePath)}`)
  }
}

export function resolvePlatformAsset(manifest: VoiceInputRuntimeManifest): VoiceRuntimeAsset {
  const platform = getCurrentPlatform()
  const arch = getCurrentArch()
  const asset = manifest.assets.find((candidate) => candidate.platform === platform && candidate.arch === arch)
  if (!asset) {
    throw new Error(`No runtime asset found for ${platform}/${arch}`)
  }
  return asset
}

export async function extractArchive(archivePath: string, destinationDir: string): Promise<void> {
  await ensureDir(destinationDir)
  await tar.x({
    cwd: destinationDir,
    file: archivePath,
  })
}

export function getRuntimeFilePaths(extensionRoot: string, asset: VoiceRuntimeAsset): RuntimeFilePaths {
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

export function buildVoiceInputRuntimeEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  loginShellPath: string | null = getLoginShellPath(),
): NodeJS.ProcessEnv {
  if ((platform === 'darwin' || platform === 'linux') && loginShellPath) {
    return {
      ...baseEnv,
      PATH: loginShellPath,
    }
  }

  return {
    ...baseEnv,
  }
}

export async function loadRuntimeManifest(descriptor: ExtensionDescriptor): Promise<VoiceInputRuntimeManifest> {
  return await fetchJson<VoiceInputRuntimeManifest>(descriptor.runtimeManifestUrl)
}
