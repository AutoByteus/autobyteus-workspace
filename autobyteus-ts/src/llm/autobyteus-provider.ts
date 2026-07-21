import { AutobyteusClient } from '../clients/autobyteus-client.js';
import type { AutobyteusDiscoveryAuthentication } from '../clients/autobyteus-discovery-authentication.js';
import { LLMConfig } from './utils/llm-config.js';
import { LLMModel } from './models.js';
import { LLMProvider } from './providers.js';
import { LLMRuntime } from './runtimes.js';
import { AutobyteusLLM } from './api/autobyteus-llm.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../utils/parameter-schema.js';

type ModelInfoPayload = Record<string, unknown>;
type ServerResponse = { models?: unknown };
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const mapJsonSchemaType = (schema: Record<string, unknown>, enumValues: string[]): ParameterType | null => {
  if (enumValues.length > 0) return ParameterType.ENUM;

  const rawType = Array.isArray(schema.type)
    ? schema.type.find((item): item is string => typeof item === 'string')
    : schema.type;

  switch (rawType) {
    case 'string':
      return ParameterType.STRING;
    case 'integer':
      return ParameterType.INTEGER;
    case 'number':
      return ParameterType.FLOAT;
    case 'boolean':
      return ParameterType.BOOLEAN;
    case 'object':
      return ParameterType.OBJECT;
    case 'array':
      return ParameterType.ARRAY;
    default:
      return null;
  }
};

const jsonSchemaToParameterSchema = (schemaData: Record<string, unknown>): ParameterSchema | null => {
  const properties = schemaData.properties;
  if (!isRecord(properties)) return null;

  const requiredNames = new Set(asStringArray(schemaData.required));
  const parameters: ParameterDefinition[] = [];

  for (const [name, propertySchema] of Object.entries(properties)) {
    if (!isRecord(propertySchema)) continue;

    const enumValues = asStringArray(propertySchema.enum);
    const parameterType = mapJsonSchemaType(propertySchema, enumValues);
    if (!parameterType) continue;

    const description =
      typeof propertySchema.description === 'string' && propertySchema.description.trim()
        ? propertySchema.description
        : name;

    const nestedObjectSchema =
      parameterType === ParameterType.OBJECT ? jsonSchemaToParameterSchema(propertySchema) ?? undefined : undefined;

    const rawItems = propertySchema.items;
    const arrayItemSchema =
      parameterType === ParameterType.ARRAY && isRecord(rawItems)
        ? jsonSchemaToParameterSchema(rawItems) ?? rawItems
        : undefined;

    parameters.push(new ParameterDefinition({
      name,
      type: parameterType,
      description,
      required: requiredNames.has(name),
      defaultValue: propertySchema.default,
      enumValues: enumValues.length > 0 ? enumValues : undefined,
      minValue: typeof propertySchema.minimum === 'number' ? propertySchema.minimum : undefined,
      maxValue: typeof propertySchema.maximum === 'number' ? propertySchema.maximum : undefined,
      pattern: typeof propertySchema.pattern === 'string' ? propertySchema.pattern : undefined,
      objectSchema: nestedObjectSchema,
      arrayItemSchema
    }));
  }

  return parameters.length > 0 ? new ParameterSchema(parameters) : null;
};

export class AutobyteusModelProvider {
  static readonly DEFAULT_SERVER_URL = 'https://localhost:8000';

  static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return Boolean(parsed.protocol && parsed.host);
    } catch {
      return false;
    }
  }

  static async getModels(
    hosts: string[],
    authentication: AutobyteusDiscoveryAuthentication,
  ): Promise<LLMModel[]> {
    if (!hosts.length) return [];

    const allModels: LLMModel[] = [];
    let authoritativeResponses = 0;

    for (const hostUrl of hosts) {
      if (!AutobyteusModelProvider.isValidUrl(hostUrl)) {
        console.error(`Invalid Autobyteus host URL: ${hostUrl}, skipping.`);
        continue;
      }

      console.info(`Discovering Autobyteus models from host: ${hostUrl}`);
      let client: AutobyteusClient | null = null;

      try {
        client = new AutobyteusClient(
          hostUrl,
          authentication.apiKey.revealToTrustedConsumer(),
        );
        const response = await client.getAvailableLlmModelsSync();

        if (!AutobyteusModelProvider.validateServerResponse(response)) {
          continue;
        }
        authoritativeResponses += 1;

        const responseRecord = response as ServerResponse;
        const models = Array.isArray(responseRecord.models)
          ? (responseRecord.models as ModelInfoPayload[])
          : [];
        for (const modelInfo of models) {
          const validation = AutobyteusModelProvider.validateModelInfo(modelInfo);
          if (!validation.valid) {
            console.warn(validation.message);
            continue;
          }

          const configData = modelInfo.config;
          if (!configData || typeof configData !== 'object' || Array.isArray(configData)) {
            console.warn('Config must be a dictionary');
            continue;
          }
          const llmConfig = AutobyteusModelProvider.parseLLMConfig(configData as Record<string, unknown>);
          if (!llmConfig) {
            continue;
          }

          try {
            const provider = AutobyteusModelProvider.parseProvider(String(modelInfo.provider));
            const llmModel = new LLMModel({
              name: String(modelInfo.name),
              value: String(modelInfo.value),
              provider,
              credentialProviderId: LLMProvider.AUTOBYTEUS,
              authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
              llmClass: AutobyteusLLM,
              canonicalName: (modelInfo.canonical_name as string | undefined) ?? String(modelInfo.name),
              runtime: LLMRuntime.AUTOBYTEUS,
              hostUrl: hostUrl,
              defaultConfig: llmConfig,
              configSchema: AutobyteusModelProvider.parseConfigSchema(modelInfo.config_schema),
              maxContextTokens: isPositiveInteger(modelInfo.max_context_tokens)
                ? modelInfo.max_context_tokens
                : llmConfig.tokenLimit ?? null,
              activeContextTokens: isPositiveInteger(modelInfo.active_context_tokens)
                ? modelInfo.active_context_tokens
                : null,
              maxInputTokens: isPositiveInteger(modelInfo.max_input_tokens)
                ? modelInfo.max_input_tokens
                : null,
              maxOutputTokens: isPositiveInteger(modelInfo.max_output_tokens)
                ? modelInfo.max_output_tokens
                : null
            });
            allModels.push(llmModel);
          } catch (error: any) {
            console.error(
              `Failed to create LLMModel for '${modelInfo?.name ?? 'unknown'}' from ${hostUrl}: ${error?.message ?? error}`
            );
          }
        }
      } catch {
        console.warn('AUTOBYTEUS_LLM_DISCOVERY_REMOTE_FAILED');
      } finally {
        if (client) {
          await client.close();
        }
      }
    }

    if (authoritativeResponses === 0) throw new Error('AUTOBYTEUS_LLM_DISCOVERY_FAILED');
    return allModels;
  }

  private static validateServerResponse(response: unknown): boolean {
    if (typeof response !== 'object' || response === null) {
      console.error('Invalid server response format');
      return false;
    }

    if (!('models' in (response as ServerResponse))) {
      console.error("Missing 'models' field in response");
      return false;
    }

    if (!Array.isArray((response as ServerResponse).models)) {
      console.error("Models field must be a list");
      return false;
    }

    return true;
  }

  private static validateModelInfo(modelInfo: ModelInfoPayload): { valid: boolean; message: string } {
    const requiredFields = ['name', 'value', 'provider', 'config'];
    for (const field of requiredFields) {
      if (!(field in modelInfo)) {
        return { valid: false, message: `Missing required field '${field}' in model info` };
      }
      if (!modelInfo[field]) {
        return { valid: false, message: `Empty value for required field '${field}'` };
      }
    }

    const providerValue = String(modelInfo.provider ?? '');
    if (!AutobyteusModelProvider.isProviderValue(providerValue)) {
      return { valid: false, message: `Invalid provider '${providerValue}'` };
    }

    if (typeof modelInfo.config !== 'object' || modelInfo.config === null || Array.isArray(modelInfo.config)) {
      return { valid: false, message: 'Config must be a dictionary' };
    }

    return { valid: true, message: '' };
  }

  private static parseLLMConfig(configData: Record<string, unknown>): LLMConfig | null {
    try {
      const pricingData = (configData as { pricing_config?: Record<string, unknown> }).pricing_config ?? {};
      if (!AutobyteusModelProvider.validatePricingConfig(pricingData)) {
        throw new Error('Invalid pricing configuration');
      }

      const llmConfig = LLMConfig.fromDict(configData);
      if (llmConfig.tokenLimit !== null && llmConfig.tokenLimit !== undefined && llmConfig.tokenLimit < 1) {
        console.warn('Token limit out of range, resetting to null');
        llmConfig.tokenLimit = null;
      }

      if (llmConfig.temperature < 0 || llmConfig.temperature > 2) {
        console.warn('Temperature out of range, resetting to 0.7');
        llmConfig.temperature = 0.7;
      }

      return llmConfig;
    } catch (error: unknown) {
      console.error(`Config parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private static parseConfigSchema(schemaData: unknown): ParameterSchema | undefined {
    if (!isRecord(schemaData)) return undefined;

    try {
      if (Array.isArray(schemaData.parameters)) {
        const schema = ParameterSchema.fromConfig(schemaData);
        return schema.parameters.length > 0 ? schema : undefined;
      }

      return jsonSchemaToParameterSchema(schemaData) ?? undefined;
    } catch (error: unknown) {
      console.warn(`Config schema parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private static validatePricingConfig(pricingData: Record<string, unknown>): boolean {
    const requiredKeys = ['input_token_pricing', 'output_token_pricing'];

    for (const key of requiredKeys) {
      if (!(key in pricingData)) {
        console.error(`Missing pricing key: ${key}`);
        return false;
      }
      const value = pricingData[key];
      if (typeof value !== 'number') {
        console.error(`Invalid pricing type for ${key}`);
        return false;
      }
      if (value < 0) {
        console.error(`Negative pricing for ${key}`);
        return false;
      }
    }

    return true;
  }

  private static isProviderValue(provider: string): boolean {
    return Object.values(LLMProvider).includes(provider as LLMProvider);
  }

  private static parseProvider(provider: string): LLMProvider {
    if (!AutobyteusModelProvider.isProviderValue(provider)) {
      throw new Error(`Invalid provider '${provider}'`);
    }
    return provider as LLMProvider;
  }
}
