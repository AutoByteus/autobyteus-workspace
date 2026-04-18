import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';

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

export type CustomLlmProviderDraftInput = {
  name: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
};

export type CustomLlmProviderProbeModel = {
  id: string;
  name: string;
};

export type CustomLlmProviderProbeResult = {
  name: string;
  providerType: LLMProvider;
  baseUrl: string;
  discoveredModels: CustomLlmProviderProbeModel[];
};

export type CustomProviderReloadStatus = {
  providerId: string;
  status: 'READY' | 'STALE_ERROR' | 'ERROR';
  message?: string | null;
  modelCount: number;
  preservedPreviousModels: boolean;
};

export const normalizeProviderName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const sortProvidersByName = <T extends { name: string; id: string }>(providers: T[]): T[] =>
  providers
    .slice()
    .sort((left, right) => {
      if (left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      return left.id.localeCompare(right.id);
    });
