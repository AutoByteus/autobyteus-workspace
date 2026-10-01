import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getServerSettingsService } from "../../../services/server-settings-service.js";
import { getSearchProvisioningService } from "../../../agent-tools/search/search-provisioning-service.js";

@ObjectType()
export class ServerSetting {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  value!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Boolean)
  isEditable!: boolean;

  @Field(() => Boolean)
  isDeletable!: boolean;
}

@ObjectType()
export class SearchConfig {
  @Field(() => String)
  provider!: string;

  @Field(() => String)
  vaultHealth!: string;

  @Field(() => String, { nullable: true })
  instructionCode!: string | null;

  @Field(() => String, { nullable: true })
  serperStorageState!: string | null;

  @Field(() => String, { nullable: true })
  serpapiStorageState!: string | null;

  @Field(() => String, { nullable: true })
  vertexAiSearchStorageState!: string | null;

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

  @Query(() => [ServerSetting])
  getServerSettings(): ServerSetting[] {
    const settings = this.serverSettingsService.getAvailableSettings();
    return settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
      isEditable: setting.isEditable,
      isDeletable: setting.isDeletable,
    }));
  }

  @Query(() => Int)
  getEffectiveStreamingContentFlushIntervalMs(): number {
    return this.serverSettingsService.getEffectiveStreamingContentFlushIntervalMs();
  }

  @Query(() => SearchConfig)
  async getSearchConfig(): Promise<SearchConfig> {
    return getSearchProvisioningService().getConfigurationStatus();
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
  async setSearchConfig(
    @Arg("provider", () => String) provider: string,
    @Arg("serperApiKey", () => String, { nullable: true }) serperApiKey?: string | null,
    @Arg("serpapiApiKey", () => String, { nullable: true }) serpapiApiKey?: string | null,
    @Arg("vertexAiSearchApiKey", () => String, { nullable: true }) vertexAiSearchApiKey?: string | null,
    @Arg("vertexAiSearchServingConfig", () => String, { nullable: true }) vertexAiSearchServingConfig?: string | null,
  ): Promise<string> {
    const normalizedProvider = this.normalizeText(provider).toLowerCase();
    const supportedProviders = new Set(["serper", "serpapi", "vertex_ai_search"]);

    if (!supportedProviders.has(normalizedProvider)) {
      return "Error updating search configuration: SEARCH_PROVIDER_UNSUPPORTED";
    }

    const normalizedSerperApiKey = this.normalizeText(serperApiKey);
    const normalizedSerpapiApiKey = this.normalizeText(serpapiApiKey);
    const normalizedVertexApiKey = this.normalizeText(vertexAiSearchApiKey);
    const normalizedVertexServingConfig = this.normalizeText(vertexAiSearchServingConfig);
    const apiKey = normalizedProvider === "serper"
      ? normalizedSerperApiKey
      : normalizedProvider === "serpapi"
        ? normalizedSerpapiApiKey
        : normalizedVertexApiKey;
    try {
      await getSearchProvisioningService().saveConfiguration({
        provider: normalizedProvider,
        apiKey: apiKey || null,
        vertexServingConfig: normalizedVertexServingConfig || null,
      });
      return "Search configuration updated successfully.";
    } catch {
      return "Error updating search configuration: SEARCH_CONFIGURATION_REJECTED";
    }
  }
}
