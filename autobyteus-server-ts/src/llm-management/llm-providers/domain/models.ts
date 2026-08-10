import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';
export { normalizeProviderName } from 'autobyteus-ts/llm/custom-llm-provider-identity.js';

export type LlmProviderStatus = 'READY' | 'STALE_ERROR' | 'ERROR' | 'NOT_APPLICABLE';

export type LlmProviderRecord = {
  id: string;
  name: string;
  providerType: LLMProvider;
  isCustom: boolean;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  status: LlmProviderStatus;
  statusMessage: string | null;
};

export type LlmProviderWithModels<TModel> = {
  provider: LlmProviderRecord;
  models: TModel[];
};

export type ProviderSettingsGroup<
  TLlmModel,
  TAudioModel,
  TImageModel,
  TVideoModel,
> = {
  provider: LlmProviderRecord;
  llmModels: TLlmModel[];
  audioModels: TAudioModel[];
  imageModels: TImageModel[];
  videoModels: TVideoModel[];
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
  apiKeyConfigured: boolean;
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

export type CustomProviderReloadStatus = {
  providerId: string;
  status: 'READY' | 'STALE_ERROR' | 'ERROR';
  message?: string | null;
  modelCount: number;
  preservedPreviousModels: boolean;
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
