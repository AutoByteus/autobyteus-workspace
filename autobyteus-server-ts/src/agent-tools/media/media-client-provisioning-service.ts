import {
  AudioClientFactory,
  ImageClientFactory,
  VideoClientFactory,
  type ResolvedMultimediaAuthentication,
} from 'autobyteus-ts';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import { appConfigProvider } from '../../config/app-config-provider.js';

type MediaKind = 'audio' | 'image' | 'video';

export class MediaClientProvisioningService {
  async createAudioClient(modelIdentifier: string) {
    const model = AudioClientFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'audio', String(model.provider), model.authenticationRequirement,
    );
    return AudioClientFactory.createAudioClient(modelIdentifier, { authentication });
  }

  async createImageClient(modelIdentifier: string) {
    const model = ImageClientFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'image', String(model.provider), model.authenticationRequirement,
    );
    return ImageClientFactory.createImageClient(modelIdentifier, { authentication });
  }

  async createVideoClient(modelIdentifier: string) {
    const model = VideoClientFactory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      'video', String(model.provider), model.authenticationRequirement,
    );
    return VideoClientFactory.createVideoClient(modelIdentifier, { authentication });
  }

  private async resolveAuthentication(
    mediaKind: MediaKind,
    providerId: string,
    requirement: { kind: string; credentialSlot?: string; required?: boolean },
  ): Promise<ResolvedMultimediaAuthentication> {
    if (requirement.kind === 'none') return { kind: 'none' };
    if (requirement.kind === 'googleAuthenticationMode') {
      const mode = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
      if (mode === 'VERTEX_PROJECT') {
        const project = appConfigProvider.config.get('VERTEX_AI_PROJECT')?.trim();
        const location = appConfigProvider.config.get('VERTEX_AI_LOCATION')?.trim();
        if (!project || !location) throw new Error('GOOGLE_WORKLOAD_IDENTITY_CONFIG_INVALID');
        return { kind: 'googleWorkloadIdentity', project, location };
      }
      const credentialSlot = mode === 'AI_STUDIO'
        ? 'geminiAiStudioApiKey'
        : mode === 'VERTEX_EXPRESS'
          ? 'geminiVertexExpressApiKey'
          : null;
      if (!credentialSlot) throw new Error('GEMINI_SETUP_MODE_INVALID');
      const apiKey = await this.resolve({ kind: 'media', mediaKind, providerId, credentialSlot });
      return { kind: 'apiKey', apiKey };
    }
    const credentialSlot = requirement.credentialSlot;
    if (credentialSlot !== 'apiKey') throw new Error('MEDIA_AUTHENTICATION_REQUIREMENT_INVALID');
    const apiKey = await this.resolve({ kind: 'media', mediaKind, providerId, credentialSlot });
    return { kind: 'apiKey', apiKey };
  }

  private resolve(consumer: SecretConsumerIdentity) {
    return getSecretStorageConfigurationService()
      .requireManagementService()
      .resolveForUse(consumer);
  }
}

let singleton: MediaClientProvisioningService | null = null;
export const getMediaClientProvisioningService = (): MediaClientProvisioningService => {
  singleton ??= new MediaClientProvisioningService();
  return singleton;
};
