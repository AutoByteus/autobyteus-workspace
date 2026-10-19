import { MultimediaProvider } from '../providers.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { ParameterSchema } from '../../utils/parameter-schema.js';
import type { BaseVideoClient } from './base-video-client.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../utils/gemini-runtime.js';

type ParameterSchemaInput = Record<string, unknown> | ParameterSchema | null | undefined;

type VideoClientConstructor = new (model: VideoModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver, geminiRuntimeResolver?: GeminiRuntimeResolver) => BaseVideoClient;

export interface VideoModelOptions {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: VideoClientConstructor;
  parameterSchema?: ParameterSchemaInput;
  description?: string | null;
}

export class VideoModel {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: VideoClientConstructor;
  description?: string | null;
  parameterSchema: ParameterSchema;
  defaultConfig: MultimediaConfig;

  constructor(options: VideoModelOptions) {
    this.name = options.name;
    this.value = options.value;
    this.provider = options.provider;
    this.clientClass = options.clientClass;
    this.description = options.description ?? null;

    if (options.parameterSchema && !(options.parameterSchema instanceof ParameterSchema)) {
      this.parameterSchema = ParameterSchema.fromConfig(options.parameterSchema);
    } else if (options.parameterSchema instanceof ParameterSchema) {
      this.parameterSchema = options.parameterSchema;
    } else {
      this.parameterSchema = new ParameterSchema();
    }

    const defaultParams: Record<string, unknown> = {};
    for (const param of this.parameterSchema.parameters) {
      if (param.defaultValue !== undefined && param.defaultValue !== null) {
        defaultParams[param.name] = param.defaultValue;
      }
    }

    this.defaultConfig = new MultimediaConfig(defaultParams);
  }

  get modelIdentifier(): string {
    return this.name;
  }

  createClient(
    configOverride: MultimediaConfig | null | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ): BaseVideoClient {
    let configToUse = this.defaultConfig;
    if (configOverride) {
      const cloned = new MultimediaConfig({ ...this.defaultConfig.params });
      cloned.mergeWith(configOverride);
      configToUse = cloned;
    }

    if (this.provider === MultimediaProvider.GEMINI) {
      if (!geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
      return new this.clientClass(this, configToUse, apiKeyResolver, geminiRuntimeResolver);
    }
    if (geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_NOT_ALLOWED');
    return new this.clientClass(this, configToUse, apiKeyResolver);
  }

  toString(): string {
    return `VideoModel(identifier='${this.modelIdentifier}', provider='${this.provider}')`;
  }
}
