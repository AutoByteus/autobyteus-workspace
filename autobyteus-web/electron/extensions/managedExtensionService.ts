import * as fs from 'fs/promises'
import * as path from 'path'
import { getExtensionCatalog, getExtensionDescriptor } from './extensionCatalog'
import type {
  ExtensionInstallProgress,
  ExtensionId,
  ManagedExtensionRecord,
  ManagedExtensionState,
  UpdateVoiceInputSettingsPayload,
  VoiceInputLanguageMode,
  VoiceInputSettings,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
} from './types'
import { VoiceInputRuntimeService } from './voice-input/voiceInputRuntimeService'

type RegistryDocument = {
  version: 2
  extensions: Partial<Record<ExtensionId, ManagedExtensionRecord>>
}

const REGISTRY_FILE_NAME = 'registry.json'
const DEFAULT_VOICE_INPUT_SETTINGS: VoiceInputSettings = {
  languageMode: 'auto',
}

function createDefaultRecord(id: ExtensionId): ManagedExtensionRecord {
  return {
    id,
    status: 'not-installed',
    enabled: false,
    settings: { ...DEFAULT_VOICE_INPUT_SETTINGS },
    message: '',
    installProgress: null,
    installedAt: null,
    runtimeVersion: null,
    modelVersion: null,
    runtimeEntrypoint: null,
    modelPath: null,
    backendKind: null,
    lastError: null,
  }
}

function normalizeLanguageMode(value: string | undefined | null): VoiceInputLanguageMode {
  if (value === 'en' || value === 'zh' || value === 'auto') {
    return value
  }
  return DEFAULT_VOICE_INPUT_SETTINGS.languageMode
}

function normalizeRecord(id: ExtensionId, input?: Partial<ManagedExtensionRecord> | null): ManagedExtensionRecord {
  const fallback = createDefaultRecord(id)
  return {
    ...fallback,
    ...input,
    settings: {
      ...fallback.settings,
      ...(input?.settings ?? {}),
      languageMode: normalizeLanguageMode(input?.settings?.languageMode),
    },
    enabled: input?.enabled ?? fallback.enabled,
    backendKind: input?.backendKind ?? fallback.backendKind,
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export class ManagedExtensionService {
  private readonly runtimeService = new VoiceInputRuntimeService()

  constructor(private readonly baseDataPath: string) {}

  private getExtensionsRoot(): string {
    return path.join(this.baseDataPath, 'extensions')
  }

  private getRegistryPath(): string {
    return path.join(this.getExtensionsRoot(), REGISTRY_FILE_NAME)
  }

  private getExtensionRoot(id: ExtensionId): string {
    return path.join(this.getExtensionsRoot(), id)
  }

  private async readRegistry(): Promise<RegistryDocument> {
    await ensureDir(this.getExtensionsRoot())
    try {
      const raw = await fs.readFile(this.getRegistryPath(), 'utf8')
      const parsed = JSON.parse(raw) as { extensions?: Partial<Record<ExtensionId, ManagedExtensionRecord>> }
      return {
        version: 2,
        extensions: parsed.extensions || {},
      }
    } catch {
      return {
        version: 2,
        extensions: {},
      }
    }
  }

  private async writeRegistry(registry: RegistryDocument): Promise<void> {
    await ensureDir(this.getExtensionsRoot())
    await fs.writeFile(this.getRegistryPath(), `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
  }

  private toState(record: ManagedExtensionRecord): ManagedExtensionState {
    const descriptor = getExtensionDescriptor(record.id)
    return {
      id: record.id,
      name: descriptor.name,
      description: descriptor.description,
      status: record.status,
      enabled: record.enabled,
      settings: { ...record.settings },
      message: record.message,
      installProgress: record.installProgress ? { ...record.installProgress } : null,
      installedAt: record.installedAt,
      runtimeVersion: record.runtimeVersion,
      modelVersion: record.modelVersion,
      backendKind: record.backendKind,
      lastError: record.lastError,
    }
  }

  private async installRecord(
    id: ExtensionId,
    registry: RegistryDocument,
    settings: VoiceInputSettings,
    enabledAfterInstall: boolean,
  ): Promise<ManagedExtensionState[]> {
    const descriptor = getExtensionDescriptor(id)
    const record = normalizeRecord(id, registry.extensions[id])

    record.status = 'installing'
    record.enabled = false
    record.settings = { ...settings }
    record.message = 'Fetching runtime manifest...'
    record.installProgress = {
      phase: 'fetching-manifest',
      percent: null,
      bytesReceived: null,
      bytesTotal: null,
    }
    record.lastError = null
    registry.extensions[id] = record
    await this.writeRegistry(registry)

    try {
      let lastInstallPhase: ExtensionInstallProgress['phase'] | null = record.installProgress.phase
      let lastInstallPercent = record.installProgress.percent

      const installResult = await this.runtimeService.installRuntime(
        descriptor,
        this.getExtensionRoot(id),
        async (progress) => {
          const shouldPersist =
            progress.phase !== lastInstallPhase ||
            progress.percent !== lastInstallPercent ||
            progress.message !== record.message

          if (!shouldPersist) {
            return
          }

          lastInstallPhase = progress.phase
          lastInstallPercent = progress.percent
          record.status = 'installing'
          record.message = progress.message
          record.installProgress = {
            phase: progress.phase,
            percent: progress.percent,
            bytesReceived: progress.bytesReceived,
            bytesTotal: progress.bytesTotal,
          }
          registry.extensions[id] = record
          await this.writeRegistry(registry)
        },
      )
      record.status = 'installed'
      record.enabled = enabledAfterInstall
      record.message = enabledAfterInstall ? 'Voice Input is installed and enabled.' : 'Voice Input is installed and disabled.'
      record.installProgress = null
      record.installedAt = new Date().toISOString()
      record.runtimeVersion = installResult.runtimeVersion
      record.modelVersion = installResult.modelVersion
      record.runtimeEntrypoint = installResult.runtimeEntrypoint
      record.modelPath = installResult.modelPath
      record.backendKind = installResult.backendKind
      record.lastError = null
    } catch (error) {
      record.status = 'error'
      record.enabled = false
      record.message = 'Failed to install Voice Input.'
      record.installProgress = null
      record.lastError = error instanceof Error ? error.message : 'Unknown install error'
    }

    registry.extensions[id] = record
    await this.writeRegistry(registry)
    return this.listExtensions()
  }

  async listExtensions(): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const result: ManagedExtensionState[] = []

    for (const descriptor of getExtensionCatalog()) {
      const record = normalizeRecord(descriptor.id, registry.extensions[descriptor.id])

      if (record.status === 'installed') {
        const inspection = await this.runtimeService.inspectInstallation(this.getExtensionRoot(descriptor.id))
        if (!inspection.ready) {
          record.status = 'error'
          record.enabled = false
          record.message = 'Runtime installation is incomplete. Reinstall Voice Input.'
          record.lastError = inspection.error
          record.runtimeVersion = inspection.runtimeVersion
          record.modelVersion = inspection.modelVersion
          record.backendKind = inspection.backendKind
          registry.extensions[descriptor.id] = record
        }
      }

      result.push(this.toState(record))
    }

    await this.writeRegistry(registry)
    return result
  }

  async install(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const record = normalizeRecord(id, registry.extensions[id])
    return this.installRecord(id, registry, record.settings, false)
  }

  async enable(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const record = normalizeRecord(id, registry.extensions[id])

    if (record.status !== 'installed') {
      throw new Error('Voice Input must be installed before it can be enabled.')
    }

    const inspection = await this.runtimeService.inspectInstallation(this.getExtensionRoot(id))
    if (!inspection.ready) {
      record.status = 'error'
      record.enabled = false
      record.message = 'Runtime installation is incomplete. Reinstall Voice Input.'
      record.lastError = inspection.error
      registry.extensions[id] = record
      await this.writeRegistry(registry)
      return this.listExtensions()
    }

    record.enabled = true
    record.message = 'Voice Input is installed and enabled.'
    registry.extensions[id] = record
    await this.writeRegistry(registry)
    return this.listExtensions()
  }

  async disable(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const record = normalizeRecord(id, registry.extensions[id])

    await this.runtimeService.stopWorkerIfRunning(this.getExtensionRoot(id))

    if (record.status === 'installed') {
      record.enabled = false
      record.message = 'Voice Input is installed and disabled.'
      registry.extensions[id] = record
      await this.writeRegistry(registry)
    }

    return this.listExtensions()
  }

  async updateVoiceInputSettings(id: ExtensionId, payload: UpdateVoiceInputSettingsPayload): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const record = normalizeRecord(id, registry.extensions[id])

    if (record.status === 'not-installed') {
      throw new Error('Voice Input must be installed before settings can be changed.')
    }

    record.settings = {
      languageMode: normalizeLanguageMode(payload.languageMode),
    }
    registry.extensions[id] = record
    await this.writeRegistry(registry)
    return this.listExtensions()
  }

  async remove(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    await this.runtimeService.stopWorkerIfRunning(this.getExtensionRoot(id))
    await this.runtimeService.removeRuntime(this.getExtensionRoot(id))
    registry.extensions[id] = createDefaultRecord(id)
    await this.writeRegistry(registry)
    return this.listExtensions()
  }

  async reinstall(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const previous = normalizeRecord(id, registry.extensions[id])

    await this.runtimeService.stopWorkerIfRunning(this.getExtensionRoot(id))
    await this.runtimeService.removeRuntime(this.getExtensionRoot(id))

    registry.extensions[id] = createDefaultRecord(id)
    await this.writeRegistry(registry)

    const reinstallRegistry = await this.readRegistry()
    return this.installRecord(id, reinstallRegistry, previous.settings, previous.enabled)
  }

  async getInstalledExtensionPath(id: ExtensionId): Promise<string> {
    const extensionRoot = this.getExtensionRoot(id)
    try {
      await fs.access(extensionRoot)
      return extensionRoot
    } catch {
      throw new Error('Voice Input is not installed yet.')
    }
  }

  async transcribeVoiceInput(request: VoiceInputTranscriptionRequest): Promise<VoiceInputTranscriptionResult> {
    const registry = await this.readRegistry()
    const record = normalizeRecord('voice-input', registry.extensions['voice-input'])

    if (record.status !== 'installed') {
      return {
        ok: false,
        text: '',
        detectedLanguage: null,
        noSpeech: false,
        error: 'Voice Input is not installed yet.',
      }
    }

    if (!record.enabled) {
      return {
        ok: false,
        text: '',
        detectedLanguage: null,
        noSpeech: false,
        error: 'Voice Input is installed but disabled.',
      }
    }

    return this.runtimeService.transcribe(
      {
        ...request,
        languageMode: request.languageMode || record.settings.languageMode,
      },
      this.getExtensionRoot('voice-input'),
    )
  }
}
