import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import {
  RuntimeKind,
  runtimeKindFromString,
} from '../../runtime-management/runtime-kind-enum.js';
import {
  getClaudeModelCatalog,
  type ClaudeModelCatalog,
} from './claude-model-catalog.js';
import {
  getCodexModelCatalog,
  type CodexModelCatalog,
} from './codex-model-catalog.js';
import {
  getAudioModelService,
  type AudioModelService,
} from '../../multimedia-management/services/audio-model-service.js';
import {
  getImageModelService,
  type ImageModelService,
} from '../../multimedia-management/services/image-model-service.js';
import {
  getVideoModelService,
  type VideoModelService,
} from '../../multimedia-management/services/video-model-service.js';
import {
  getAutobyteusModelCatalog,
  type AutobyteusModelCatalog,
} from './autobyteus-model-catalog.js';
import {
  getModelMetadataProvisioningService,
  type ModelMetadataProvisioningService,
} from './model-metadata-provisioning-service.js';
import {
  getAutobyteusRemoteModelDiscoveryService,
  type AutobyteusRemoteModelDiscoveryService,
} from './autobyteus-remote-model-discovery-service.js';

const DEFAULT_RUNTIME_KIND = RuntimeKind.AUTOBYTEUS;

export class ModelCatalogService {
  constructor(
    private readonly autobyteusModelCatalog: AutobyteusModelCatalog = getAutobyteusModelCatalog(),
    private readonly claudeModelCatalog: ClaudeModelCatalog = getClaudeModelCatalog(),
    private readonly codexModelCatalog: CodexModelCatalog = getCodexModelCatalog(),
    private readonly audioModelService: AudioModelService = getAudioModelService(),
    private readonly imageModelService: ImageModelService = getImageModelService(),
    private readonly videoModelService: VideoModelService = getVideoModelService(),
    private readonly metadataProvisioningService: ModelMetadataProvisioningService =
      getModelMetadataProvisioningService(),
    private readonly remoteDiscoveryService: AutobyteusRemoteModelDiscoveryService =
      getAutobyteusRemoteModelDiscoveryService(),
  ) {}

  async listLlmModels(runtimeKind?: string | null): Promise<ModelInfo[]> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.CLAUDE_AGENT_SDK:
        return this.claudeModelCatalog.listModels();
      case RuntimeKind.CODEX_APP_SERVER:
        return this.codexModelCatalog.listModels();
      case RuntimeKind.AUTOBYTEUS:
      default:
        return this.metadataProvisioningService.enrich(
          await this.autobyteusModelCatalog.listModels(),
        );
    }
  }

  async reloadLlmModels(runtimeKind?: string | null): Promise<void> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.AUTOBYTEUS:
        this.metadataProvisioningService.invalidate();
        await this.autobyteusModelCatalog.reloadModels();
        return;
      case RuntimeKind.CLAUDE_AGENT_SDK:
      case RuntimeKind.CODEX_APP_SERVER:
      default:
        return;
    }
  }

  async reloadLlmModelsForProvider(
    providerId: string,
    runtimeKind?: string | null,
  ): Promise<number> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.AUTOBYTEUS:
        this.metadataProvisioningService.invalidate();
        return this.autobyteusModelCatalog.reloadModelsForProvider(providerId);
      case RuntimeKind.CLAUDE_AGENT_SDK:
      case RuntimeKind.CODEX_APP_SERVER: {
        const models = await this.listLlmModels(runtimeKind);
        return models.filter((model) => model.provider_id === providerId).length;
      }
      default:
        return 0;
    }
  }

  async listAudioModels(runtimeKind?: string | null): Promise<AudioModel[]> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.AUTOBYTEUS:
        return this.audioModelService.getAvailableModels();
      case RuntimeKind.CLAUDE_AGENT_SDK:
      case RuntimeKind.CODEX_APP_SERVER:
      default:
        return [];
    }
  }

  async reloadAudioModels(runtimeKind?: string | null): Promise<void> {
    if (this.resolveRuntimeKind(runtimeKind) === RuntimeKind.AUTOBYTEUS) {
      await this.audioModelService.reloadModels();
    }
  }

  async listImageModels(runtimeKind?: string | null): Promise<ImageModel[]> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.AUTOBYTEUS:
        return this.imageModelService.getAvailableModels();
      case RuntimeKind.CLAUDE_AGENT_SDK:
      case RuntimeKind.CODEX_APP_SERVER:
      default:
        return [];
    }
  }

  async reloadImageModels(runtimeKind?: string | null): Promise<void> {
    if (this.resolveRuntimeKind(runtimeKind) === RuntimeKind.AUTOBYTEUS) {
      await this.imageModelService.reloadModels();
    }
  }

  async listVideoModels(runtimeKind?: string | null): Promise<VideoModel[]> {
    switch (this.resolveRuntimeKind(runtimeKind)) {
      case RuntimeKind.AUTOBYTEUS:
        return this.videoModelService.getAvailableModels();
      case RuntimeKind.CLAUDE_AGENT_SDK:
      case RuntimeKind.CODEX_APP_SERVER:
      default:
        return [];
    }
  }

  async reloadVideoModels(runtimeKind?: string | null): Promise<void> {
    if (this.resolveRuntimeKind(runtimeKind) === RuntimeKind.AUTOBYTEUS) {
      await this.videoModelService.reloadModels();
    }
  }

  async clearAutobyteusRemoteModels(): Promise<void> {
    await this.remoteDiscoveryService.clearAllWithoutLookup();
    this.metadataProvisioningService.invalidate();
    this.autobyteusModelCatalog.invalidate();
    this.audioModelService.invalidate();
    this.imageModelService.invalidate();
  }

  private resolveRuntimeKind(runtimeKind?: string | null): RuntimeKind {
    return runtimeKindFromString(runtimeKind, DEFAULT_RUNTIME_KIND) ?? DEFAULT_RUNTIME_KIND;
  }
}

let cachedModelCatalogService: ModelCatalogService | null = null;

export const getModelCatalogService = (): ModelCatalogService => {
  if (!cachedModelCatalogService) {
    cachedModelCatalogService = new ModelCatalogService();
  }
  return cachedModelCatalogService;
};
