import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { GraphQLError } from 'graphql';
import {
  getLlmProviderService,
  type LlmProviderService,
  type GeminiConfigurationCommandResult,
  QWEN_CONFIGURATION_REPAIR_REQUIRED,
  QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED,
  QwenConfigurationError,
} from '../../../llm-management/llm-providers/services/llm-provider-service.js';
import type {
  ProviderCredentialSetting,
  QwenConfigurationCommandResult,
  QwenSetupStatus,
} from '../../../llm-management/llm-providers/domain/models.js';
import type {
  GeminiConfigurationOption,
  GeminiConfigurationState,
  GeminiSetupStatus,
} from '../../../llm-management/services/gemini-configuration-service.js';
import {
  getModelCatalogService,
  type ModelCatalogService,
} from '../../../llm-management/services/model-catalog-service.js';
import {
  GeminiSetupModeGraphql,
  GeminiSetupStateObject,
} from './gemini-configuration.js';
import {
  CatalogProviderObject,
  ProviderModelCatalogSnapshotObject,
  mapProviderDescriptor,
  mapProviderModelCatalogSnapshot,
} from './llm-provider-model-catalog.js';

@ObjectType()
class ProviderCredentialSettingObject {
  @Field(() => CatalogProviderObject) provider!: CatalogProviderObject;
  @Field(() => Boolean) apiKeyConfigured!: boolean;
}

@ObjectType()
class CustomProviderProbeModelObject {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
}

@ObjectType()
class CustomProviderProbeResultObject {
  @Field(() => [CustomProviderProbeModelObject]) discoveredModels!: CustomProviderProbeModelObject[];
}

@InputType()
class CustomProviderInputObject {
  @Field(() => String) name!: string;
  @Field(() => String) baseUrl!: string;
  @Field(() => String) apiKey!: string;
}

enum QwenEndpointSourceGraphql {
  DEFAULT = 'DEFAULT',
  CONFIGURED = 'CONFIGURED',
}
registerEnumType(QwenEndpointSourceGraphql, { name: 'QwenEndpointSource' });

@ObjectType('QwenSetupStatus')
class QwenSetupStatusObject {
  @Field(() => String) effectiveBaseUrl!: string;
  @Field(() => QwenEndpointSourceGraphql) endpointSource!: QwenEndpointSourceGraphql;
}

@ObjectType('QwenConfigurationCommandResult')
class QwenConfigurationCommandResultObject {
  @Field(() => QwenSetupStatusObject) setup!: QwenSetupStatusObject;
  @Field(() => ProviderCredentialSettingObject) credentialSetting!: ProviderCredentialSettingObject;
}

@ObjectType('GeminiConfigurationCommandResult')
class GeminiConfigurationCommandResultObject {
  @Field(() => GeminiSetupStateObject) setup!: GeminiSetupStateObject;
  @Field(() => ProviderCredentialSettingObject) credentialSetting!: ProviderCredentialSettingObject;
}

@ObjectType('DeleteCustomProviderResult')
class DeleteCustomProviderResultObject {
  @Field(() => String) providerId!: string;
  @Field(() => Boolean) deleted!: boolean;
}

@InputType('QwenConfigurationInput')
class QwenConfigurationInputObject {
  @Field(() => String) baseUrl!: string;
  @Field(() => String) apiKey!: string;
}

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
const mapCredentialSetting = (
  setting: ProviderCredentialSetting,
): ProviderCredentialSettingObject => ({
  provider: mapProviderDescriptor(setting.provider),
  apiKeyConfigured: setting.apiKeyConfigured,
});
const mapQwenSetupStatus = (status: QwenSetupStatus): QwenSetupStatusObject => ({
  effectiveBaseUrl: status.effectiveBaseUrl,
  endpointSource: status.endpointSource as QwenEndpointSourceGraphql,
});
const mapQwenCommandResult = (
  result: QwenConfigurationCommandResult,
): QwenConfigurationCommandResultObject => ({
  setup: mapQwenSetupStatus(result.setup),
  credentialSetting: mapCredentialSetting(result.credentialSetting),
});
const mapGeminiCommandResult = (
  result: GeminiConfigurationCommandResult,
): GeminiConfigurationCommandResultObject => ({
  setup: mapGeminiSetup(result.setup),
  credentialSetting: mapCredentialSetting(result.credentialSetting),
});
const throwSanitizedQwenConfigurationError = (error: unknown): never => {
  if (!(error instanceof QwenConfigurationError)) throw error;
  const repairRequired = error.code === QWEN_CONFIGURATION_REPAIR_REQUIRED;
  throw new GraphQLError(
    repairRequired
      ? 'Qwen configuration needs repair. Save a valid Base URL and API key again before using Qwen.'
      : 'Could not save Qwen configuration. Your previous configuration is still active.',
    { extensions: { code: repairRequired
      ? QWEN_CONFIGURATION_REPAIR_REQUIRED
      : QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED } },
  );
};

@Resolver()
export class LlmProviderResolver {
  private get modelCatalogService(): ModelCatalogService { return getModelCatalogService(); }
  private get llmProviderService(): LlmProviderService { return getLlmProviderService(); }

  @Query(() => [ProviderCredentialSettingObject])
  async providerCredentialSettings(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderCredentialSettingObject[]> {
    return (await this.llmProviderService.listProviderCredentialSettings(runtimeKind))
      .map(mapCredentialSetting);
  }

  @Query(() => [ProviderModelCatalogSnapshotObject])
  async providerModelCatalogSnapshots(
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderModelCatalogSnapshotObject[]> {
    return (await this.modelCatalogService.listProviderModelCatalogSnapshots(runtimeKind))
      .map(mapProviderModelCatalogSnapshot);
  }

  @Query(() => GeminiSetupStateObject)
  async getGeminiSetupConfig(): Promise<GeminiSetupStateObject> {
    return mapGeminiSetup(await this.llmProviderService.getGeminiConfigurationStatus());
  }

  @Query(() => QwenSetupStatusObject)
  async qwenSetupStatus(): Promise<QwenSetupStatusObject> {
    return mapQwenSetupStatus(await this.llmProviderService.getQwenSetupStatus());
  }

  @Mutation(() => ProviderModelCatalogSnapshotObject)
  async ensureProviderModelCatalog(
    @Arg('providerId', () => String) providerId: string,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderModelCatalogSnapshotObject> {
    return mapProviderModelCatalogSnapshot(
      await this.modelCatalogService.ensureProviderModelCatalog(providerId, runtimeKind),
    );
  }

  @Mutation(() => ProviderModelCatalogSnapshotObject)
  async reloadProviderModelCatalog(
    @Arg('providerId', () => String) providerId: string,
    @Arg('runtimeKind', () => String, { nullable: true }) runtimeKind?: string | null,
  ): Promise<ProviderModelCatalogSnapshotObject> {
    return mapProviderModelCatalogSnapshot(
      await this.modelCatalogService.reloadProviderModelCatalog(providerId, runtimeKind),
    );
  }

  @Mutation(() => ProviderCredentialSettingObject)
  async saveProviderApiKey(
    @Arg('providerId', () => String) providerId: string,
    @Arg('apiKey', () => String) apiKey: string,
  ): Promise<ProviderCredentialSettingObject> {
    return mapCredentialSetting(await this.llmProviderService.setProviderApiKey(providerId, apiKey));
  }

  @Mutation(() => QwenConfigurationCommandResultObject)
  async saveQwenConfiguration(
    @Arg('input', () => QwenConfigurationInputObject) input: QwenConfigurationInputObject,
  ): Promise<QwenConfigurationCommandResultObject> {
    try {
      return mapQwenCommandResult(await this.llmProviderService.saveQwenConfiguration(input));
    } catch (error) {
      return throwSanitizedQwenConfigurationError(error);
    }
  }

  @Mutation(() => CustomProviderProbeResultObject)
  async probeCustomProvider(
    @Arg('input', () => CustomProviderInputObject) input: CustomProviderInputObject,
  ): Promise<CustomProviderProbeResultObject> {
    return this.llmProviderService.probeCustomProvider(input);
  }

  @Mutation(() => ProviderCredentialSettingObject)
  async createCustomProvider(
    @Arg('input', () => CustomProviderInputObject) input: CustomProviderInputObject,
  ): Promise<ProviderCredentialSettingObject> {
    return mapCredentialSetting(await this.llmProviderService.createCustomProvider(input));
  }

  @Mutation(() => DeleteCustomProviderResultObject)
  async deleteCustomProvider(
    @Arg('providerId', () => String) providerId: string,
  ): Promise<DeleteCustomProviderResultObject> {
    return this.llmProviderService.deleteCustomProvider(providerId);
  }

  @Mutation(() => GeminiConfigurationCommandResultObject)
  async saveGeminiAiStudio(
    @Arg('apiKey', () => String) apiKey: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiConfigurationCommandResultObject> {
    return mapGeminiCommandResult(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'AI_STUDIO', apiKey }, activateAfterSave,
    ));
  }

  @Mutation(() => GeminiConfigurationCommandResultObject)
  async saveGeminiVertexExpress(
    @Arg('apiKey', () => String) apiKey: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiConfigurationCommandResultObject> {
    return mapGeminiCommandResult(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'VERTEX_EXPRESS', apiKey }, activateAfterSave,
    ));
  }

  @Mutation(() => GeminiConfigurationCommandResultObject)
  async saveGeminiVertexProject(
    @Arg('project', () => String) project: string,
    @Arg('location', () => String) location: string,
    @Arg('activateAfterSave', () => Boolean) activateAfterSave: boolean,
  ): Promise<GeminiConfigurationCommandResultObject> {
    return mapGeminiCommandResult(await this.llmProviderService.saveGeminiOptionConfiguration(
      { option: 'VERTEX_PROJECT', project, location }, activateAfterSave,
    ));
  }

  @Mutation(() => GeminiConfigurationCommandResultObject)
  async useGeminiMode(
    @Arg('mode', () => GeminiSetupModeGraphql) mode: GeminiSetupModeGraphql,
  ): Promise<GeminiConfigurationCommandResultObject> {
    return mapGeminiCommandResult(await this.llmProviderService.activateGeminiOption(
      mode as GeminiConfigurationOption,
    ));
  }
}
