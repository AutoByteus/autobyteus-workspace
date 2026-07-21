import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { LLMProvisioningService } from '../../../src/llm-management/services/llm-provisioning-service.js';

describe('LLMProvisioningService credential-owner routing', () => {
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
});
