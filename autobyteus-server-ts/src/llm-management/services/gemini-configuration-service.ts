import {
  LLMProvider,
  SecretValue,
  type GeminiRuntimeSelection,
} from 'autobyteus-ts';
import { appConfigProvider } from '../../config/app-config-provider.js';
import type { SecretConsumerIdentity } from '../../secret-management/domain/secret-id.js';
import { getSecretVaultRuntime } from '../../secret-management/secret-vault-runtime.js';

export type GeminiConfigurationOption = 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT';
export type GeminiConfigurationState = 'MISSING' | 'CONFIGURED' | 'UNAVAILABLE';
export type GeminiOptionSaveCommand =
  | { option: 'AI_STUDIO'; apiKey: string }
  | { option: 'VERTEX_EXPRESS'; apiKey: string }
  | { option: 'VERTEX_PROJECT'; project: string; location: string };

export type GeminiSetupStatus = {
  activeMode: GeminiConfigurationOption | null;
  selection: GeminiRuntimeSelection;
  aiStudioStatus: GeminiConfigurationState;
  vertexExpressStatus: GeminiConfigurationState;
  vertexProjectStatus: Exclude<GeminiConfigurationState, 'UNAVAILABLE'>;
  project: string | null;
  location: string | null;
};

const normalizeRequired = (value: string, name: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`GEMINI_${name.toUpperCase()}_REQUIRED`);
  return normalized;
};

const readConfiguredMode = (): GeminiConfigurationOption | null => {
  const value = appConfigProvider.config.get('GEMINI_SETUP_MODE')?.trim().toUpperCase();
  return value === 'AI_STUDIO' || value === 'VERTEX_EXPRESS' || value === 'VERTEX_PROJECT'
    ? value
    : null;
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
    const activeMode = readConfiguredMode();
    const selection = this.toRuntimeSelection({
      activeMode,
      aiStudioStatus,
      vertexExpressStatus,
      vertexProjectStatus,
      project,
      location,
    });
    return {
      activeMode,
      selection,
      aiStudioStatus,
      vertexExpressStatus,
      vertexProjectStatus,
      project,
      location,
    };
  }

  async resolveActiveRuntime(): Promise<GeminiRuntimeSelection> {
    return (await this.getSetupStatus()).selection;
  }

  async saveOptionConfiguration(
    input: GeminiOptionSaveCommand,
    activateAfterSave: boolean,
  ): Promise<GeminiSetupStatus> {
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
      appConfigProvider.config.set('VERTEX_AI_PROJECT', normalizeRequired(input.project, 'project'));
      appConfigProvider.config.set('VERTEX_AI_LOCATION', normalizeRequired(input.location, 'location'));
    }
    if (activateAfterSave) {
      try {
        return await this.activateOption(input.option);
      } catch {
        return this.getSetupStatus();
      }
    }
    return this.getSetupStatus();
  }

  async activateOption(option: GeminiConfigurationOption): Promise<GeminiSetupStatus> {
    const status = await this.optionStatus(option);
    if (status !== 'CONFIGURED') throw new Error('GEMINI_SELECTED_OPTION_NOT_CONFIGURED');
    appConfigProvider.config.set('GEMINI_SETUP_MODE', option);
    return this.getSetupStatus();
  }

  private toRuntimeSelection(status: {
    activeMode: GeminiConfigurationOption | null;
    aiStudioStatus: GeminiConfigurationState;
    vertexExpressStatus: GeminiConfigurationState;
    vertexProjectStatus: 'MISSING' | 'CONFIGURED';
    project: string | null;
    location: string | null;
  }): GeminiRuntimeSelection {
    if (status.activeMode === 'AI_STUDIO' && status.aiStudioStatus === 'CONFIGURED') {
      return { kind: 'aiStudio' };
    }
    if (status.activeMode === 'VERTEX_EXPRESS' && status.vertexExpressStatus === 'CONFIGURED') {
      return { kind: 'vertexExpress' };
    }
    if (
      status.activeMode === 'VERTEX_PROJECT'
      && status.vertexProjectStatus === 'CONFIGURED'
      && status.project
      && status.location
    ) {
      return { kind: 'vertexProject', project: status.project, location: status.location };
    }
    return { kind: 'unconfigured' };
  }

  private async optionStatus(
    option: GeminiConfigurationOption,
    existingStatus?: GeminiSetupStatus,
  ): Promise<GeminiConfigurationState> {
    const status = existingStatus ?? await this.getSetupStatus();
    if (option === 'AI_STUDIO') return status.aiStudioStatus;
    if (option === 'VERTEX_EXPRESS') return status.vertexExpressStatus;
    return status.vertexProjectStatus;
  }

  private management() {
    return getSecretVaultRuntime().requireService();
  }

  private async status(
    credentialSlot: 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey',
  ): Promise<GeminiConfigurationState> {
    const runtime = getSecretVaultRuntime();
    if ((await runtime.getHealth()).state !== 'READY') return 'UNAVAILABLE';
    try {
      return await runtime.requireService().getStatusForConsumer(this.consumer(credentialSlot));
    } catch {
      return 'UNAVAILABLE';
    }
  }

  private consumer(
    credentialSlot: 'geminiAiStudioApiKey' | 'geminiVertexExpressApiKey',
  ): SecretConsumerIdentity {
    return { kind: 'llm', providerId: LLMProvider.GEMINI, credentialSlot };
  }
}

let singleton: GeminiConfigurationService | null = null;
export const getGeminiConfigurationService = (): GeminiConfigurationService => {
  singleton ??= new GeminiConfigurationService();
  return singleton;
};
