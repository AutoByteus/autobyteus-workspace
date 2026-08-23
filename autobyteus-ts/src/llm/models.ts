import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig } from './utils/llm-config.js';
import { ParameterSchema } from '../utils/parameter-schema.js';
import { BaseLLM } from './base.js';
import { getLlmProviderDisplayName } from './provider-display-names.js';
import {
  cloneMultimodalCapabilities,
  UNKNOWN_MULTIMODAL_CAPABILITIES,
  type MultimodalCapabilities,
} from './multimodal-capabilities.js';
import type { ResolvedModelMetadata } from './metadata/model-metadata-resolver.js';
import type { ProviderApiKeyResolver } from '../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../utils/gemini-runtime.js';

export interface LLMModelOptions {
  name: string;
  value: string;
  provider: LLMProvider;
  providerId?: string;
  providerName?: string;
  llmClass?: new (
    model: LLMModel,
    config: LLMConfig,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ) => BaseLLM;
  canonicalName: string;
  defaultConfig?: LLMConfig;
  maxContextTokens?: number | null;
  activeContextTokens?: number | null;
  maxInputTokens?: number | null;
  maxOutputTokens?: number | null;
  multimodalCapabilities?: MultimodalCapabilities;
  resolvedModelMetadata?: ResolvedModelMetadata;
  defaultCompactionRatio?: number | null;
  defaultSafetyMarginTokens?: number | null;
  runtime?: LLMRuntime;
  hostUrl?: string;
  configSchema?: ParameterSchema;
  modelIdentifierOverride?: string;
}

export interface ModelInfo {
  model_identifier: string;
  display_name: string;
  description?: string | null;
  value: string;
  canonical_name: string;
  provider_id: string;
  provider_name: string;
  provider_type: LLMProvider;
  runtime: string;
  host_url?: string;
  config_schema?: Record<string, unknown>;
  max_context_tokens: number | null;
  active_context_tokens: number | null;
  max_input_tokens: number | null;
  max_output_tokens: number | null;
  resolved_model_metadata: ResolvedModelMetadata | null;
}

export type HostScopedLlmModelIdentifier = {
  modelName: string;
  runtime: LLMRuntime.OLLAMA | LLMRuntime.LMSTUDIO | LLMRuntime.AUTOBYTEUS;
  host: string;
};

const HOST_SCOPED_LLM_RUNTIMES = [
  LLMRuntime.OLLAMA,
  LLMRuntime.LMSTUDIO,
  LLMRuntime.AUTOBYTEUS,
] as const;

export const buildHostScopedLlmModelIdentifier = (
  modelName: string,
  runtime: HostScopedLlmModelIdentifier['runtime'],
  hostUrl: string,
): string => {
  let host = hostUrl;
  try {
    host = new URL(hostUrl).host;
  } catch {
    // Preserve the existing fallback for non-URL host values.
  }
  return `${modelName}:${runtime.toLowerCase()}@${host}`;
};

export const parseHostScopedLlmModelIdentifier = (
  identifier: string,
): HostScopedLlmModelIdentifier | null => {
  for (const runtime of HOST_SCOPED_LLM_RUNTIMES) {
    const marker = `:${runtime.toLowerCase()}@`;
    const markerIndex = identifier.lastIndexOf(marker);
    if (markerIndex <= 0) continue;
    const host = identifier.slice(markerIndex + marker.length);
    if (!host) return null;
    return { modelName: identifier.slice(0, markerIndex), runtime, host };
  }
  return null;
};

export class LLMModel {
  private _name: string;
  private _value: string;
  private _canonicalName: string;
  public provider: LLMProvider;
  public providerId: string;
  public providerName: string;
  public llmClass?: new (
    model: LLMModel,
    config: LLMConfig,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ) => BaseLLM;
  public defaultConfig: LLMConfig;
  public maxContextTokens: number | null;
  public activeContextTokens: number | null;
  public maxInputTokens: number | null;
  public maxOutputTokens: number | null;
  public readonly multimodalCapabilities: MultimodalCapabilities;
  public readonly resolvedModelMetadata: ResolvedModelMetadata | null;
  public defaultCompactionRatio: number | null;
  public defaultSafetyMarginTokens: number | null;
  public runtime: LLMRuntime;
  public hostUrl?: string;
  public configSchema?: ParameterSchema;
  private readonly modelIdentifierOverride?: string;
  private _modelIdentifier: string;

  constructor(options: LLMModelOptions) {
    this._name = options.name;
    this._value = options.value;
    this._canonicalName = options.canonicalName;
    this.provider = options.provider;
    this.providerId = options.providerId?.trim() || String(this.provider);
    this.providerName = options.providerName?.trim() || getLlmProviderDisplayName(this.provider);
    const runtime = options.runtime || LLMRuntime.API;
    this.llmClass = options.llmClass;
    this.defaultConfig = options.defaultConfig || new LLMConfig();
    this.maxContextTokens = options.maxContextTokens ?? this.defaultConfig.tokenLimit ?? null;
    this.activeContextTokens = options.activeContextTokens ?? null;
    this.maxInputTokens = options.maxInputTokens ?? null;
    this.maxOutputTokens = options.maxOutputTokens ?? null;
    this.multimodalCapabilities = cloneMultimodalCapabilities(
      options.multimodalCapabilities ?? UNKNOWN_MULTIMODAL_CAPABILITIES,
    );
    this.resolvedModelMetadata = options.resolvedModelMetadata ?? null;
    this.defaultCompactionRatio = options.defaultCompactionRatio ?? 0.8;
    this.defaultSafetyMarginTokens = options.defaultSafetyMarginTokens ?? 256;
    this.runtime = runtime;
    this.hostUrl = options.hostUrl;
    this.configSchema = options.configSchema;
    this.modelIdentifierOverride = options.modelIdentifierOverride?.trim() || undefined;
    this._modelIdentifier = this.generateIdentifier();
  }

  private generateIdentifier(): string {
    if (this.modelIdentifierOverride) {
      return this.modelIdentifierOverride;
    }

    if (this.runtime === LLMRuntime.API) {
      return this.name;
    }

    if (this.runtime === LLMRuntime.OPENAI_COMPATIBLE) {
      return `${this.name}:${this.runtime.toLowerCase()}@${this.providerId}`;
    }

    if (!this.hostUrl) {
      throw new Error(`hostUrl is required for runtime '${this.runtime}' on model '${this.name}'`);
    }

    return buildHostScopedLlmModelIdentifier(
      this.name,
      this.runtime as HostScopedLlmModelIdentifier['runtime'],
      this.hostUrl,
    );
  }

  get name(): string { return this._name; }
  get value(): string { return this._value; }
  get canonicalName(): string { return this._canonicalName; }
  get modelIdentifier(): string { return this._modelIdentifier; }

  toModelInfo(): ModelInfo {
    return {
      model_identifier: this.modelIdentifier,
      display_name: this.name,
      value: this.value,
      canonical_name: this.canonicalName,
      provider_id: this.providerId,
      provider_name: this.providerName,
      provider_type: this.provider,
      runtime: this.runtime,
      host_url: this.hostUrl,
      config_schema: this.configSchema?.toJsonSchemaDict() || undefined,
      max_context_tokens: this.maxContextTokens,
      active_context_tokens: this.activeContextTokens,
      max_input_tokens: this.maxInputTokens,
      max_output_tokens: this.maxOutputTokens,
      resolved_model_metadata: this.resolvedModelMetadata,
    };
  }
}
