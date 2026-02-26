import { Arg, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getServerSettingsService } from "../../../services/server-settings-service.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";

@ObjectType()
export class ServerSetting {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class SearchConfig {
  @Field(() => String)
  provider!: string;

  @Field(() => Boolean)
  serperApiKeyConfigured!: boolean;

  @Field(() => Boolean)
  serpapiApiKeyConfigured!: boolean;

  @Field(() => Boolean)
  googleCseApiKeyConfigured!: boolean;

  @Field(() => String, { nullable: true })
  googleCseId!: string | null;

  @Field(() => Boolean)
  vertexAiSearchApiKeyConfigured!: boolean;

  @Field(() => String, { nullable: true })
  vertexAiSearchServingConfig!: string | null;
}

@Resolver()
export class ServerSettingsResolver {
  private get serverSettingsService() {
    return getServerSettingsService();
  }

  private normalizeText(value: string | null | undefined): string {
    return value?.trim() ?? "";
  }

  private getSearchConfigSnapshot(): SearchConfig {
    const config = appConfigProvider.config;
    const provider = this.normalizeText(config.get("DEFAULT_SEARCH_PROVIDER")).toLowerCase();
    const googleCseId = this.normalizeText(config.get("GOOGLE_CSE_ID"));
    const vertexServingConfig = this.normalizeText(config.get("VERTEX_AI_SEARCH_SERVING_CONFIG"));

    return {
      provider,
      serperApiKeyConfigured: Boolean(this.normalizeText(config.get("SERPER_API_KEY"))),
      serpapiApiKeyConfigured: Boolean(this.normalizeText(config.get("SERPAPI_API_KEY"))),
      googleCseApiKeyConfigured: Boolean(this.normalizeText(config.get("GOOGLE_CSE_API_KEY"))),
      googleCseId: googleCseId || null,
      vertexAiSearchApiKeyConfigured: Boolean(this.normalizeText(config.get("VERTEX_AI_SEARCH_API_KEY"))),
      vertexAiSearchServingConfig: vertexServingConfig || null,
    };
  }

  @Query(() => [ServerSetting])
  getServerSettings(): ServerSetting[] {
    const settings = this.serverSettingsService.getAvailableSettings();
    return settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
    }));
  }

  @Query(() => SearchConfig)
  getSearchConfig(): SearchConfig {
    return this.getSearchConfigSnapshot();
  }

  @Mutation(() => String)
  updateServerSetting(
    @Arg("key", () => String) key: string,
    @Arg("value", () => String) value: string,
  ): string {
    const [, message] = this.serverSettingsService.updateSetting(key, value);
    return message;
  }

  @Mutation(() => String)
  deleteServerSetting(@Arg("key", () => String) key: string): string {
    const [, message] = this.serverSettingsService.deleteSetting(key);
    return message;
  }

  @Mutation(() => String)
  setSearchConfig(
    @Arg("provider", () => String) provider: string,
    @Arg("serperApiKey", () => String, { nullable: true }) serperApiKey?: string | null,
    @Arg("serpapiApiKey", () => String, { nullable: true }) serpapiApiKey?: string | null,
    @Arg("googleCseApiKey", () => String, { nullable: true }) googleCseApiKey?: string | null,
    @Arg("googleCseId", () => String, { nullable: true }) googleCseId?: string | null,
    @Arg("vertexAiSearchApiKey", () => String, { nullable: true }) vertexAiSearchApiKey?: string | null,
    @Arg("vertexAiSearchServingConfig", () => String, { nullable: true }) vertexAiSearchServingConfig?: string | null,
  ): string {
    const config = appConfigProvider.config;
    const normalizedProvider = this.normalizeText(provider).toLowerCase();
    const supportedProviders = new Set(["serper", "serpapi", "google_cse", "vertex_ai_search"]);

    if (!supportedProviders.has(normalizedProvider)) {
      return `Error updating search configuration: Unsupported provider '${provider}'.`;
    }

    const existing = this.getSearchConfigSnapshot();
    const normalizedSerperApiKey = this.normalizeText(serperApiKey);
    const normalizedSerpapiApiKey = this.normalizeText(serpapiApiKey);
    const normalizedGoogleCseApiKey = this.normalizeText(googleCseApiKey);
    const normalizedGoogleCseId = this.normalizeText(googleCseId);
    const normalizedVertexApiKey = this.normalizeText(vertexAiSearchApiKey);
    const normalizedVertexServingConfig = this.normalizeText(vertexAiSearchServingConfig);

    const hasSerperApiKey = Boolean(normalizedSerperApiKey) || existing.serperApiKeyConfigured;
    const hasSerpapiApiKey = Boolean(normalizedSerpapiApiKey) || existing.serpapiApiKeyConfigured;
    const hasGoogleCseApiKey = Boolean(normalizedGoogleCseApiKey) || existing.googleCseApiKeyConfigured;
    const hasGoogleCseId = Boolean(normalizedGoogleCseId || this.normalizeText(existing.googleCseId));
    const hasVertexApiKey = Boolean(normalizedVertexApiKey) || existing.vertexAiSearchApiKeyConfigured;
    const hasVertexServingConfig = Boolean(
      normalizedVertexServingConfig || this.normalizeText(existing.vertexAiSearchServingConfig),
    );

    if (normalizedProvider === "serper" && !hasSerperApiKey) {
      return "Error updating search configuration: SERPER_API_KEY is required for provider 'serper'.";
    }
    if (normalizedProvider === "serpapi" && !hasSerpapiApiKey) {
      return "Error updating search configuration: SERPAPI_API_KEY is required for provider 'serpapi'.";
    }
    if (normalizedProvider === "google_cse" && (!hasGoogleCseApiKey || !hasGoogleCseId)) {
      return "Error updating search configuration: GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID are required for provider 'google_cse'.";
    }
    if (normalizedProvider === "vertex_ai_search" && (!hasVertexApiKey || !hasVertexServingConfig)) {
      return "Error updating search configuration: VERTEX_AI_SEARCH_API_KEY and VERTEX_AI_SEARCH_SERVING_CONFIG are required for provider 'vertex_ai_search'.";
    }

    config.set("DEFAULT_SEARCH_PROVIDER", normalizedProvider);

    const maybeSet = (key: string, value: string | null | undefined) => {
      const normalized = this.normalizeText(value);
      if (normalized) {
        config.set(key, normalized);
      }
    };

    maybeSet("SERPER_API_KEY", serperApiKey);
    maybeSet("SERPAPI_API_KEY", serpapiApiKey);
    maybeSet("GOOGLE_CSE_API_KEY", googleCseApiKey);
    maybeSet("GOOGLE_CSE_ID", googleCseId);
    maybeSet("VERTEX_AI_SEARCH_API_KEY", vertexAiSearchApiKey);
    maybeSet("VERTEX_AI_SEARCH_SERVING_CONFIG", vertexAiSearchServingConfig);

    return `Search configuration for provider '${normalizedProvider}' has been updated successfully.`;
  }
}
