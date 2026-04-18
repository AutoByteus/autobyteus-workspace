import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig } from './utils/llm-config.js';
import { ParameterSchema } from '../utils/parameter-schema.js';
import { BaseLLM } from './base.js';
import { getLlmProviderDisplayName } from './provider-display-names.js';

export interface LLMModelOptions {
  name: string;
  value: string;
  provider: LLMProvider;
  providerId?: string;
  providerName?: string;
  llmClass?: new (model: LLMModel, config: LLMConfig) => BaseLLM;
  canonicalName: string;
  defaultConfig?: LLMConfig;
  maxContextTokens?: number | null;
  activeContextTokens?: number | null;
  maxInputTokens?: number | null;
  maxOutputTokens?: number | null;
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
}

export class LLMModel {
  private _name: string;
  private _value: string;
  private _canonicalName: string;
  public provider: LLMProvider;
  public providerId: string;
  public providerName: string;
  public llmClass?: new (model: LLMModel, config: LLMConfig) => BaseLLM;
  public defaultConfig: LLMConfig;
  public maxContextTokens: number | null;
  public activeContextTokens: number | null;
  public maxInputTokens: number | null;
  public maxOutputTokens: number | null;
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
    this.llmClass = options.llmClass;
    this.defaultConfig = options.defaultConfig || new LLMConfig();
    this.maxContextTokens = options.maxContextTokens ?? this.defaultConfig.tokenLimit ?? null;
    this.activeContextTokens = options.activeContextTokens ?? null;
    this.maxInputTokens = options.maxInputTokens ?? null;
    this.maxOutputTokens = options.maxOutputTokens ?? null;
    this.defaultCompactionRatio = options.defaultCompactionRatio ?? 0.8;
    this.defaultSafetyMarginTokens = options.defaultSafetyMarginTokens ?? 256;
    this.runtime = options.runtime || LLMRuntime.API;
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

    try {
      const url = new URL(this.hostUrl);
      const hostAndPort = url.host;
      return `${this.name}:${this.runtime.toLowerCase()}@${hostAndPort}`;
    } catch (error) {
      console.error(`Failed to parse hostUrl '${this.hostUrl}' for identifier generation: ${error}`);
      return `${this.name}:${this.runtime.toLowerCase()}@${this.hostUrl}`;
    }
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
    };
  }
}
