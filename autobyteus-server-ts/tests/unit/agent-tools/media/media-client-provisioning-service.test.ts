import { describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { MediaClientProvisioningService } from '../../../../src/agent-tools/media/media-client-provisioning-service.js';

const gatewayTarget = {
  credentialProviderId: 'AUTOBYTEUS',
  authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
} as const;

describe('MediaClientProvisioningService gateway credential routing', () => {
  it.each([
    ['audio', 'createAudioClient', 'describeConstructionTarget', 'createAudioClient'],
    ['image', 'createImageClient', 'describeConstructionTarget', 'createImageClient'],
  ] as const)('uses only target credential ownership for %s', async (
    mediaKind, serviceMethod, describeMethod, createMethod,
  ) => {
    const createdClient = { mediaKind };
    const selectedFactory = {
      [describeMethod]: vi.fn(() => gatewayTarget),
      [createMethod]: vi.fn(() => createdClient),
    };
    const unusedFactory = {
      describeConstructionTarget: vi.fn(),
      createAudioClient: vi.fn(),
      createImageClient: vi.fn(),
      createVideoClient: vi.fn(),
    };
    const resolveForUse = vi.fn().mockResolvedValue(SecretValue.fromString('synthetic-gateway-key'));
    const service = new MediaClientProvisioningService(
      (mediaKind === 'audio' ? selectedFactory : unusedFactory) as never,
      (mediaKind === 'image' ? selectedFactory : unusedFactory) as never,
      unusedFactory as never,
      () => ({ resolveForUse } as never),
    );

    await expect(service[serviceMethod]('remote-model')).resolves.toBe(createdClient);
    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'media', mediaKind, providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    });
    expect(selectedFactory[createMethod]).toHaveBeenCalledWith('remote-model', {
      authentication: { kind: 'apiKey', apiKey: expect.any(SecretValue) },
    });
  });
});
