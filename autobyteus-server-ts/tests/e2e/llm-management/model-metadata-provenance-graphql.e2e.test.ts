import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { SecretValue } from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { appConfigProvider } from '../../../src/config/app-config-provider.js';
import { getModelMetadataProvisioningService } from '../../../src/llm-management/services/model-metadata-provisioning-service.js';
import {
  getSecretVaultRuntime,
  resetSecretVaultRuntimeForTests,
} from '../../../src/secret-management/secret-vault-runtime.js';
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type GeminiGraphqlModel = {
  modelIdentifier: string;
  maxContextTokens: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  metadataProvenance: 'LIVE' | 'CURATED_FALLBACK' | 'CURATED_ONLY' | null;
};

describe('assembled Gemini metadata provenance GraphQL E2E', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDirectory: string;
  let database: ReturnType<typeof resolveTestDatabaseLocation>;
  let originalEnvironment: Record<string, string | undefined>;

  const execute = async <T>(source: string): Promise<T> => {
    const result = await graphql({ schema, source });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const geminiModels = async (): Promise<GeminiGraphqlModel[]> => {
    const result = await execute<{
      availableLlmProvidersWithModels: Array<{
        provider: { id: string };
        models: GeminiGraphqlModel[];
      }>;
    }>(`
      query GeminiMetadataProvenance {
        availableLlmProvidersWithModels(runtimeKind: "autobyteus") {
          provider { id }
          models {
            modelIdentifier
            maxContextTokens
            maxInputTokens
            maxOutputTokens
            metadataProvenance
          }
        }
      }
    `);
    return result.availableLlmProvidersWithModels
      .filter((row) => row.provider.id === LLMProvider.GEMINI)
      .flatMap((row) => row.models);
  };

  const selectMode = (mode: 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT') => {
    appConfigProvider.config.set('GEMINI_SETUP_MODE', mode);
    if (mode === 'VERTEX_PROJECT') {
      appConfigProvider.config.set('VERTEX_AI_PROJECT', 'synthetic-project');
      appConfigProvider.config.set('VERTEX_AI_LOCATION', 'europe-west1');
    }
    getModelMetadataProvisioningService().invalidate();
  };

  beforeAll(async () => {
    originalEnvironment = {
      DATABASE_URL: process.env.DATABASE_URL,
      GEMINI_SETUP_MODE: process.env.GEMINI_SETUP_MODE,
      VERTEX_AI_PROJECT: process.env.VERTEX_AI_PROJECT,
      VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION,
      OLLAMA_HOSTS: process.env.OLLAMA_HOSTS,
      LMSTUDIO_HOSTS: process.env.LMSTUDIO_HOSTS,
      AUTOBYTEUS_LLM_SERVER_HOSTS: process.env.AUTOBYTEUS_LLM_SERVER_HOSTS,
    };
    delete process.env.DATABASE_URL;
    delete process.env.GEMINI_SETUP_MODE;
    delete process.env.VERTEX_AI_PROJECT;
    delete process.env.VERTEX_AI_LOCATION;
    process.env.OLLAMA_HOSTS = ' ';
    process.env.LMSTUDIO_HOSTS = ' ';
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = ' ';
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    tempDirectory = path.join(testRuntimeRoot, `metadata-provenance-${suffix}`);
    database = resolveTestDatabaseLocation(`file:./db/metadata-provenance-${suffix}.db`);
    const migrationServer = await startBuiltTestServer({
      runtimeRoot: tempDirectory,
      databaseUrlOverride: database.databaseUrl,
    });
    await migrationServer.stop();
    appConfigProvider.resetForTests();
    const config = appConfigProvider.initialize({ appDataDir: tempDirectory });
    config.initialize();
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize(config.getOperationalDatabaseLocation());
    const management = getSecretVaultRuntime().requireService();
    await management.saveForConsumer({
      consumer: {
        kind: 'llm',
        providerId: LLMProvider.GEMINI,
        credentialSlot: 'geminiAiStudioApiKey',
      },
      value: SecretValue.fromString('synthetic-assembled-ai-studio-key'),
    });
    await management.saveForConsumer({
      consumer: {
        kind: 'llm',
        providerId: LLMProvider.GEMINI,
        credentialSlot: 'geminiVertexExpressApiKey',
      },
      value: SecretValue.fromString('synthetic-assembled-vertex-express-key'),
    });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    getModelMetadataProvisioningService().invalidate();
    await resetSecretVaultRuntimeForTests();
    appConfigProvider.resetForTests();
    await removeOwnedTestRuntime(tempDirectory, database);
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('projects LIVE only for a matching AI Studio Developer API record', async () => {
    selectMode('AI_STUDIO');
    const management = getSecretVaultRuntime().requireService();
    const resolveSpy = vi.spyOn(management, 'resolveForUse');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        models: [{
          name: 'models/gemini-3.7-flash',
          baseModelId: 'gemini-3.7-flash',
          inputTokenLimit: 2_097_152,
          outputTokenLimit: 98_304,
        }],
      }),
    }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    const models = await geminiModels();
    const matched = models.find((model) => model.modelIdentifier === 'gemini-3.7-flash');

    expect(resolveSpy).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.GEMINI,
      credentialSlot: 'geminiAiStudioApiKey',
    });
    expect(resolveSpy).not.toHaveBeenCalledWith(expect.objectContaining({
      providerId: LLMProvider.GEMINI,
      credentialSlot: 'geminiVertexExpressApiKey',
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(matched).toMatchObject({
      maxContextTokens: 2_097_152,
      maxInputTokens: 2_097_152,
      maxOutputTokens: 98_304,
      metadataProvenance: 'LIVE',
    });
    expect(models.some((model) =>
      model.modelIdentifier !== 'gemini-3.7-flash'
      && model.metadataProvenance === 'LIVE')).toBe(false);
    resolveSpy.mockRestore();
  });

  it('projects CURATED_FALLBACK when the exact AI Studio definition is unavailable', async () => {
    vi.unstubAllGlobals();
    selectMode('AI_STUDIO');
    const management = getSecretVaultRuntime().requireService();
    const resolveForUse = management.resolveForUse.bind(management);
    const resolveSpy = vi.spyOn(management, 'resolveForUse').mockImplementation(async (consumer) => {
      if (
        consumer.kind === 'llmMetadata'
        && consumer.providerId === LLMProvider.GEMINI
        && consumer.credentialSlot === 'geminiAiStudioApiKey'
      ) {
        throw new Error('SYNTHETIC_METADATA_CAPABILITY_UNAVAILABLE');
      }
      return resolveForUse(consumer);
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const models = await geminiModels();
    const target = models.find((model) => model.modelIdentifier === 'gemini-3.7-flash');

    expect(resolveSpy).toHaveBeenCalledWith({
      kind: 'llmMetadata',
      providerId: LLMProvider.GEMINI,
      credentialSlot: 'geminiAiStudioApiKey',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(target).toMatchObject({
      maxContextTokens: 1_048_576,
      metadataProvenance: 'CURATED_FALLBACK',
    });
    resolveSpy.mockRestore();
  });

  it.each(['VERTEX_EXPRESS', 'VERTEX_PROJECT'] as const)(
    'projects CURATED_ONLY with zero Gemini metadata lookup or HTTP in %s mode',
    async (mode) => {
      vi.unstubAllGlobals();
      selectMode(mode);
      const management = getSecretVaultRuntime().requireService();
      const resolveSpy = vi.spyOn(management, 'resolveForUse');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const models = await geminiModels();
      const target = models.find((model) => model.modelIdentifier === 'gemini-3.7-flash');
      const geminiLookups = resolveSpy.mock.calls.filter(
        ([consumer]) => consumer.providerId === LLMProvider.GEMINI,
      );

      expect(geminiLookups).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(target).toMatchObject({
        maxContextTokens: 1_048_576,
        metadataProvenance: 'CURATED_ONLY',
      });
      expect(models.every((model) => model.metadataProvenance === 'CURATED_ONLY')).toBe(true);
      resolveSpy.mockRestore();
    },
  );
});
