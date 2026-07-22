import {
  AudioClientFactory,
  ImageClientFactory,
  VideoClientFactory,
  type LLMAuthenticationRequirement,
  type ResolvedMultimediaAuthentication,
} from 'autobyteus-ts';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import type { SecretManagementService } from '../../secret-management/services/secret-management-service.js';
import { appConfigProvider } from '../../config/app-config-provider.js';

type MediaKind = 'audio' | 'image' | 'video';

export class MediaClientProvisioningService {
  constructor(
    private readonly audioFactory = AudioClientFactory,
    private readonly imageFactory = ImageClientFactory,
    private readonly videoFactory = VideoClientFactory,
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretStorageConfigurationService().requireManagementService(),
  ) {}

  async createAudioClient(modelIdentifier: string) {
    const model = this.audioFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'audio', model.credentialProviderId, model.authenticationRequirement,
    );
    return this.audioFactory.createAudioClient(modelIdentifier, { authentication });
  }

  async createImageClient(modelIdentifier: string) {
    const model = this.imageFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'image', model.credentialProviderId, model.authenticationRequirement,
    );
    return this.imageFactory.createImageClient(modelIdentifier, { authentication });
  }

  async createVideoClient(modelIdentifier: string) {
    const model = this.videoFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'video', model.credentialProviderId, model.authenticationRequirement,
    );
    return this.videoFactory.createVideoClient(modelIdentifier, { authentication });
  }

  private async resolveAuthentication(
    mediaKind: MediaKind,
    providerId: string,
    requirement: LLMAuthenticationRequirement,
  ): Promise<ResolvedMultimediaAuthentication> {
    if (requirement.kind === 'none') return { kind: 'none' };
    if (requirement.kind === 'geminiAuthenticationMode') {
      if (providerId.toUpperCase() !== 'GEMINI') throw new Error('MEDIA_AUTHENTICATION_MODE_INVALID');
      const mode = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
      if (mode === 'VERTEX_PROJECT') {
        const project = appConfigProvider.config.get('VERTEX_AI_PROJECT')?.trim();
        const location = appConfigProvider.config.get('VERTEX_AI_LOCATION')?.trim();
        if (!project || !location) throw new Error('GOOGLE_WORKLOAD_IDENTITY_CONFIG_INVALID');
        return { kind: 'geminiVertexProject', project, location };
      }
      const credentialSlot = mode === 'AI_STUDIO'
        ? 'geminiAiStudioApiKey'
        : mode === 'VERTEX_EXPRESS'
          ? 'geminiVertexExpressApiKey'
          : null;
      if (!credentialSlot) throw new Error('GEMINI_SETUP_MODE_INVALID');
      const apiKey = await this.resolve({ kind: 'media', mediaKind, providerId, credentialSlot });
      return mode === 'AI_STUDIO'
        ? { kind: 'geminiAiStudio', apiKey }
        : { kind: 'geminiVertexExpress', apiKey };
    }
    const credentialSlot = requirement.credentialSlot;
    if (credentialSlot !== 'apiKey') throw new Error('MEDIA_AUTHENTICATION_REQUIREMENT_INVALID');
    const apiKey = await this.resolve({ kind: 'media', mediaKind, providerId, credentialSlot });
    return { kind: 'apiKey', apiKey };
  }

  private resolve(consumer: SecretConsumerIdentity) {
    return this.managementProvider().resolveForUse(consumer);
  }
}

let singleton: MediaClientProvisioningService | null = null;
export const getMediaClientProvisioningService = (): MediaClientProvisioningService => {
  singleton ??= new MediaClientProvisioningService();
  return singleton;
};
