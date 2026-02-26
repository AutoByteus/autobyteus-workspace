import { MultimediaProvider } from '../providers.js';
import { MultimediaRuntime } from '../runtimes.js';
import { MultimediaConfig } from '../utils/multimedia-config.js';
import { ParameterSchema } from '../../utils/parameter-schema.js';
import type { BaseImageClient } from './base-image-client.js';

type ParameterSchemaInput = Record<string, unknown> | ParameterSchema | null | undefined;

type ImageClientConstructor = new (model: ImageModel, config: MultimediaConfig) => BaseImageClient;

export interface ImageModelOptions {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: ImageClientConstructor;
  parameterSchema?: ParameterSchemaInput;
  runtime?: MultimediaRuntime;
  hostUrl?: string | null;
  description?: string | null;
}

export class ImageModel {
  name: string;
  value: string;
  provider: MultimediaProvider;
  clientClass: ImageClientConstructor;
  runtime: MultimediaRuntime;
  hostUrl?: string | null;
  description?: string | null;
  parameterSchema: ParameterSchema;
  defaultConfig: MultimediaConfig;

  constructor(options: ImageModelOptions) {
    this.name = options.name;
    this.value = options.value;
    this.provider = options.provider;
    this.clientClass = options.clientClass;
    this.runtime = options.runtime ?? MultimediaRuntime.API;
    this.hostUrl = options.hostUrl;
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

  createClient(configOverride?: MultimediaConfig | null): BaseImageClient {
    let configToUse = this.defaultConfig;
    if (configOverride) {
      const cloned = new MultimediaConfig({ ...this.defaultConfig.params });
      cloned.mergeWith(configOverride);
      configToUse = cloned;
    }

    return new this.clientClass(this, configToUse);
  }

  toString(): string {
    return `ImageModel(identifier='${this.modelIdentifier}', provider='${this.provider}', runtime='${this.runtime}')`;
  }
}
