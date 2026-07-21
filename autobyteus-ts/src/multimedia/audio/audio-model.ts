import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { ParameterSchema } from '../../utils/parameter-schema.js';
import type { BaseAudioClient } from './base-audio-client.js';
import type { MultimediaConstructionContext } from '../multimedia-construction-context.js';
import type { LLMAuthenticationRequirement } from '../../llm/llm-construction-context.js';

type ParameterSchemaInput = Record<string, unknown> | ParameterSchema | null | undefined;

type AudioClientConstructor = new (model: AudioModel, context: MultimediaConstructionContext) => BaseAudioClient;

export interface AudioModelOptions {
  name: string;
  value: string;
  provider: MultimediaProvider;
  credentialProviderId?: string;
  clientClass: AudioClientConstructor;
  authenticationRequirement: LLMAuthenticationRequirement;
  parameterSchema?: ParameterSchemaInput;
  runtime?: MultimediaRuntime;
  hostUrl?: string | null;
}

export class AudioModel {
  name: string;
  value: string;
  provider: MultimediaProvider;
  credentialProviderId: string;
  clientClass: AudioClientConstructor;
  authenticationRequirement: LLMAuthenticationRequirement;
  runtime: MultimediaRuntime;
  hostUrl?: string | null;
  parameterSchema: ParameterSchema;
  defaultConfig: MultimediaConfig;

  constructor(options: AudioModelOptions) {
    this.name = options.name;
    this.value = options.value;
    this.provider = options.provider;
    const runtime = options.runtime ?? MultimediaRuntime.API;
    this.credentialProviderId = options.credentialProviderId?.trim()
      || (runtime === MultimediaRuntime.AUTOBYTEUS ? '' : String(this.provider));
    if (!this.credentialProviderId) throw new Error('credentialProviderId is required for every audio model.');
    this.clientClass = options.clientClass;
    this.authenticationRequirement = options.authenticationRequirement;
    this.runtime = runtime;
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
      try {
        const url = new URL(this.hostUrl);
        const host = url.host || url.hostname || this.hostUrl;
        return `${this.name}@${host}`;
      } catch {
        return `${this.name}@${this.hostUrl}`;
      }
    }

    return this.name;
  }

  createClient(context: {
    configOverride?: MultimediaConfig | null;
    authentication: MultimediaConstructionContext['authentication'];
  }): BaseAudioClient {
    let configToUse = this.defaultConfig;
    if (context.configOverride) {
      const cloned = new MultimediaConfig({ ...this.defaultConfig.params });
      cloned.mergeWith(context.configOverride);
      configToUse = cloned;
    }

    return new this.clientClass(this, { config: configToUse, authentication: context.authentication });
  }

  toString(): string {
    return `AudioModel(identifier='${this.modelIdentifier}', provider='${this.provider}', runtime='${this.runtime}')`;
  }
}
