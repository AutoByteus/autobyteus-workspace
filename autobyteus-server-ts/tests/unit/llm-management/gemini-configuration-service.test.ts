import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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
  await getSecretStorageConfigurationService().bootstrap({ serverDataDir: directory });
  return new GeminiConfigurationService();
};

const restoreEnvironment = (name: string, value: string | undefined) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

afterEach(async () => {
  await resetSecretStorageConfigurationServiceForTests();
  appConfigProvider.resetForTests();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  restoreEnvironment('VERTEX_AI_PROJECT', originalProject);
  restoreEnvironment('VERTEX_AI_LOCATION', originalLocation);
});

describe('GeminiConfigurationService', () => {
  it('projects every option independently without persisting a selector', async () => {
    const service = await bootstrap();

    const status = await service.getSetupStatus();

    expect(status).toEqual({
      selection: { kind: 'unconfigured' },
      effectiveMode: 'UNCONFIGURED',
      aiStudioStatus: 'MISSING',
      vertexExpressStatus: 'MISSING',
      vertexProjectStatus: 'MISSING',
      project: null,
      location: null,
    });
    expect(appConfigProvider.config.get('GEMINI_SETUP_MODE')).toBeUndefined();
  });

  it('keeps all independently configured options while applying fixed priority', async () => {
    const service = await bootstrap();
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });
    await service.saveOptionConfiguration({
      option: 'VERTEX_PROJECT',
      project: 'synthetic-project',
      location: 'global',
    });

    const result = await service.saveOptionConfiguration({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express-key',
    });
    const status = await service.getSetupStatus();

    expect(result).toEqual({
      operation: 'SAVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'VERTEX_EXPRESS',
    });
    expect(status).toMatchObject({
      selection: { kind: 'vertexExpress' },
      effectiveMode: 'VERTEX_EXPRESS',
      aiStudioStatus: 'CONFIGURED',
      vertexExpressStatus: 'CONFIGURED',
      vertexProjectStatus: 'CONFIGURED',
      project: 'synthetic-project',
      location: 'global',
    });
  });

  it('reports a lower-priority save separately from the still-effective option', async () => {
    const service = await bootstrap();
    await service.saveOptionConfiguration({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express-key',
    });

    const result = await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });

    expect(result).toEqual({
      operation: 'SAVED',
      option: 'AI_STUDIO',
      effectiveMode: 'VERTEX_EXPRESS',
    });
    expect(await service.getSetupStatus()).toMatchObject({
      aiStudioStatus: 'CONFIGURED',
      vertexExpressStatus: 'CONFIGURED',
      effectiveMode: 'VERTEX_EXPRESS',
    });
  });

  it('advances effective mode only through explicit option removal', async () => {
    const service = await bootstrap();
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });
    await service.saveOptionConfiguration({
      option: 'VERTEX_PROJECT',
      project: 'synthetic-project',
      location: 'global',
    });
    await service.saveOptionConfiguration({
      option: 'VERTEX_EXPRESS',
      apiKey: 'synthetic-vertex-express-key',
    });

    await expect(service.removeOptionConfiguration('VERTEX_EXPRESS')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'VERTEX_PROJECT',
    });
    await expect(service.removeOptionConfiguration('VERTEX_PROJECT')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'VERTEX_PROJECT',
      effectiveMode: 'AI_STUDIO',
    });
    await expect(service.removeOptionConfiguration('AI_STUDIO')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'AI_STUDIO',
      effectiveMode: 'UNCONFIGURED',
    });
  });

  it('makes option removal idempotent without affecting other options', async () => {
    const service = await bootstrap();
    await service.saveOptionConfiguration({
      option: 'AI_STUDIO',
      apiKey: 'synthetic-ai-studio-key',
    });

    await expect(service.removeOptionConfiguration('VERTEX_EXPRESS')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'AI_STUDIO',
    });
    await expect(service.removeOptionConfiguration('VERTEX_EXPRESS')).resolves.toEqual({
      operation: 'REMOVED',
      option: 'VERTEX_EXPRESS',
      effectiveMode: 'AI_STUDIO',
    });
    expect((await service.getSetupStatus()).aiStudioStatus).toBe('CONFIGURED');
  });
});
