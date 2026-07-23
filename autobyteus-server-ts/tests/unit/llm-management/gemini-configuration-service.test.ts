import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretValue } from 'autobyteus-ts';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { GeminiConfigurationService } from '../../../src/llm-management/services/gemini-configuration-service.js';
import {
  getSecretStorageConfigurationService,
  resetSecretStorageConfigurationServiceForTests,
} from '../../../src/secret-management/configuration/secret-storage-configuration-service.js';

const tempDirectories: string[] = [];
const originalProject = process.env.VERTEX_AI_PROJECT;
const originalLocation = process.env.VERTEX_AI_LOCATION;

const bootstrap = async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-configuration-'));
  tempDirectories.push(directory);
  const configuration = getSecretStorageConfigurationService();
  await configuration.bootstrap({ serverDataDir: directory });
  return configuration.requireManagementService();
};

afterEach(async () => {
  await resetSecretStorageConfigurationServiceForTests();
  appConfigProvider.resetForTests();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  if (originalProject === undefined) delete process.env.VERTEX_AI_PROJECT;
  else process.env.VERTEX_AI_PROJECT = originalProject;
  if (originalLocation === undefined) delete process.env.VERTEX_AI_LOCATION;
  else process.env.VERTEX_AI_LOCATION = originalLocation;
});

describe('GeminiConfigurationService', () => {
  it('projects unconfigured setup without persisting a selector', async () => {
    await bootstrap();
    const status = await new GeminiConfigurationService().getSetupStatus();
    expect(status).toMatchObject({
      selection: { kind: 'unconfigured' },
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      project: null,
      location: null,
    });
    expect(appConfigProvider.config.get('GEMINI_SETUP_MODE')).toBeUndefined();
  });

  it('applies Vertex Express priority over complete project and AI Studio status', async () => {
    const management = await bootstrap();
    await management.saveForConsumer({
      consumer: {
        kind: 'llm',
        providerId: 'GEMINI',
        credentialSlot: 'geminiAiStudioApiKey',
      },
      value: SecretValue.fromString('synthetic-ai-studio-key'),
    });
    await management.saveForConsumer({
      consumer: {
        kind: 'llm',
        providerId: 'GEMINI',
        credentialSlot: 'geminiVertexExpressApiKey',
      },
      value: SecretValue.fromString('synthetic-vertex-express-key'),
    });
    process.env.VERTEX_AI_PROJECT = 'synthetic-project';
    process.env.VERTEX_AI_LOCATION = 'global';

    const status = await new GeminiConfigurationService().getSetupStatus();
    expect(status.selection).toEqual({ kind: 'vertexExpress' });
  });

  it('reconciles AI Studio write intent and removes inactive setup facts', async () => {
    await bootstrap();
    process.env.VERTEX_AI_PROJECT = 'stale-project';
    process.env.VERTEX_AI_LOCATION = 'stale-location';
    const service = new GeminiConfigurationService();

    const status = await service.setSetup({
      mode: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });

    expect(status.selection).toEqual({ kind: 'aiStudio' });
    expect(status.aiStudioStatus).toBe('CONFIGURED');
    expect(status.vertexExpressStatus).toBe('MISSING');
    expect(status.project).toBeNull();
    expect(status.location).toBeNull();
    expect(appConfigProvider.config.get('GEMINI_SETUP_MODE')).toBeUndefined();
  });

  it('reconciles Vertex Project without resolving or retaining an API-key selector', async () => {
    await bootstrap();
    const service = new GeminiConfigurationService();
    await service.setSetup({
      mode: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express-key',
    });

    const status = await service.setSetup({
      mode: 'VERTEX_PROJECT',
      project: 'synthetic-project',
      location: 'global',
    });

    expect(status).toMatchObject({
      selection: {
        kind: 'vertexProject',
        project: 'synthetic-project',
        location: 'global',
      },
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      project: 'synthetic-project',
      location: 'global',
    });
    expect(appConfigProvider.config.get('GEMINI_SETUP_MODE')).toBeUndefined();
  });
});
