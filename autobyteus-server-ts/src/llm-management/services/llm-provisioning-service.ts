import {
  LLMFactory,
  type BaseLLM,
  type LLMFactoryConfigInput,
  type ResolvedLLMAuthentication,
} from 'autobyteus-ts';
import type { SecretConsumerIdentity, SecretCredentialSlot } from '../../secret-management/domain/secret-binding.js';
import type { SecretManagementService } from '../../secret-management/services/secret-management-service.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';
import { appConfigProvider } from '../../config/app-config-provider.js';

type LlmFactoryPort = Pick<typeof LLMFactory, 'describeConstructionTarget' | 'createLLM'>;

export class LLMProvisioningService {
  constructor(
    private readonly factory: LlmFactoryPort = LLMFactory,
    private readonly managementProvider: () => SecretManagementService = () =>
      getSecretStorageConfigurationService().requireManagementService(),
  ) {}

  async createLLM(modelIdentifier: string, configInput?: LLMFactoryConfigInput): Promise<BaseLLM> {
    const target = await this.factory.describeConstructionTarget(modelIdentifier);
    const authentication = await this.resolveAuthentication(
      target.credentialProviderId,
      target.authenticationRequirement,
    );
    return this.factory.createLLM(modelIdentifier, { configInput, authentication });
  }

  private async resolveAuthentication(
    providerId: string,
    requirement: Awaited<ReturnType<LlmFactoryPort['describeConstructionTarget']>>['authenticationRequirement'],
  ): Promise<ResolvedLLMAuthentication> {
    if (requirement.kind === 'none') return { kind: 'none' };
    if (requirement.kind === 'googleAuthenticationMode') {
      return this.resolveGoogleAuthentication(providerId);
    }

    const consumer = this.llmConsumer(providerId, requirement.credentialSlot);
    if (!requirement.required) {
      const status = await this.managementProvider().getStatusForConsumer(consumer);
      if (status.health.state === 'READY' && status.secret?.storageState === 'MISSING') {
        return { kind: 'none' };
      }
    }
    const apiKey = await this.managementProvider().resolveForUse(consumer);
    return { kind: 'apiKey', apiKey };
  }

  private async resolveGoogleAuthentication(providerId: string): Promise<ResolvedLLMAuthentication> {
    if (providerId.toUpperCase() !== 'GEMINI') throw new Error('LLM_AUTHENTICATION_MODE_INVALID');
    const mode = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
    if (mode === 'AI_STUDIO' || mode === 'VERTEX_EXPRESS') {
      const credentialSlot = mode === 'AI_STUDIO'
        ? 'geminiAiStudioApiKey'
        : 'geminiVertexExpressApiKey';
      const apiKey = await this.managementProvider().resolveForUse(
        this.llmConsumer(providerId, credentialSlot),
      );
      return { kind: 'apiKey', apiKey };
    }
    if (mode === 'VERTEX_PROJECT') {
      const project = appConfigProvider.config.get('VERTEX_AI_PROJECT')?.trim();
      const location = appConfigProvider.config.get('VERTEX_AI_LOCATION')?.trim();
      if (!project || !location) throw new Error('GOOGLE_WORKLOAD_IDENTITY_CONFIG_INVALID');
      return { kind: 'googleWorkloadIdentity', project, location };
    }
    throw new Error('GEMINI_SETUP_MODE_INVALID');
  }

  private llmConsumer(providerId: string, credentialSlot: SecretCredentialSlot): SecretConsumerIdentity {
    return { kind: 'llm', providerId, credentialSlot };
  }
}

let singleton: LLMProvisioningService | null = null;
export const getLLMProvisioningService = (): LLMProvisioningService => {
  singleton ??= new LLMProvisioningService();
  return singleton;
};
