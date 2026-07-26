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
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import { appConfigProvider } from '../../../config/app-config-provider.js';
import {
  getBuiltInLlmProviderCatalog,
  type BuiltInLlmProviderCatalog,
} from '../../../llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js';
import {
  getLlmProviderService,
  type LlmProviderService,
} from '../../../llm-management/llm-providers/services/llm-provider-service.js';
import type {
  GeminiConfigurationOption,
  GeminiConfigurationState,
} from '../../../llm-management/services/gemini-configuration-service.js';
import { getModelCatalogService } from '../../../llm-management/services/model-catalog-service.js';
import type { CredentialStatusProjection } from '../../../llm-management/llm-providers/domain/models.js';
import {
  GeminiConfigurationOperationResultObject,
  GeminiConfigurationOptionGraphql,
  GeminiConfigurationStateGraphql,
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
class CredentialStatusObject implements CredentialStatusProjection {
  @Field(() => String)
  vaultHealth!: CredentialStatusProjection['vaultHealth'];

  @Field(() => String, { nullable: true })
  storageState!: CredentialStatusProjection['storageState'];

  @Field(() => String, { nullable: true })
  instructionCode!: string | null;
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

  @Field(() => CredentialStatusObject, { nullable: true })
  credentialStatus!: CredentialStatusObject | null;

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
  @Field(() => GeminiConfigurationOptionGraphql, { nullable: true })
  activeMode!: GeminiConfigurationOption | null;

  @Field(() => CredentialStatusObject)
  aiStudioCredentialStatus!: CredentialStatusObject;

  @Field(() => CredentialStatusObject)
  vertexExpressCredentialStatus!: CredentialStatusObject;

  @Field(() => GeminiConfigurationStateGraphql)
  vertexProjectStatus!: GeminiConfigurationState;

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

  @Query(() => CredentialStatusObject, { nullable: true })
  async getLlmProviderCredentialStatus(
    @Arg('providerId', () => String) providerId: string,
  ): Promise<CredentialStatusObject | null> {
    try {
      return await this.llmProviderService.getProviderCredentialStatus(providerId);
    } catch {
      return null;
    }
  }

  @Query(() => GeminiSetupConfig)
  async getGeminiSetupConfig(): Promise<GeminiSetupConfig> {
    return this.llmProviderService.getGeminiConfigurationStatus();
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


  @Query(() => [ProviderWithModels])
  async availableVideoProvidersWithModels(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderWithModels[]> {
    const models = (await this.runtimeModelCatalogService.listVideoModels(runtimeKind)).map(mapMultimediaModel);
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
      return `Credential for provider ${provider.name} has been set successfully.`;
    } catch {
      return 'Error setting credential: PROVIDER_CREDENTIAL_REJECTED';
    }
  }

  @Mutation(() => String)
  async removeLlmProviderApiKey(
    @Arg('providerId', () => String) providerId: string,
  ): Promise<string> {
    try {
      const provider = await this.llmProviderService.removeProviderApiKey(providerId);
      return `Credential for provider ${provider.name} has been removed successfully.`;
    } catch {
      return 'Error removing credential: PROVIDER_CREDENTIAL_REMOVE_REJECTED';
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
    } catch {
      return 'Error deleting custom provider: CUSTOM_PROVIDER_DELETE_REJECTED';
    }
  }

  @Mutation(() => GeminiConfigurationOperationResultObject)
  async saveGeminiConfigurationOption(
    @Arg('option', () => GeminiConfigurationOptionGraphql)
    option: GeminiConfigurationOptionGraphql,
    @Arg('geminiApiKey', () => String, { nullable: true }) geminiApiKey?: string | null,
    @Arg('vertexApiKey', () => String, { nullable: true }) vertexApiKey?: string | null,
    @Arg('vertexProject', () => String, { nullable: true }) vertexProject?: string | null,
    @Arg('vertexLocation', () => String, { nullable: true }) vertexLocation?: string | null,
  ): Promise<GeminiConfigurationOperationResultObject> {
    try {
      const selectedOption = option as GeminiConfigurationOption;

      const normalizedGeminiApiKey = normalizeText(geminiApiKey);
      const normalizedVertexApiKey = normalizeText(vertexApiKey);
      const normalizedVertexProject = normalizeText(vertexProject);
      const normalizedVertexLocation = normalizeText(vertexLocation);

      if (selectedOption === GeminiConfigurationOptionGraphql.AI_STUDIO) {
        if (!normalizedGeminiApiKey) {
          throw new Error('GEMINI_API_KEY_REQUIRED');
        }
        return this.llmProviderService.saveGeminiOptionConfiguration({
          option: selectedOption,
          apiKey: normalizedGeminiApiKey,
        });
      }
      if (selectedOption === GeminiConfigurationOptionGraphql.VERTEX_EXPRESS) {
        if (!normalizedVertexApiKey) {
          throw new Error('VERTEX_AI_API_KEY_REQUIRED');
        }
        return this.llmProviderService.saveGeminiOptionConfiguration({
          option: selectedOption,
          apiKey: normalizedVertexApiKey,
        });
      }

      if (!normalizedVertexProject || !normalizedVertexLocation) {
        throw new Error('VERTEX_PROJECT_CONFIGURATION_REQUIRED');
      }
      return this.llmProviderService.saveGeminiOptionConfiguration({
        option: selectedOption,
        project: normalizedVertexProject,
        location: normalizedVertexLocation,
      });
    } catch {
      throw new Error('GEMINI_CONFIGURATION_SAVE_REJECTED');
    }
  }

  @Mutation(() => GeminiConfigurationOperationResultObject)
  async removeGeminiConfigurationOption(
    @Arg('option', () => GeminiConfigurationOptionGraphql)
    option: GeminiConfigurationOptionGraphql,
  ): Promise<GeminiConfigurationOperationResultObject> {
    try {
      return this.llmProviderService.removeGeminiOptionConfiguration(
        option as GeminiConfigurationOption,
      );
    } catch {
      throw new Error('GEMINI_CONFIGURATION_REMOVE_REJECTED');
    }
  }

  @Mutation(() => GeminiConfigurationOperationResultObject)
  async activateGeminiConfigurationOption(
    @Arg('option', () => GeminiConfigurationOptionGraphql)
    option: GeminiConfigurationOptionGraphql,
  ): Promise<GeminiConfigurationOperationResultObject> {
    try {
      return this.llmProviderService.activateGeminiOption(
        option as GeminiConfigurationOption,
      );
    } catch {
      throw new Error('GEMINI_CONFIGURATION_ACTIVATION_REJECTED');
    }
  }

  @Mutation(() => GeminiConfigurationOperationResultObject)
  async saveAndActivateGeminiConfigurationOption(
    @Arg('option', () => GeminiConfigurationOptionGraphql)
    option: GeminiConfigurationOptionGraphql,
    @Arg('geminiApiKey', () => String, { nullable: true }) geminiApiKey?: string | null,
    @Arg('vertexApiKey', () => String, { nullable: true }) vertexApiKey?: string | null,
    @Arg('vertexProject', () => String, { nullable: true }) vertexProject?: string | null,
    @Arg('vertexLocation', () => String, { nullable: true }) vertexLocation?: string | null,
  ): Promise<GeminiConfigurationOperationResultObject> {
    try {
      const selectedOption = option as GeminiConfigurationOption;
      if (selectedOption === GeminiConfigurationOptionGraphql.AI_STUDIO) {
        return this.llmProviderService.saveAndActivateGeminiOption({
          option: selectedOption,
          apiKey: normalizeText(geminiApiKey),
        });
      }
      if (selectedOption === GeminiConfigurationOptionGraphql.VERTEX_EXPRESS) {
        return this.llmProviderService.saveAndActivateGeminiOption({
          option: selectedOption,
          apiKey: normalizeText(vertexApiKey),
        });
      }
      return this.llmProviderService.saveAndActivateGeminiOption({
        option: selectedOption,
        project: normalizeText(vertexProject),
        location: normalizeText(vertexLocation),
      });
    } catch {
      throw new Error('GEMINI_CONFIGURATION_SAVE_AND_ACTIVATE_REJECTED');
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
      await this.runtimeModelCatalogService.reloadVideoModels(runtimeKind);
      return 'All models (LLM and Multimedia) reloaded successfully.';
    } catch {
      return 'Error reloading models: MODEL_RELOAD_FAILED';
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
    } catch {
      return 'Error reloading models for provider: PROVIDER_MODEL_RELOAD_FAILED';
    }
  }
}
