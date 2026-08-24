import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { ParameterSchema } from '../../utils/parameter-schema.js';
import type { BaseAudioClient } from './base-audio-client.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeResolver } from '../../utils/gemini-runtime.js';
import { buildHostScopedMultimediaModelIdentifier } from '../model-identifier.js';

type ParameterSchemaInput = Record<string, unknown> | ParameterSchema | null | undefined;

type AudioClientConstructor = new (model: AudioModel, config: MultimediaConfig, apiKeyResolver: ProviderApiKeyResolver, geminiRuntimeResolver?: GeminiRuntimeResolver) => BaseAudioClient;

export interface AudioModelOptions {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: AudioClientConstructor;
  parameterSchema?: ParameterSchemaInput;
  runtime?: MultimediaRuntime;
  hostUrl?: string | null;
}

export class AudioModel {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: AudioClientConstructor;
  runtime: MultimediaRuntime;
  hostUrl?: string | null;
  parameterSchema: ParameterSchema;
  defaultConfig: MultimediaConfig;

  constructor(options: AudioModelOptions) {
    this.name = options.name;
    this.value = options.value;
    this.provider = options.provider;
    this.clientClass = options.clientClass;
    this.runtime = options.runtime ?? MultimediaRuntime.API;
    this.hostUrl = options.hostUrl;

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
    if (this.runtime === MultimediaRuntime.AUTOBYTEUS && this.hostUrl) {
      return buildHostScopedMultimediaModelIdentifier(this.name, this.hostUrl);
    }

    return this.name;
  }

  createClient(
    configOverride: MultimediaConfig | null | undefined,
    apiKeyResolver: ProviderApiKeyResolver,
    geminiRuntimeResolver?: GeminiRuntimeResolver,
  ): BaseAudioClient {
    let configToUse = this.defaultConfig;
    if (configOverride) {
      const cloned = new MultimediaConfig({ ...this.defaultConfig.params });
      cloned.mergeWith(configOverride);
      configToUse = cloned;
    }

    if (
      this.runtime === MultimediaRuntime.API
      && this.provider === MultimediaProvider.GEMINI
    ) {
      if (!geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_REQUIRED');
      return new this.clientClass(this, configToUse, apiKeyResolver, geminiRuntimeResolver);
    }
    if (geminiRuntimeResolver) throw new Error('GEMINI_RUNTIME_RESOLVER_NOT_ALLOWED');
    return new this.clientClass(this, configToUse, apiKeyResolver);
  }

  toString(): string {
    return `AudioModel(identifier='${this.modelIdentifier}', provider='${this.provider}', runtime='${this.runtime}')`;
  }
}
