import {
  LLMProvider,
  SecretValue,
  selectGeminiRuntime,
  type GeminiRuntimeSelection,
  type ProviderApiKeyStatus,
} from 'autobyteus-ts';
import { appConfigProvider } from '../../config/app-config-provider.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-binding.js';
import { getSecretStorageConfigurationService } from '../../secret-management/configuration/secret-storage-configuration-service.js';

export type GeminiSetupCommand = {
  mode: 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT';
  apiKey?: string | null;
  project?: string | null;
  location?: string | null;
};

export type GeminiSetupStatus = {
  selection: GeminiRuntimeSelection;
  aiStudioStatus: ProviderApiKeyStatus;
  vertexExpressStatus: ProviderApiKeyStatus;
  project: string | null;
  location: string | null;
};

const normalizeRequired = (value: string | null | undefined, name: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`GEMINI_${name.toUpperCase()}_REQUIRED`);
  return normalized;
};

export class GeminiConfigurationService {
  async getSetupStatus(): Promise<GeminiSetupStatus> {
    const [vertexExpressStatus, aiStudioStatus] = await Promise.all([
      this.status('geminiVertexExpressApiKey'),
      this.status('geminiAiStudioApiKey'),
    ]);
    const project = appConfigProvider.config.get('VERTEX_AI_PROJECT')?.trim() || null;
    const location = appConfigProvider.config.get('VERTEX_AI_LOCATION')?.trim() || null;
    return {
      selection: selectGeminiRuntime({
        vertexExpressStatus,
        aiStudioStatus,
        project,
        location,
      }),
      aiStudioStatus,
      vertexExpressStatus,
      project,
      location,
    };
  }

  async setSetup(input: GeminiSetupCommand): Promise<GeminiSetupStatus> {
    const management = getSecretStorageConfigurationService().requireManagementService();
    if (input.mode === 'AI_STUDIO') {
      await management.saveForConsumer({
        consumer: this.consumer('geminiAiStudioApiKey'),
        value: SecretValue.fromString(normalizeRequired(input.apiKey, 'api_key')),
      });
      await management.removeForConsumer(this.consumer('geminiVertexExpressApiKey'));
      appConfigProvider.config.delete('VERTEX_AI_PROJECT');
      appConfigProvider.config.delete('VERTEX_AI_LOCATION');
    } else if (input.mode === 'VERTEX_EXPRESS') {
      await management.saveForConsumer({
        consumer: this.consumer('geminiVertexExpressApiKey'),
        value: SecretValue.fromString(normalizeRequired(input.apiKey, 'api_key')),
      });
      await management.removeForConsumer(this.consumer('geminiAiStudioApiKey'));
      appConfigProvider.config.delete('VERTEX_AI_PROJECT');
      appConfigProvider.config.delete('VERTEX_AI_LOCATION');
    } else {
      appConfigProvider.config.set(
        'VERTEX_AI_PROJECT',
        normalizeRequired(input.project, 'project'),
      );
      appConfigProvider.config.set(
        'VERTEX_AI_LOCATION',
        normalizeRequired(input.location, 'location'),
      );
      await management.removeForConsumer(this.consumer('geminiVertexExpressApiKey'));
      await management.removeForConsumer(this.consumer('geminiAiStudioApiKey'));
    }
    return this.getSetupStatus();
  }

  private async status(
    credentialSlot: 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey',
  ): Promise<ProviderApiKeyStatus> {
    try {
      const result = await getSecretStorageConfigurationService()
        .requireManagementService()
        .getStatusForConsumer(this.consumer(credentialSlot));
      const status = result.secret;
      return result.health.state === 'READY' && status
        ? status.storageState
        : 'MISSING';
    } catch {
      return 'MISSING';
    }
  }

  private consumer(
    credentialSlot: 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey',
  ): SecretConsumerIdentity {
    return {
      kind: 'llm',
      providerId: LLMProvider.GEMINI,
      credentialSlot,
    };
  }
}

let singleton: GeminiConfigurationService | null = null;
export const getGeminiConfigurationService = (): GeminiConfigurationService => {
  singleton ??= new GeminiConfigurationService();
  return singleton;
};
