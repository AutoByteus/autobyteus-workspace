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

describe('local Gemini model metadata GraphQL E2E', () => {
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
      providerModelCatalogSnapshots: Array<{
        ownerProvider: { id: string };
        llmModels: GeminiGraphqlModel[];
      }>;
    }>(`
      query GeminiMetadataProvenance {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider { id }
          llmModels {
            modelIdentifier
            maxContextTokens
            maxInputTokens
            maxOutputTokens
            metadataProvenance
          }
        }
      }
    `);
    return result.providerModelCatalogSnapshots
      .filter((row) => row.ownerProvider.id === LLMProvider.GEMINI)
      .flatMap((row) => row.llmModels);
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

  it.each(['AI_STUDIO', 'VERTEX_EXPRESS', 'VERTEX_PROJECT'] as const)(
    'projects curated rows with zero credential lookup or HTTP in %s mode',
    async (mode) => {
      vi.unstubAllGlobals();
      selectMode(mode);
      const management = getSecretVaultRuntime().requireService();
      const resolveSpy = vi.spyOn(management, 'resolveForUse');
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const models = await geminiModels();
      const target = models.find((model) => model.modelIdentifier === 'gemini-3.8-flash');
      const geminiLookups = resolveSpy.mock.calls.filter(
        ([consumer]) => consumer.providerId === LLMProvider.GEMINI,
      );

      expect(geminiLookups).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(target).toMatchObject({
        maxContextTokens: 1_048_576,
        maxInputTokens: 1_048_576,
        maxOutputTokens: 65_536,
        metadataProvenance: null,
      });
      expect(models.every((model) => model.metadataProvenance === null)).toBe(true);
      resolveSpy.mockRestore();
    },
  );
});
