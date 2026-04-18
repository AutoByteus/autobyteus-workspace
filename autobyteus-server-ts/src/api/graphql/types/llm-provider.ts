import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver, InputType } from 'type-graphql';
import { GraphQLJSON } from 'graphql-scalars';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../../../llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js';
import {
  getLlmProviderService,
  type LlmProviderService,
} from '../../../llm-management/llm-providers/services/llm-provider-service.js';
import { getModelCatalogService } from '../../../llm-management/services/model-catalog-service.js';

const GEMINI_SETUP_MODES = {
  AI_STUDIO: 'AI_STUDIO',
  VERTEX_EXPRESS: 'VERTEX_EXPRESS',
  VERTEX_PROJECT: 'VERTEX_PROJECT',
} as const;

type GeminiSetupMode = (typeof GEMINI_SETUP_MODES)[keyof typeof GEMINI_SETUP_MODES];

@ObjectType()
class ModelDetail {
  @Field(() => String)
  modelIdentifier!: string;

  @Field(() => String)
  name!: string;

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
class GeminiSetupConfig {
  @Field(() => String)
  mode!: GeminiSetupMode;

  @Field(() => Boolean)
  geminiApiKeyConfigured!: boolean;

  @Field(() => Boolean)
  vertexApiKeyConfigured!: boolean;

  @Field(() => String, { nullable: true })
  vertexProject!: string | null;

  @Field(() => String, { nullable: true })
  vertexLocation!: string | null;
}

@ObjectType()
class CustomLlmProviderProbeModelObject {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType()
class CustomLlmProviderProbeResultObject {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  providerType!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => [CustomLlmProviderProbeModelObject])
  discoveredModels!: CustomLlmProviderProbeModelObject[];
}

@InputType()
class CustomLlmProviderInputObject {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  providerType!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String)
  apiKey!: string;
}

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const getCurrentGeminiSetup = (): GeminiSetupConfig => {
  const config = appConfigProvider.config;
  const geminiApiKey = normalizeText(config.get('GEMINI_API_KEY'));
  const vertexApiKey = normalizeText(config.get('VERTEX_AI_API_KEY'));
  const vertexProject = normalizeText(config.get('VERTEX_AI_PROJECT'));
  const vertexLocation = normalizeText(config.get('VERTEX_AI_LOCATION'));

  let mode: GeminiSetupMode = GEMINI_SETUP_MODES.AI_STUDIO;
  if (vertexApiKey) {
    mode = GEMINI_SETUP_MODES.VERTEX_EXPRESS;
  } else if (vertexProject || vertexLocation) {
    mode = GEMINI_SETUP_MODES.VERTEX_PROJECT;
  }

  return {
    mode,
    geminiApiKeyConfigured: Boolean(geminiApiKey),
    vertexApiKeyConfigured: Boolean(vertexApiKey),
    vertexProject: vertexProject || null,
    vertexLocation: vertexLocation || null,
  };
};

const clearGeminiModeFields = (mode: GeminiSetupMode): void => {
  const config = appConfigProvider.config;
  if (mode !== GEMINI_SETUP_MODES.AI_STUDIO) {
    config.set('GEMINI_API_KEY', '');
  }
  if (mode !== GEMINI_SETUP_MODES.VERTEX_EXPRESS) {
    config.set('VERTEX_AI_API_KEY', '');
  }
  if (mode !== GEMINI_SETUP_MODES.VERTEX_PROJECT) {
    config.set('VERTEX_AI_PROJECT', '');
    config.set('VERTEX_AI_LOCATION', '');
  }
};

const mapLlmModel = (model: ModelInfo): ModelDetail => ({
  modelIdentifier: model.model_identifier,
  name: model.display_name,
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
});

const mapMultimediaModel = (
  model: AudioModel | ImageModel,
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
});

const sortModels = (models: ModelDetail[]): ModelDetail[] =>
  models.slice().sort((a, b) => a.name.localeCompare(b.name));

const groupModelsByProvider = (models: ModelDetail[]): Map<string, ModelDetail[]> => {
  const grouped = new Map<string, ModelDetail[]>();
  for (const model of models) {
    const list = grouped.get(model.providerId) ?? [];
    list.push(model);
    grouped.set(model.providerId, list);
  }
  return grouped;
};

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

  @Query(() => Boolean)
  async getLlmProviderApiKeyConfigured(@Arg('providerId', () => String) providerId: string): Promise<boolean> {
    try {
      return await this.llmProviderService.getProviderApiKeyConfigured(providerId);
    } catch (error) {
      console.error(`Error retrieving API key configured status: ${String(error)}`);
      return false;
    }
  }

  @Query(() => GeminiSetupConfig)
  getGeminiSetupConfig(): GeminiSetupConfig {
    return getCurrentGeminiSetup();
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
    const models = (await this.runtimeModelCatalogService.listAudioModels(runtimeKind)).map(mapMultimediaModel);
    const grouped = groupModelsByProvider(models);

    return Array.from(grouped.entries())
      .map(([providerId, items]) => ({
        provider: this.builtInLlmProviderCatalog.getProvider(providerId as LLMProvider),
        models: sortModels(items),
      }))
      .sort((a, b) => a.provider.name.localeCompare(b.provider.name));
  }

  @Query(() => [ProviderWithModels])
  async availableImageProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    const models = (await this.runtimeModelCatalogService.listImageModels(runtimeKind)).map(mapMultimediaModel);
    const grouped = groupModelsByProvider(models);

    return Array.from(grouped.entries())
      .map(([providerId, items]) => ({
        provider: this.builtInLlmProviderCatalog.getProvider(providerId as LLMProvider),
        models: sortModels(items),
      }))
      .sort((a, b) => a.provider.name.localeCompare(b.provider.name));
  }

  @Mutation(() => String)
  async setLlmProviderApiKey(
    @Arg('providerId', () => String) providerId: string,
    @Arg('apiKey', () => String) apiKey: string,
  ): Promise<string> {
    try {
      const provider = await this.llmProviderService.setProviderApiKey(providerId, apiKey);
      return `API key for provider ${provider.name} has been set successfully.`;
    } catch (error) {
      return `Error setting API key: ${String(error)}`;
    }
  }

  @Mutation(() => CustomLlmProviderProbeResultObject)
  async probeCustomLlmProvider(
    @Arg('input', () => CustomLlmProviderInputObject) input: CustomLlmProviderInputObject,
  ): Promise<CustomLlmProviderProbeResultObject> {
    return this.llmProviderService.probeCustomProvider(input);
  }

  @Mutation(() => LlmProviderObject)
  async createCustomLlmProvider(
    @Arg('input', () => CustomLlmProviderInputObject) input: CustomLlmProviderInputObject,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<LlmProviderObject> {
    return this.llmProviderService.createCustomProvider(input, runtimeKind);
  }

  @Mutation(() => String)
  async deleteCustomLlmProvider(
    @Arg('providerId', () => String) providerId: string,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<string> {
    try {
      const providerName = await this.llmProviderService.deleteCustomProvider(providerId, runtimeKind);
      return `Deleted custom provider ${providerName} successfully.`;
    } catch (error) {
      return `Error deleting custom provider ${providerId}: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  setGeminiSetupConfig(
    @Arg('mode', () => String) mode: string,
    @Arg('geminiApiKey', () => String, { nullable: true }) geminiApiKey?: string | null,
    @Arg('vertexApiKey', () => String, { nullable: true }) vertexApiKey?: string | null,
    @Arg('vertexProject', () => String, { nullable: true }) vertexProject?: string | null,
    @Arg('vertexLocation', () => String, { nullable: true }) vertexLocation?: string | null,
  ): string {
    try {
      const normalizedMode = normalizeText(mode).toUpperCase();
      if (!Object.values(GEMINI_SETUP_MODES).includes(normalizedMode as GeminiSetupMode)) {
        throw new Error(
          `Invalid Gemini setup mode '${mode}'. Use one of: ${Object.values(GEMINI_SETUP_MODES).join(', ')}`,
        );
      }

      const selectedMode = normalizedMode as GeminiSetupMode;
      const config = appConfigProvider.config;
      const normalizedGeminiApiKey = normalizeText(geminiApiKey);
      const normalizedVertexApiKey = normalizeText(vertexApiKey);
      const normalizedVertexProject = normalizeText(vertexProject);
      const normalizedVertexLocation = normalizeText(vertexLocation);

      if (selectedMode === GEMINI_SETUP_MODES.AI_STUDIO) {
        if (!normalizedGeminiApiKey) {
          throw new Error('GEMINI_API_KEY is required for AI_STUDIO mode.');
        }
        config.set('GEMINI_API_KEY', normalizedGeminiApiKey);
      } else if (selectedMode === GEMINI_SETUP_MODES.VERTEX_EXPRESS) {
        if (!normalizedVertexApiKey) {
          throw new Error('VERTEX_AI_API_KEY is required for VERTEX_EXPRESS mode.');
        }
        config.set('VERTEX_AI_API_KEY', normalizedVertexApiKey);
      } else {
        if (!normalizedVertexProject || !normalizedVertexLocation) {
          throw new Error(
            'Both VERTEX_AI_PROJECT and VERTEX_AI_LOCATION are required for VERTEX_PROJECT mode.',
          );
        }
        config.set('VERTEX_AI_PROJECT', normalizedVertexProject);
        config.set('VERTEX_AI_LOCATION', normalizedVertexLocation);
      }

      clearGeminiModeFields(selectedMode);
      return `Gemini setup for mode ${selectedMode} has been saved successfully.`;
    } catch (error) {
      return `Error saving Gemini setup: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  async reloadLlmModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<string> {
    try {
      await this.runtimeModelCatalogService.reloadLlmModels(runtimeKind);
      await this.runtimeModelCatalogService.reloadAudioModels(runtimeKind);
      await this.runtimeModelCatalogService.reloadImageModels(runtimeKind);
      return 'All models (LLM and Multimedia) reloaded successfully.';
    } catch (error) {
      return `Error reloading models: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  async reloadLlmProviderModels(
    @Arg('providerId', () => String) providerId: string,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<string> {
    if (!providerId) {
      return 'Error reloading provider models: providerId must be specified.';
    }

    try {
      const count = await this.llmProviderService.reloadProviderModels(providerId, runtimeKind);
      return `Reloaded ${count} models for provider ${providerId} successfully.`;
    } catch (error) {
      return `Error reloading models for provider ${providerId}: ${String(error)}`;
    }
  }
}
