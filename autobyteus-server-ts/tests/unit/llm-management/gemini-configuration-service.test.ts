import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const vaultHarness = vi.hoisted(() => {
  const configured = new Map<string, string>();
  return {
    configured,
    getHealth: vi.fn(async () => ({ state: 'READY' as const })),
    saveForConsumer: vi.fn(async ({ consumer, value }) => {
      configured.set(consumer.credentialSlot, value.revealToTrustedConsumer());
    }),
    removeForConsumer: vi.fn(async (consumer) => {
      configured.delete(consumer.credentialSlot);
    }),
    getStatusForConsumer: vi.fn(async (consumer) =>
      configured.has(consumer.credentialSlot) ? 'CONFIGURED' : 'MISSING'),
  };
});

vi.mock('../../../src/secret-management/secret-vault-runtime.js', () => ({
  getSecretVaultRuntime: () => ({
    getHealth: vaultHarness.getHealth,
    requireService: () => ({
      saveForConsumer: vaultHarness.saveForConsumer,
      removeForConsumer: vaultHarness.removeForConsumer,
      getStatusForConsumer: vaultHarness.getStatusForConsumer,
    }),
  }),
}));

import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { GeminiConfigurationService } from '../../../src/llm-management/services/gemini-configuration-service.js';

describe('GeminiConfigurationService explicit mode commands', () => {
  let directory: string;
  let service: GeminiConfigurationService;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-configuration-'));
    await fs.writeFile(path.join(directory, '.env'), [
      'AUTOBYTEUS_SERVER_HOST=http://localhost:8000',
      'APP_ENV=test',
      'DB_TYPE=sqlite',
      'DATABASE_URL=file:application.db',
      '',
    ].join('\n'));
    appConfigProvider.initialize({ appDataDir: directory }).initialize();
    vaultHarness.configured.clear();
    vi.clearAllMocks();
    service = new GeminiConfigurationService();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    appConfigProvider.resetForTests();
    delete process.env.GEMINI_SETUP_MODE;
    delete process.env.VERTEX_AI_PROJECT;
    delete process.env.VERTEX_AI_LOCATION;
    await fs.rm(directory, { recursive: true, force: true });
  });

  it('starts with no selected mode and no implicit priority', async () => {
    expect(await service.getSetupStatus()).toEqual({
      activeMode: null,
      selection: { kind: 'unconfigured' },
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING',
      project: null,
      location: null,
    });
  });

  it('saves options independently and activates only through an explicit command', async () => {
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });
    await service.saveOptionConfiguration({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express-key',
    });
    await service.saveOptionConfiguration({
      option: 'VERTEX_PROJECT',
      project: 'synthetic-project',
      location: 'global',
    });

    expect(await service.getSetupStatus()).toMatchObject({
      activeMode: null,
      selection: { kind: 'unconfigured' },
      aiStudioStatus: 'CONFIGURED',
      vertexExpressStatus: 'CONFIGURED',
      vertexProjectStatus: 'CONFIGURED',
    });
    await expect(service.activateOption('AI_STUDIO')).resolves.toMatchObject({
      operation: 'ACTIVATED',
      option: 'AI_STUDIO',
      optionStatus: 'CONFIGURED',
      activeMode: 'AI_STUDIO',
    });
    expect(await service.resolveActiveRuntime()).toEqual({ kind: 'aiStudio' });
    await service.activateOption('VERTEX_EXPRESS');
    expect(await service.resolveActiveRuntime()).toEqual({ kind: 'vertexExpress' });
    await service.activateOption('VERTEX_PROJECT');
    expect(await service.resolveActiveRuntime()).toEqual({
      kind: 'vertexProject',
      project: 'synthetic-project',
      location: 'global',
    });
  });

  it('keeps active mode unchanged when its configuration is replaced', async () => {
    await service.saveAndActivateOption({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-first',
    });
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-replacement',
    });

    expect((await service.getSetupStatus()).activeMode).toBe('AI_STUDIO');
    expect(vaultHarness.configured.get('geminiAiStudioApiKey')).toBe('synthetic-replacement');
  });

  it('clears an active mode before removing only the addressed option with no fallback', async () => {
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio',
    });
    await service.saveAndActivateOption({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express',
    });

    await expect(service.removeOptionConfiguration('VERTEX_EXPRESS')).resolves.toMatchObject({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      optionStatus: 'MISSING',
      activeMode: null,
    });
    expect(vaultHarness.configured.has('geminiAiStudioApiKey')).toBe(true);
    expect(await service.resolveActiveRuntime()).toEqual({ kind: 'unconfigured' });
  });

  it('rejects activating an incomplete option without persisting a selector', async () => {
    await expect(service.activateOption('VERTEX_PROJECT'))
      .rejects.toThrow('GEMINI_SELECTED_OPTION_NOT_CONFIGURED');
    expect(appConfigProvider.config.get('GEMINI_SETUP_MODE')).toBeUndefined();
  });

  it('returns a truthful partial result when save succeeds but activation fails', async () => {
    const originalSet = appConfigProvider.config.set.bind(appConfigProvider.config);
    vi.spyOn(appConfigProvider.config, 'set').mockImplementation((key, value) => {
      if (key === 'GEMINI_SETUP_MODE') throw new Error('SYNTHETIC_MODE_WRITE_FAILURE');
      originalSet(key, value);
    });

    await expect(service.saveAndActivateOption({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-saved-key',
    })).resolves.toMatchObject({
      operation: 'SAVED_AND_ACTIVATED',
      outcome: 'PARTIAL',
      configurationOutcome: 'SUCCEEDED',
      modeOutcome: 'FAILED',
      instructionCode: 'GEMINI_ACTIVATION_RETRY_REQUIRED',
      optionStatus: 'CONFIGURED',
      activeMode: null,
    });
  });

  it('clears active mode and returns a retryable partial result when removal fails', async () => {
    await service.saveAndActivateOption({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express',
    });
    vaultHarness.removeForConsumer.mockRejectedValueOnce(
      new Error('SYNTHETIC_REMOVE_FAILURE'),
    );

    await expect(service.removeOptionConfiguration('VERTEX_EXPRESS')).resolves.toMatchObject({
      operation: 'REMOVED',
      outcome: 'PARTIAL',
      configurationOutcome: 'FAILED',
      modeOutcome: 'SUCCEEDED',
      instructionCode: 'GEMINI_REMOVAL_RETRY_REQUIRED',
      optionStatus: 'CONFIGURED',
      activeMode: null,
    });
  });
});
