import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';
export { normalizeProviderName } from 'autobyteus-ts/llm/custom-llm-provider-identity.js';

export type CatalogMode = 'STATIC' | 'DISCOVERED';
export type ModelKind = 'LLM' | 'AUDIO' | 'IMAGE' | 'VIDEO';
export type ModelSourceState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PARTIAL'
  | 'REFRESHING'
  | 'STALE_ERROR'
  | 'ERROR';

export type LlmProviderDescriptor = {
  id: string;
  name: string;
  providerType: LLMProvider;
  isCustom: boolean;
  baseUrl: string | null;
  catalogMode: CatalogMode;
};

export type ProviderCredentialSetting = {
  provider: LlmProviderDescriptor;
  apiKeyConfigured: boolean;
};

export type ModelSourceStatus = {
  modelKind: ModelKind;
  state: ModelSourceState;
  modelCount: number;
  successfulUnitCount: number;
  failedUnitCount: number;
  safeMessage: string | null;
};

export type ProviderModelCatalogSnapshot<TLlm, TAudio, TImage, TVideo> = {
  runtimeKind: string;
  ownerProvider: LlmProviderDescriptor;
  sources: ModelSourceStatus[];
  llmModels: TLlm[];
  audioModels: TAudio[];
  imageModels: TImage[];
  videoModels: TVideo[];
};

export type CustomLlmProviderDraftInput = {
  name: string;
  baseUrl: string;
  apiKey: string;
};

export type QwenEndpointSource = 'DEFAULT' | 'CONFIGURED';

export type QwenSetupStatus = {
  effectiveBaseUrl: string;
  endpointSource: QwenEndpointSource;
};

export type QwenConfigurationCommandResult = {
  setup: QwenSetupStatus;
  credentialSetting: ProviderCredentialSetting;
};

export type DeleteCustomProviderResult = {
  providerId: string;
  deleted: true;
};

export type QwenConfigurationInput = {
  baseUrl: string;
  apiKey: string;
};

export type CustomLlmProviderProbeModel = {
  id: string;
  name: string;
};

export type CustomLlmProviderProbeResult = {
  discoveredModels: CustomLlmProviderProbeModel[];
};

export const sortProvidersByName = <T extends { name: string; id: string }>(providers: T[]): T[] =>
  providers
    .slice()
    .sort((left, right) => {
      if (left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      return left.id.localeCompare(right.id);
    });
