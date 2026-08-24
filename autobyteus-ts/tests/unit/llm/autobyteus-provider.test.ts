import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAvailableLlmModelsSync = vi.hoisted(() => vi.fn());
const mockClose = vi.hoisted(() => vi.fn());
const mockClientConstruction = vi.hoisted(() => vi.fn());

vi.mock('../../../src/clients/autobyteus-client.js', () => ({
  AutobyteusClient: class {
    constructor(...args: unknown[]) {
      mockClientConstruction(...args);
    }
    getAvailableLlmModelsSync = mockGetAvailableLlmModelsSync;
    close = mockClose;
  }
}));

import { AutobyteusModelProvider } from '../../../src/llm/autobyteus-provider.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';

const discoveryAuthentication = () => ({
  apiKey: SecretValue.fromString('synthetic-gateway-key'),
});

describe('AutobyteusModelProvider', () => {
  beforeEach(() => {
    mockGetAvailableLlmModelsSync.mockReset();
    mockClose.mockReset();
    mockClientConstruction.mockReset();
  });

  it('keeps unknown context metadata as null instead of defaulting to 8192', async () => {
    const controller = new AbortController();
    mockGetAvailableLlmModelsSync.mockResolvedValue({
      models: [
        {
          name: 'remote-model',
          value: 'remote-model',
          canonical_name: 'remote-model',
          provider: 'OPENAI',
          config: {
            pricing_config: {
              input_token_pricing: 0,
              output_token_pricing: 0,
            },
          },
        },
      ],
    });

    const models = await AutobyteusModelProvider.getModels(
      'https://autobyteus.example', discoveryAuthentication(), { signal: controller.signal },
    );

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBeNull();
    expect(models[0]?.activeContextTokens).toBeNull();
    expect(models[0]).not.toHaveProperty('credentialProviderId');
    expect(models[0]).not.toHaveProperty('authenticationRequirement');
    expect(mockClientConstruction).toHaveBeenCalledWith(
      'https://autobyteus.example',
      'synthetic-gateway-key',
    );
    expect(mockGetAvailableLlmModelsSync).toHaveBeenCalledWith({ signal: controller.signal });
  });

  it('prefers explicit server metadata when present', async () => {
    mockGetAvailableLlmModelsSync.mockResolvedValue({
      models: [
        {
          name: 'server-model',
          value: 'server-model',
          canonical_name: 'server-model',
          provider: 'OPENAI',
          max_context_tokens: 200000,
          active_context_tokens: 64000,
          max_input_tokens: 180000,
          max_output_tokens: 16000,
          config: {
            token_limit: 120000,
            pricing_config: {
              input_token_pricing: 0,
              output_token_pricing: 0,
            },
          },
        },
      ],
    });

    const models = await AutobyteusModelProvider.getModels(
      'https://autobyteus.example', discoveryAuthentication(),
    );

    expect(models).toHaveLength(1);
    expect(models[0]?.maxContextTokens).toBe(200000);
    expect(models[0]?.activeContextTokens).toBe(64000);
    expect(models[0]?.maxInputTokens).toBe(180000);
    expect(models[0]?.maxOutputTokens).toBe(16000);
  });

  it('parses server config_schema into discovered model metadata', async () => {
    mockGetAvailableLlmModelsSync.mockResolvedValue({
      models: [
        {
          name: 'gemini-ui-rpa',
          value: 'gemini-ui-rpa',
          canonical_name: 'gemini-ui-rpa',
          provider: 'GEMINI',
          config_schema: {
            type: 'object',
            properties: {
              thinking_level: {
                type: 'string',
                description: 'How deeply the model should reason before responding',
                default: 'minimal',
                enum: ['minimal', 'low', 'medium', 'high']
              }
            },
            required: []
          },
          config: {
            pricing_config: {
              input_token_pricing: 0,
              output_token_pricing: 0,
            },
          },
        },
      ],
    });

    const models = await AutobyteusModelProvider.getModels(
      'https://autobyteus.example', discoveryAuthentication(),
    );
    const modelInfo = models[0]?.toModelInfo();

    expect(models).toHaveLength(1);
    expect(modelInfo?.config_schema).toMatchObject({
      properties: {
        thinking_level: expect.objectContaining({
          enum: ['minimal', 'low', 'medium', 'high'],
          default: 'minimal'
        })
      }
    });
  });
});
