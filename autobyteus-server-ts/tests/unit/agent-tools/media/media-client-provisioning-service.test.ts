import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { MediaClientProvisioningService } from '../../../../src/agent-tools/media/media-client-provisioning-service.js';

const configGet = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/config/app-config-provider.js', () => ({
  appConfigProvider: { config: { get: configGet } },
}));

const gatewayTarget = {
  credentialProviderId: 'AUTOBYTEUS',
  authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
} as const;

describe('MediaClientProvisioningService gateway credential routing', () => {
  beforeEach(() => configGet.mockReset());

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

  it.each([
    ['AI_STUDIO', 'geminiAiStudioApiKey', 'geminiAiStudio'],
    ['VERTEX_EXPRESS', 'geminiVertexExpressApiKey', 'geminiVertexExpress'],
  ] as const)('preserves exact %s Gemini API-key mode through media construction', async (
    mode,
    credentialSlot,
    authenticationKind,
  ) => {
    configGet.mockImplementation((key: string) => key === 'GEMINI_SETUP_MODE' ? mode : undefined);
    const apiKey = SecretValue.fromString(`synthetic-${mode.toLowerCase()}-key`);
    const resolveForUse = vi.fn().mockResolvedValue(apiKey);
    const imageFactory = {
      describeConstructionTarget: vi.fn(() => ({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      })),
      createImageClient: vi.fn(() => ({ kind: 'gemini-image' })),
    };
    const unusedFactory = {
      describeConstructionTarget: vi.fn(),
      createAudioClient: vi.fn(),
      createVideoClient: vi.fn(),
    };
    const service = new MediaClientProvisioningService(
      unusedFactory as never,
      imageFactory as never,
      unusedFactory as never,
      () => ({ resolveForUse } as never),
    );

    await service.createImageClient('gemini-image');

    expect(resolveForUse).toHaveBeenCalledWith({
      kind: 'media', mediaKind: 'image', providerId: 'GEMINI', credentialSlot,
    });
    expect(imageFactory.createImageClient).toHaveBeenCalledWith('gemini-image', {
      authentication: { kind: authenticationKind, apiKey },
    });
  });

  it('preserves exact Vertex Project mode through media construction without an API key', async () => {
    const values: Record<string, string> = {
      GEMINI_SETUP_MODE: 'VERTEX_PROJECT',
      VERTEX_AI_PROJECT: 'synthetic-project',
      VERTEX_AI_LOCATION: 'synthetic-location',
    };
    configGet.mockImplementation((key: string) => values[key]);
    const resolveForUse = vi.fn();
    const imageFactory = {
      describeConstructionTarget: vi.fn(() => ({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      })),
      createImageClient: vi.fn(() => ({ kind: 'gemini-image' })),
    };
    const unusedFactory = {
      describeConstructionTarget: vi.fn(),
      createAudioClient: vi.fn(),
      createVideoClient: vi.fn(),
    };
    const service = new MediaClientProvisioningService(
      unusedFactory as never,
      imageFactory as never,
      unusedFactory as never,
      () => ({ resolveForUse } as never),
    );

    await service.createImageClient('gemini-image');

    expect(resolveForUse).not.toHaveBeenCalled();
    expect(imageFactory.createImageClient).toHaveBeenCalledWith('gemini-image', {
      authentication: {
        kind: 'geminiVertexProject',
        project: 'synthetic-project',
        location: 'synthetic-location',
      },
    });
  });

  it('rejects an unknown Gemini media mode without inferring or resolving a credential', async () => {
    configGet.mockReturnValue('UNREVIEWED_MODE');
    const resolveForUse = vi.fn();
    const imageFactory = {
      describeConstructionTarget: vi.fn(() => ({
        credentialProviderId: 'GEMINI',
        authenticationRequirement: { kind: 'geminiAuthenticationMode' },
      })),
      createImageClient: vi.fn(),
    };
    const unusedFactory = {
      describeConstructionTarget: vi.fn(),
      createAudioClient: vi.fn(),
      createVideoClient: vi.fn(),
    };
    const service = new MediaClientProvisioningService(
      unusedFactory as never,
      imageFactory as never,
      unusedFactory as never,
      () => ({ resolveForUse } as never),
    );

    await expect(service.createImageClient('gemini-image')).rejects.toThrow(
      'GEMINI_SETUP_MODE_INVALID',
    );
    expect(resolveForUse).not.toHaveBeenCalled();
    expect(imageFactory.createImageClient).not.toHaveBeenCalled();
  });
});
