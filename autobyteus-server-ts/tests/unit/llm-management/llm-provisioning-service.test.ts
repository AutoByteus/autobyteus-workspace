import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { LLMProvisioningService } from '../../../src/llm-management/services/llm-provisioning-service.js';

const configGet = vi.hoisted(() => vi.fn());

vi.mock('../../../src/config/app-config-provider.js', () => ({
  appConfigProvider: { config: { get: configGet } },
}));

describe('LLMProvisioningService credential-owner routing', () => {
  beforeEach(() => configGet.mockReset());

  it('constructs the consumer only from credentialProviderId and the tagged slot', async () => {
    const created = { kind: 'llm' };
    const factory = {
      describeConstructionTarget: vi.fn().mockResolvedValue({
        credentialProviderId: 'AUTOBYTEUS',
        authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
      }),
      createLLM: vi.fn().mockResolvedValue(created),
    };
    const apiKey = SecretValue.fromString('synthetic-gateway-key');
    const resolveForUse = vi.fn().mockResolvedValue(apiKey);
    const service = new LLMProvisioningService(
      factory as never,
      () => ({ resolveForUse } as never),
    );

    await expect(service.createLLM('remote-openai')).resolves.toBe(created);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    });
    expect(factory.createLLM).toHaveBeenCalledWith('remote-openai', {
      configInput: undefined,
      authentication: { kind: 'apiKey', apiKey },
    });
  });

  it.each([
    ['AI_STUDIO', 'geminiAiStudioApiKey', 'geminiAiStudio'],
    ['VERTEX_EXPRESS', 'geminiVertexExpressApiKey', 'geminiVertexExpress'],
  ] as const)('preserves exact %s Gemini API-key mode through LLM construction', async (
    mode,
    credentialSlot,
    authenticationKind,
  ) => {
    configGet.mockImplementation((key: string) => key === 'GEMINI_SETUP_MODE' ? mode : undefined);
    const apiKey = SecretValue.fromString(`synthetic-${mode.toLowerCase()}-key`);
    const resolveForUse = vi.fn().mockResolvedValue(apiKey);
    const factory = {
      describeConstructionTarget: vi.fn().mockResolvedValue({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      }),
      createLLM: vi.fn().mockResolvedValue({ kind: 'gemini-llm' }),
    };
    const service = new LLMProvisioningService(factory as never, () => ({ resolveForUse } as never));

    await service.createLLM('gemini-model');

    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'llm', providerId: 'GEMINI', credentialSlot,
    });
    expect(factory.createLLM).toHaveBeenCalledWith('gemini-model', {
      configInput: undefined,
      authentication: { kind: authenticationKind, apiKey },
    });
  });

  it('preserves exact Vertex Project mode without resolving an API key', async () => {
    const values: Record<string, string> = {
      GEMINI_SETUP_MODE: 'VERTEX_PROJECT',
      VERTEX_AI_PROJECT: 'synthetic-project',
      VERTEX_AI_LOCATION: 'synthetic-location',
    };
    configGet.mockImplementation((key: string) => values[key]);
    const resolveForUse = vi.fn();
    const factory = {
      describeConstructionTarget: vi.fn().mockResolvedValue({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      }),
      createLLM: vi.fn().mockResolvedValue({ kind: 'gemini-llm' }),
    };
    const service = new LLMProvisioningService(factory as never, () => ({ resolveForUse } as never));

    await service.createLLM('gemini-model');

    expect(resolveForUse).not.toHaveBeenCalled();
    expect(factory.createLLM).toHaveBeenCalledWith('gemini-model', {
      configInput: undefined,
      authentication: {
        kind: 'geminiVertexProject',
        project: 'synthetic-project',
        location: 'synthetic-location',
      },
    });
  });

  it('rejects an unknown Gemini mode without inferring or resolving a credential', async () => {
    configGet.mockReturnValue('UNREVIEWED_MODE');
    const resolveForUse = vi.fn();
    const factory = {
      describeConstructionTarget: vi.fn().mockResolvedValue({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      }),
      createLLM: vi.fn(),
    };
    const service = new LLMProvisioningService(factory as never, () => ({ resolveForUse } as never));

    await expect(service.createLLM('gemini-model')).rejects.toThrow('GEMINI_SETUP_MODE_INVALID');
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(factory.createLLM).not.toHaveBeenCalled();
  });
});
