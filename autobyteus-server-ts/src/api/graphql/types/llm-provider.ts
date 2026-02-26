import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { getLlmModelService } from "../../../llm-management/services/llm-model-service.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { getAudioModelService } from "../../../multimedia-management/services/audio-model-service.js";
import { getImageModelService } from "../../../multimedia-management/services/image-model-service.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";

const GEMINI_SETUP_MODES = {
  AI_STUDIO: "AI_STUDIO",
  VERTEX_EXPRESS: "VERTEX_EXPRESS",
  VERTEX_PROJECT: "VERTEX_PROJECT",
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
  provider!: string;

  @Field(() => String)
  runtime!: string;

  @Field(() => String, { nullable: true })
  hostUrl?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  configSchema?: Record<string, unknown> | null;
}

@ObjectType()
class ProviderWithModels {
  @Field(() => String)
  provider!: string;

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

const mapLlmModel = (model: ModelInfo): ModelDetail => ({
  modelIdentifier: model.model_identifier,
  name: model.display_name,
  value: model.value,
  canonicalName: model.canonical_name,
  provider: model.provider,
  runtime: model.runtime,
  hostUrl: model.host_url ?? null,
  configSchema: model.config_schema ?? null,
});

const mapAudioModel = (model: AudioModel): ModelDetail => ({
  modelIdentifier: model.modelIdentifier,
  name: model.name,
  value: model.value,
  canonicalName: model.name,
  provider: String(model.provider),
  runtime: String(model.runtime),
  hostUrl: model.hostUrl ?? null,
  configSchema: model.parameterSchema?.toJsonSchemaDict?.() ?? null,
});

const mapImageModel = (model: ImageModel): ModelDetail => ({
  modelIdentifier: model.modelIdentifier,
  name: model.name,
  value: model.value,
  canonicalName: model.name,
  provider: String(model.provider),
  runtime: String(model.runtime),
  hostUrl: model.hostUrl ?? null,
  configSchema: model.parameterSchema?.toJsonSchemaDict?.() ?? null,
});

const groupModelsByProvider = (models: ModelDetail[]): Map<string, ModelDetail[]> => {
  const grouped = new Map<string, ModelDetail[]>();
  for (const model of models) {
    const list = grouped.get(model.provider) ?? [];
    list.push(model);
    grouped.set(model.provider, list);
  }
  return grouped;
};

const sortModels = (models: ModelDetail[]): ModelDetail[] =>
  models.slice().sort((a, b) => a.name.localeCompare(b.name));

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? "";

const getCurrentGeminiSetup = (): GeminiSetupConfig => {
  const config = appConfigProvider.config;
  const geminiApiKey = normalizeText(config.get("GEMINI_API_KEY"));
  const vertexApiKey = normalizeText(config.get("VERTEX_AI_API_KEY"));
  const vertexProject = normalizeText(config.get("VERTEX_AI_PROJECT"));
  const vertexLocation = normalizeText(config.get("VERTEX_AI_LOCATION"));

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
    config.set("GEMINI_API_KEY", "");
  }
  if (mode !== GEMINI_SETUP_MODES.VERTEX_EXPRESS) {
    config.set("VERTEX_AI_API_KEY", "");
  }
  if (mode !== GEMINI_SETUP_MODES.VERTEX_PROJECT) {
    config.set("VERTEX_AI_PROJECT", "");
    config.set("VERTEX_AI_LOCATION", "");
  }
};

@Resolver()
export class LlmProviderResolver {
  private get llmModelService() {
    return getLlmModelService();
  }

  private get audioModelService() {
    return getAudioModelService();
  }

  private get imageModelService() {
    return getImageModelService();
  }

  @Query(() => String, { nullable: true })
  getLlmProviderApiKey(@Arg("provider", () => String) provider: string): string | null {
    try {
      const apiKey = appConfigProvider.config.getLlmApiKey(provider);
      return apiKey ?? null;
    } catch (error) {
      console.error(`Error retrieving API key: ${String(error)}`);
      return null;
    }
  }

  @Query(() => GeminiSetupConfig)
  getGeminiSetupConfig(): GeminiSetupConfig {
    return getCurrentGeminiSetup();
  }

  @Query(() => [ProviderWithModels])
  async availableLlmProvidersWithModels(): Promise<ProviderWithModels[]> {
    const modelsInfo = await this.llmModelService.getAvailableModels();
    const modelDetails = modelsInfo.map(mapLlmModel);
    const grouped = groupModelsByProvider(modelDetails);

    const providers: ProviderWithModels[] = Object.values(LLMProvider).map((provider) => ({
      provider,
      models: sortModels(grouped.get(provider) ?? []),
    }));

    return providers.sort((a, b) => a.provider.localeCompare(b.provider));
  }

  @Query(() => [ProviderWithModels])
  async availableAudioProvidersWithModels(): Promise<ProviderWithModels[]> {
    const models = (await this.audioModelService.getAvailableModels()).map(mapAudioModel);
    const grouped = groupModelsByProvider(models);

    const providers = Array.from(grouped.entries()).map(([provider, items]) => ({
      provider,
      models: sortModels(items),
    }));

    return providers.sort((a, b) => a.provider.localeCompare(b.provider));
  }

  @Query(() => [ProviderWithModels])
  async availableImageProvidersWithModels(): Promise<ProviderWithModels[]> {
    const models = (await this.imageModelService.getAvailableModels()).map(mapImageModel);
    const grouped = groupModelsByProvider(models);

    const providers = Array.from(grouped.entries()).map(([provider, items]) => ({
      provider,
      models: sortModels(items),
    }));

    return providers.sort((a, b) => a.provider.localeCompare(b.provider));
  }

  @Mutation(() => String)
  setLlmProviderApiKey(
    @Arg("provider", () => String) provider: string,
    @Arg("apiKey", () => String) apiKey: string,
  ): string {
    try {
      if (!provider || !apiKey) {
        throw new Error("Both provider and api_key must be provided.");
      }
      appConfigProvider.config.setLlmApiKey(provider, apiKey);
      return `API key for provider ${provider} has been set successfully.`;
    } catch (error) {
      return `Error setting API key: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  setGeminiSetupConfig(
    @Arg("mode", () => String) mode: string,
    @Arg("geminiApiKey", () => String, { nullable: true }) geminiApiKey?: string | null,
    @Arg("vertexApiKey", () => String, { nullable: true }) vertexApiKey?: string | null,
    @Arg("vertexProject", () => String, { nullable: true }) vertexProject?: string | null,
    @Arg("vertexLocation", () => String, { nullable: true }) vertexLocation?: string | null,
  ): string {
    try {
      const normalizedMode = normalizeText(mode).toUpperCase();
      if (!Object.values(GEMINI_SETUP_MODES).includes(normalizedMode as GeminiSetupMode)) {
        throw new Error(
          `Invalid Gemini setup mode '${mode}'. Use one of: ${Object.values(GEMINI_SETUP_MODES).join(", ")}`,
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
          throw new Error("GEMINI_API_KEY is required for AI_STUDIO mode.");
        }
        config.set("GEMINI_API_KEY", normalizedGeminiApiKey);
      } else if (selectedMode === GEMINI_SETUP_MODES.VERTEX_EXPRESS) {
        if (!normalizedVertexApiKey) {
          throw new Error("VERTEX_AI_API_KEY is required for VERTEX_EXPRESS mode.");
        }
        config.set("VERTEX_AI_API_KEY", normalizedVertexApiKey);
      } else {
        if (!normalizedVertexProject || !normalizedVertexLocation) {
          throw new Error(
            "Both VERTEX_AI_PROJECT and VERTEX_AI_LOCATION are required for VERTEX_PROJECT mode.",
          );
        }
        config.set("VERTEX_AI_PROJECT", normalizedVertexProject);
        config.set("VERTEX_AI_LOCATION", normalizedVertexLocation);
      }

      clearGeminiModeFields(selectedMode);
      return `Gemini setup for mode ${selectedMode} has been saved successfully.`;
    } catch (error) {
      return `Error saving Gemini setup: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  async reloadLlmModels(): Promise<string> {
    try {
      await this.llmModelService.reloadModels();
      await this.audioModelService.reloadModels();
      await this.imageModelService.reloadModels();
      return "All models (LLM and Multimedia) reloaded successfully.";
    } catch (error) {
      return `Error reloading models: ${String(error)}`;
    }
  }

  @Mutation(() => String)
  async reloadLlmProviderModels(@Arg("provider", () => String) provider: string): Promise<string> {
    if (!provider) {
      return "Error reloading provider models: provider must be specified.";
    }

    try {
      const normalized = provider.trim().toUpperCase();
      const providerEnum = (LLMProvider as Record<string, LLMProvider>)[normalized];
      if (!providerEnum) {
        return `Error reloading models for provider ${provider}: Unsupported provider.`;
      }

      const count = await this.llmModelService.reloadModelsForProvider(providerEnum);
      return `Reloaded ${count} models for provider ${providerEnum} successfully.`;
    } catch (error) {
      return `Error reloading models for provider ${provider}: ${String(error)}`;
    }
  }
}
