import * as fs from 'fs/promises'
import * as path from 'path'
import { getExtensionCatalog, getExtensionDescriptor } from './extensionCatalog'
import type {
  ExtensionId,
  ManagedExtensionRecord,
  ManagedExtensionState,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
} from './types'
import { VoiceInputRuntimeService } from './voice-input/voiceInputRuntimeService'

type RegistryDocument = {
  version: 1
  extensions: Partial<Record<ExtensionId, ManagedExtensionRecord>>
}

const REGISTRY_FILE_NAME = 'registry.json'

function createDefaultRecord(id: ExtensionId): ManagedExtensionRecord {
  return {
    id,
    status: 'not-installed',
    message: '',
    installedAt: null,
    runtimeVersion: null,
    modelVersion: null,
    runtimeEntrypoint: null,
    modelPath: null,
    lastError: null,
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

export class ManagedExtensionService {
  private readonly runtimeService = new VoiceInputRuntimeService()

  constructor(private readonly userDataPath: string) {}

  private getExtensionsRoot(): string {
    return path.join(this.userDataPath, 'extensions')
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
      const parsed = JSON.parse(raw) as RegistryDocument
      return {
        version: 1,
        extensions: parsed.extensions || {},
      }
    } catch {
      return {
        version: 1,
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
      message: record.message,
      installedAt: record.installedAt,
      runtimeVersion: record.runtimeVersion,
      modelVersion: record.modelVersion,
      lastError: record.lastError,
    }
  }

  async listExtensions(): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    const result: ManagedExtensionState[] = []

    for (const descriptor of getExtensionCatalog()) {
      const record = registry.extensions[descriptor.id] || createDefaultRecord(descriptor.id)

      if (record.status === 'installed') {
        const inspection = await this.runtimeService.inspectInstallation(this.getExtensionRoot(descriptor.id))
        if (!inspection.ready) {
          record.status = 'error'
          record.message = 'Runtime installation is incomplete. Reinstall Voice Input.'
          record.lastError = inspection.error
          record.runtimeVersion = inspection.runtimeVersion
          record.modelVersion = inspection.modelVersion
          registry.extensions[descriptor.id] = record
        }
      }

      result.push(this.toState(record))
    }

    await this.writeRegistry(registry)
    return result
  }

  async install(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const descriptor = getExtensionDescriptor(id)
    const registry = await this.readRegistry()
    const record = registry.extensions[id] || createDefaultRecord(id)

    record.status = 'installing'
    record.message = 'Downloading Voice Input runtime...'
    record.lastError = null
    registry.extensions[id] = record
    await this.writeRegistry(registry)

    try {
      const installResult = await this.runtimeService.installRuntime(descriptor, this.getExtensionRoot(id))
      record.status = 'installed'
      record.message = 'Voice Input is ready.'
      record.installedAt = new Date().toISOString()
      record.runtimeVersion = installResult.runtimeVersion
      record.modelVersion = installResult.modelVersion
      record.runtimeEntrypoint = installResult.runtimeEntrypoint
      record.modelPath = installResult.modelPath
      record.lastError = null
    } catch (error) {
      record.status = 'error'
      record.message = 'Failed to install Voice Input.'
      record.lastError = error instanceof Error ? error.message : 'Unknown install error'
    }

    registry.extensions[id] = record
    await this.writeRegistry(registry)
    return await this.listExtensions()
  }

  async remove(id: ExtensionId): Promise<ManagedExtensionState[]> {
    const registry = await this.readRegistry()
    await this.runtimeService.removeRuntime(this.getExtensionRoot(id))
    registry.extensions[id] = createDefaultRecord(id)
    await this.writeRegistry(registry)
    return await this.listExtensions()
  }

  async reinstall(id: ExtensionId): Promise<ManagedExtensionState[]> {
    await this.remove(id)
    return await this.install(id)
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
    return await this.runtimeService.transcribe(request, this.getExtensionRoot('voice-input'))
  }
}
