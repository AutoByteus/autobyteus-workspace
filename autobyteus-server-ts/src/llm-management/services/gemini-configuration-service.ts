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

export type GeminiConfigurationOption =
  | 'AI_STUDIO'
  | 'VERTEX_EXPRESS'
  | 'VERTEX_PROJECT';

export type GeminiEffectiveMode = GeminiConfigurationOption | 'UNCONFIGURED';
export type GeminiConfigurationState = 'MISSING' | 'CONFIGURED';

export type GeminiOptionSaveCommand =
  | { option: 'AI_STUDIO'; apiKey: string }
  | { option: 'VERTEX_EXPRESS'; apiKey: string }
  | { option: 'VERTEX_PROJECT'; project: string; location: string };

export type GeminiConfigurationOperationResult = {
  operation: 'SAVED' | 'REMOVED';
  option: GeminiConfigurationOption;
  effectiveMode: GeminiEffectiveMode;
};

export type GeminiSetupStatus = {
  selection: GeminiRuntimeSelection;
  effectiveMode: GeminiEffectiveMode;
  aiStudioStatus: ProviderApiKeyStatus;
  vertexExpressStatus: ProviderApiKeyStatus;
  vertexProjectStatus: GeminiConfigurationState;
  project: string | null;
  location: string | null;
};

const normalizeRequired = (value: string, name: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`GEMINI_${name.toUpperCase()}_REQUIRED`);
  return normalized;
};

const effectiveMode = (selection: GeminiRuntimeSelection): GeminiEffectiveMode => {
  switch (selection.kind) {
    case 'vertexExpress': return 'VERTEX_EXPRESS';
    case 'vertexProject': return 'VERTEX_PROJECT';
    case 'aiStudio': return 'AI_STUDIO';
    case 'unconfigured': return 'UNCONFIGURED';
  }
};

export class GeminiConfigurationService {
  async getSetupStatus(): Promise<GeminiSetupStatus> {
    const [vertexExpressStatus, aiStudioStatus] = await Promise.all([
      this.status('geminiVertexExpressApiKey'),
      this.status('geminiAiStudioApiKey'),
    ]);
    const project = appConfigProvider.config.get('VERTEX_AI_PROJECT')?.trim() || null;
    const location = appConfigProvider.config.get('VERTEX_AI_LOCATION')?.trim() || null;
    const vertexProjectStatus = project && location ? 'CONFIGURED' : 'MISSING';
    const selection = selectGeminiRuntime({
      vertexExpressStatus,
      aiStudioStatus,
      project,
      location,
    });
    return {
      selection,
      effectiveMode: effectiveMode(selection),
      aiStudioStatus,
      vertexExpressStatus,
      vertexProjectStatus,
      project,
      location,
    };
  }

  async saveOptionConfiguration(
    input: GeminiOptionSaveCommand,
  ): Promise<GeminiConfigurationOperationResult> {
    if (input.option === 'AI_STUDIO') {
      await this.management().saveForConsumer({
        consumer: this.consumer('geminiAiStudioApiKey'),
        value: SecretValue.fromString(normalizeRequired(input.apiKey, 'api_key')),
      });
    } else if (input.option === 'VERTEX_EXPRESS') {
      await this.management().saveForConsumer({
        consumer: this.consumer('geminiVertexExpressApiKey'),
        value: SecretValue.fromString(normalizeRequired(input.apiKey, 'api_key')),
      });
    } else {
      appConfigProvider.config.set(
        'VERTEX_AI_PROJECT',
        normalizeRequired(input.project, 'project'),
      );
      appConfigProvider.config.set(
        'VERTEX_AI_LOCATION',
        normalizeRequired(input.location, 'location'),
      );
    }
    return this.operationResult('SAVED', input.option);
  }

  async removeOptionConfiguration(
    option: GeminiConfigurationOption,
  ): Promise<GeminiConfigurationOperationResult> {
    if (option === 'AI_STUDIO') {
      await this.management().removeForConsumer(this.consumer('geminiAiStudioApiKey'));
    } else if (option === 'VERTEX_EXPRESS') {
      await this.management().removeForConsumer(this.consumer('geminiVertexExpressApiKey'));
    } else {
      appConfigProvider.config.delete('VERTEX_AI_PROJECT');
      appConfigProvider.config.delete('VERTEX_AI_LOCATION');
    }
    return this.operationResult('REMOVED', option);
  }

  private async operationResult(
    operation: 'SAVED' | 'REMOVED',
    option: GeminiConfigurationOption,
  ): Promise<GeminiConfigurationOperationResult> {
    return { operation, option, effectiveMode: (await this.getSetupStatus()).effectiveMode };
  }

  private management() {
    return getSecretStorageConfigurationService().requireManagementService();
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
