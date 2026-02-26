import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { LLMConfig } from './utils/llm-config.js';
import { ParameterSchema } from '../utils/parameter-schema.js';
import { BaseLLM } from './base.js';

export interface LLMModelOptions {
  name: string;
  value: string;
  provider: LLMProvider;
  llmClass?: new (model: LLMModel, config: LLMConfig) => BaseLLM;
  canonicalName: string;
  defaultConfig?: LLMConfig;
  maxContextTokens?: number | null;
  defaultCompactionRatio?: number | null;
  defaultSafetyMarginTokens?: number | null;
  runtime?: LLMRuntime;
  hostUrl?: string;
  configSchema?: ParameterSchema; // Or generic dict if schema not ported
}

export interface ModelInfo {
  model_identifier: string;
  display_name: string;
  value: string;
  canonical_name: string;
  provider: string;
  runtime: string;
  host_url?: string;
  config_schema?: Record<string, unknown>;
}

export class LLMModel {
  private _name: string;
  private _value: string;
  private _canonicalName: string;
  public provider: LLMProvider;
  public llmClass?: new (model: LLMModel, config: LLMConfig) => BaseLLM; 
  public defaultConfig: LLMConfig;
  public maxContextTokens: number | null;
  public defaultCompactionRatio: number | null;
  public defaultSafetyMarginTokens: number | null;
  public runtime: LLMRuntime;
  public hostUrl?: string;
  public configSchema?: ParameterSchema;
  private _modelIdentifier: string;

  constructor(options: LLMModelOptions) {
    this._name = options.name;
    this._value = options.value;
    this._canonicalName = options.canonicalName;
    this.provider = options.provider;
    this.llmClass = options.llmClass;
    this.defaultConfig = options.defaultConfig || new LLMConfig();
    const defaultMaxContext = this.defaultConfig.tokenLimit ?? 200000;
    this.maxContextTokens = options.maxContextTokens ?? defaultMaxContext;
    this.defaultCompactionRatio = options.defaultCompactionRatio ?? 0.8;
    this.defaultSafetyMarginTokens = options.defaultSafetyMarginTokens ?? 256;
    this.runtime = options.runtime || LLMRuntime.API;
    this.hostUrl = options.hostUrl;
    this.configSchema = options.configSchema;
    this._modelIdentifier = this.generateIdentifier();
  }

  private generateIdentifier(): string {
    if (this.runtime === LLMRuntime.API) {
      return this.name;
    }
    
    if (!this.hostUrl) {
      throw new Error(`hostUrl is required for runtime '${this.runtime}' on model '${this.name}'`);
    }

    try {
      const url = new URL(this.hostUrl);
      const hostAndPort = url.host;
      return `${this.name}:${this.runtime.toLowerCase()}@${hostAndPort}`;
    } catch (e) {
      console.error(`Failed to parse hostUrl '${this.hostUrl}' for identifier generation: ${e}`);
      return `${this.name}:${this.runtime.toLowerCase()}@${this.hostUrl}`;
    }
  }

  get name(): string { return this._name; }
  get value(): string { return this._value; }
  get canonicalName(): string { return this._canonicalName; }
  get modelIdentifier(): string { return this._modelIdentifier; }

  // createLLM method might be tricky with circular deps if we return BaseLLM instance.
  // For now, let's skip factory method here and use a separate Factory.

  toModelInfo(): ModelInfo {
    return {
      model_identifier: this.modelIdentifier,
      display_name: this.name,
      value: this.value,
      canonical_name: this.canonicalName,
      provider: this.provider,
      runtime: this.runtime,
      host_url: this.hostUrl,
      config_schema: this.configSchema?.toJsonSchemaDict() || undefined
    };
  }
}
