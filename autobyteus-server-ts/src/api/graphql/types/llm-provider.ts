import {
  Arg,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { GraphQLJSON } from 'graphql-scalars';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { ModelMetadataProvenance } from 'autobyteus-ts/llm/metadata/model-metadata-resolver.js';
import { getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../../../llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js';
import {
  getLlmProviderService,
  type LlmProviderService,
  type ProviderSettings,
} from '../../../llm-management/llm-providers/services/llm-provider-service.js';
import type {
  GeminiConfigurationOption,
  GeminiConfigurationState,
  GeminiSetupStatus,
} from '../../../llm-management/services/gemini-configuration-service.js';
import { getModelCatalogService } from '../../../llm-management/services/model-catalog-service.js';
import {
  GeminiSetupModeGraphql,
  GeminiSetupStateObject,
} from './gemini-configuration.js';

registerEnumType(ModelMetadataProvenance, { name: 'ModelMetadataProvenance' });

@ObjectType()
class ModelDetail {
  @Field(() => String)
  modelIdentifier!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String)
  value!: string;

  @Field(() => String)
  canonicalName!: string;

  @Field(() => String)
  providerId!: string;

  @Field(() => String)
  providerName!: string;

  @Field(() => String)
  providerType!: string;

  @Field(() => String)
  runtime!: string;

  @Field(() => String, { nullable: true })
  hostUrl?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  configSchema?: Record<string, unknown> | null;

  @Field(() => Int, { nullable: true })
  maxContextTokens?: number | null;

  @Field(() => Int, { nullable: true })
  activeContextTokens?: number | null;

  @Field(() => Int, { nullable: true })
  maxInputTokens?: number | null;

  @Field(() => Int, { nullable: true })
  maxOutputTokens?: number | null;

  @Field(() => ModelMetadataProvenance, { nullable: true })
  metadataProvenance?: ModelMetadataProvenance | null;
}

@ObjectType()
class LlmProviderObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  providerType!: string;

  @Field(() => Boolean)
  isCustom!: boolean;

  @Field(() => String, { nullable: true })
  baseUrl!: string | null;

  @Field(() => Boolean)
  apiKeyConfigured!: boolean;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  statusMessage!: string | null;
}

@ObjectType()
class ProviderWithModels {
  @Field(() => LlmProviderObject)
  provider!: LlmProviderObject;

  @Field(() => [ModelDetail])
  models!: ModelDetail[];
}

@ObjectType()
class ProviderSettingsGroup {
  @Field(() => LlmProviderObject)
  provider!: LlmProviderObject;

  @Field(() => [ModelDetail])
  llmModels!: ModelDetail[];

  @Field(() => [ModelDetail])
  audioModels!: ModelDetail[];

  @Field(() => [ModelDetail])
  imageModels!: ModelDetail[];

  @Field(() => [ModelDetail])
  videoModels!: ModelDetail[];
}

@ObjectType()
class CustomProviderProbeModelObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType()
class CustomProviderProbeResultObject {
  @Field(() => [CustomProviderProbeModelObject])
  discoveredModels!: CustomProviderProbeModelObject[];
}

@InputType()
class CustomProviderInputObject {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String)
  apiKey!: string;
}

const mapLlmModel = (model: ModelInfo): ModelDetail => ({
  modelIdentifier: model.model_identifier,
  name: model.display_name,
  description: model.description ?? null,
  value: model.value,
  canonicalName: model.canonical_name,
  providerId: model.provider_id,
  providerName: model.provider_name,
  providerType: model.provider_type,
  runtime: model.runtime,
  hostUrl: model.host_url ?? null,
  configSchema: model.config_schema ?? null,
  maxContextTokens: model.max_context_tokens ?? null,
  activeContextTokens: model.active_context_tokens ?? null,
  maxInputTokens: model.max_input_tokens ?? null,
  maxOutputTokens: model.max_output_tokens ?? null,
  metadataProvenance: model.metadata_provenance ?? null,
});

const mapMultimediaModel = (
  model: AudioModel | ImageModel | VideoModel,
): ModelDetail => ({
  modelIdentifier: model.modelIdentifier,
  name: model.name,
  value: model.value,
  canonicalName: model.name,
  providerId: String(model.provider),
  providerName: getLlmProviderDisplayName(String(model.provider) as LLMProvider),
  providerType: String(model.provider),
  runtime: String(model.runtime),
  hostUrl: model.hostUrl ?? null,
  configSchema: model.parameterSchema?.toJsonSchemaDict?.() ?? null,
  maxContextTokens: null,
  activeContextTokens: null,
  maxInputTokens: null,
  maxOutputTokens: null,
  metadataProvenance: null,
});

const sortModels = (models: ModelDetail[]): ModelDetail[] =>
  models.slice().sort((left, right) => left.name.localeCompare(right.name));

const groupModelsByProvider = (models: ModelDetail[]): Map<string, ModelDetail[]> => {
  const grouped = new Map<string, ModelDetail[]>();
  for (const model of models) {
    grouped.set(model.providerId, [...(grouped.get(model.providerId) ?? []), model]);
  }
  return grouped;
};

const configuredBoolean = (state: GeminiConfigurationState): boolean | null =>
  state === 'UNAVAILABLE' ? null : state === 'CONFIGURED';

const mapGeminiSetup = (setup: GeminiSetupStatus): GeminiSetupStateObject => ({
  activeMode: setup.activeMode,
  aiStudioConfigured: configuredBoolean(setup.aiStudioStatus),
  vertexExpressConfigured: configuredBoolean(setup.vertexExpressStatus),
  vertexProject: setup.vertexProjectStatus === 'CONFIGURED' && setup.project && setup.location
    ? { project: setup.project, location: setup.location }
    : null,
});

const mapProviderSettings = (group: ProviderSettings): ProviderSettingsGroup => ({
  provider: group.provider,
  llmModels: sortModels(group.llmModels.map(mapLlmModel)),
  audioModels: sortModels(group.audioModels.map(mapMultimediaModel)),
  imageModels: sortModels(group.imageModels.map(mapMultimediaModel)),
  videoModels: sortModels(group.videoModels.map(mapMultimediaModel)),
});

@Resolver()
export class LlmProviderResolver {
  private get runtimeModelCatalogService() {
    return getModelCatalogService();
  }

  private get llmProviderService(): LlmProviderService {
    return getLlmProviderService();
  }

  private get builtInLlmProviderCatalog(): BuiltInLlmProviderCatalog {
    return getBuiltInLlmProviderCatalog();
  }

  @Query(() => [ProviderSettingsGroup])
  async providerSettings(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderSettingsGroup[]> {
    return (await this.llmProviderService.listProviderSettings(runtimeKind)).map(mapProviderSettings);
  }

  @Query(() => GeminiSetupStateObject)
  async getGeminiSetupConfig(): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.getGeminiConfigurationStatus());
  }

  @Query(() => [ProviderWithModels])
  async availableLlmProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    return this.llmProviderService.listProvidersWithModels(runtimeKind, mapLlmModel);
  }

  @Query(() => [ProviderWithModels])
  async availableAudioProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    return this.groupMultimediaModels(
      await this.runtimeModelCatalogService.listAudioModels(runtimeKind),
    );
  }

  @Query(() => [ProviderWithModels])
  async availableImageProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    return this.groupMultimediaModels(
      await this.runtimeModelCatalogService.listImageModels(runtimeKind),
    );
  }

  @Query(() => [ProviderWithModels])
  async availableVideoProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    return this.groupMultimediaModels(
      await this.runtimeModelCatalogService.listVideoModels(runtimeKind),
    );
  }

  @Mutation(() => Boolean)
  async saveProviderApiKey(
    @Arg('providerId', () => String) providerId: string,
    @Arg('apiKey', () => String) apiKey: string,
  ): Promise<boolean> {
    await this.llmProviderService.setProviderApiKey(providerId, apiKey);
    return true;
  }

  @Mutation(() => Boolean)
  async removeProviderApiKey(
    @Arg('providerId', () => String) providerId: string,
  ): Promise<boolean> {
    await this.llmProviderService.removeProviderApiKey(providerId);
    return true;
  }

  @Mutation(() => CustomProviderProbeResultObject)
  async probeCustomProvider(
    @Arg('input', () => CustomProviderInputObject) input: CustomProviderInputObject,
  ): Promise<CustomProviderProbeResultObject> {
    return this.llmProviderService.probeCustomProvider(input);
  }

  @Mutation(() => String)
  async createCustomProvider(
    @Arg('input', () => CustomProviderInputObject) input: CustomProviderInputObject,
  ): Promise<string> {
    return this.llmProviderService.createCustomProvider(input);
  }

  @Mutation(() => Boolean)
  async deleteCustomProvider(
    @Arg('providerId', () => String) providerId: string,
  ): Promise<boolean> {
    await this.llmProviderService.deleteCustomProvider(providerId);
    return true;
  }

  @Mutation(() => GeminiSetupStateObject)
  async saveGeminiAiStudio(
    @Arg('apiKey', () => String) apiKey: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'AI_STUDIO', apiKey },
      activateAfterSave,
    ));
  }

  @Mutation(() => GeminiSetupStateObject)
  async saveGeminiVertexExpress(
    @Arg('apiKey', () => String) apiKey: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'VERTEX_EXPRESS', apiKey },
      activateAfterSave,
    ));
  }

  @Mutation(() => GeminiSetupStateObject)
  async saveGeminiVertexProject(
    @Arg('project', () => String) project: string,
    @Arg('location', () => String) location: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'VERTEX_PROJECT', project, location },
      activateAfterSave,
    ));
  }

  @Mutation(() => GeminiSetupStateObject)
  async useGeminiMode(
    @Arg('mode', () => GeminiSetupModeGraphql) mode: GeminiSetupModeGraphql,
  ): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.activateGeminiOption(
      mode as GeminiConfigurationOption,
    ));
  }

  @Mutation(() => GeminiSetupStateObject)
  async removeGeminiConfiguration(
    @Arg('mode', () => GeminiSetupModeGraphql) mode: GeminiSetupModeGraphql,
  ): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.removeGeminiOptionConfiguration(
      mode as GeminiConfigurationOption,
    ));
  }

  @Mutation(() => String)
  async reloadLlmModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<string> {
    await this.runtimeModelCatalogService.reloadLlmModels(runtimeKind);
    await this.runtimeModelCatalogService.reloadAudioModels(runtimeKind);
    await this.runtimeModelCatalogService.reloadImageModels(runtimeKind);
    await this.runtimeModelCatalogService.reloadVideoModels(runtimeKind);
    return 'All models (LLM and Multimedia) reloaded successfully.';
  }

  @Mutation(() => String)
  async reloadLlmProviderModels(
    @Arg('providerId', () => String) providerId: string,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<string> {
    const count = await this.llmProviderService.reloadProviderModels(providerId, runtimeKind);
    return `Reloaded ${count} models for provider ${providerId} successfully.`;
  }

  private groupMultimediaModels(
    models: Array<AudioModel | ImageModel | VideoModel>,
  ): ProviderWithModels[] {
    const grouped = groupModelsByProvider(models.map(mapMultimediaModel));
    return Array.from(grouped.entries())
      .map(([providerId, items]) => ({
        provider: this.builtInLlmProviderCatalog.getProvider(providerId as LLMProvider),
        models: sortModels(items),
      }))
      .sort((left, right) => left.provider.name.localeCompare(right.provider.name));
  }
}
