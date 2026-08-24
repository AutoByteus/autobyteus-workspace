import 'reflect-metadata';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { LLMFactory } from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { initializePrisma, shutdownPrisma } from 'repository_prisma';
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

type GraphqlModel = {
  modelIdentifier: string;
  value: string;
  providerId: string;
  providerType: string;
  maxContextTokens: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  metadataProvenance: 'LIVE' | 'CURATED_FALLBACK' | 'CURATED_ONLY' | null;
};

type GraphqlProvider = {
  ownerProvider: {
    id: string;
    name: string;
    providerType: string;
    isCustom: boolean;
    baseUrl: string | null;
  };
  sources: Array<{
    modelKind: string;
    state: string;
    modelCount: number;
  }>;
  llmModels: GraphqlModel[];
};

describe('custom provider metadata GraphQL E2E', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDirectory: string;
  let database: ReturnType<typeof resolveTestDatabaseLocation>;
  let originalEnvironment: Record<string, string | undefined>;
  let createdProviderId: string | null = null;

  const execute = async <T>(source: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const customProvider = async (): Promise<GraphqlProvider> => {
    const result = await execute<{
      providerModelCatalogSnapshots: GraphqlProvider[];
    }>(`
      query CustomProviderMetadata {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider {
            id
            name
            providerType
            isCustom
            baseUrl
          }
          sources { modelKind state modelCount }
          llmModels {
            modelIdentifier
            value
            providerId
            providerType
            maxContextTokens
            maxInputTokens
            maxOutputTokens
            metadataProvenance
          }
        }
      }
    `);
    const resultProvider = result.providerModelCatalogSnapshots.find(
      (entry) => entry.ownerProvider.id === createdProviderId,
    );
    if (!resultProvider) throw new Error('Synthetic custom provider was not returned by GraphQL.');
    return resultProvider;
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
    tempDirectory = path.join(testRuntimeRoot, `custom-provider-metadata-${suffix}`);
    database = resolveTestDatabaseLocation(`file:./db/custom-provider-metadata-${suffix}.db`);
    const migrationServer = await startBuiltTestServer({
      runtimeRoot: tempDirectory,
      databaseUrlOverride: database.databaseUrl,
    });
    await migrationServer.stop();

    appConfigProvider.resetForTests();
    const config = appConfigProvider.initialize({ appDataDir: tempDirectory });
    config.initialize();
    await shutdownPrisma();
    await initializePrisma({
      datasourceUrl: config.getOperationalDatabaseLocation().databaseUrl,
    });
    await resetSecretVaultRuntimeForTests();
    await getSecretVaultRuntime().initialize(config.getOperationalDatabaseLocation());

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
    await shutdownPrisma();
    appConfigProvider.resetForTests();
    await removeOwnedTestRuntime(tempDirectory, database);
    LLMFactory.resetForTests();
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('projects advertised, exact inferred, and unknown metadata through the normal custom-provider catalog', async () => {
    const syntheticPayload = {
      data: [
        {
          id: 'qwen3.8-max',
          context_window: 654321,
          max_input_tokens: 600000,
          max_output_tokens: 8192,
          private_provider_payload: 'must-not-cross-server-boundary',
        },
        { id: 'deepseek-v4-pro' },
        { id: 'glm-5.2' },
        { id: 'deepseek-v4-pro-0713' },
        { id: 'synthetic-unknown-model' },
      ],
    };
    const fetchMock = vi.fn(async (url: string, options: { headers?: Record<string, string> }) => {
      expect(url).toBe('https://gateway.example.test/v1/models');
      expect(options.headers).toEqual({
        Authorization: 'Bearer synthetic-custom-provider-key',
        Accept: 'application/json',
      });
      return {
        ok: true,
        json: async () => syntheticPayload,
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const created = await execute<{
      createCustomProvider: {
        provider: { id: string };
        apiKeyConfigured: boolean;
      };
    }>(`
      mutation CreateCustomProvider($input: CustomProviderInputObject!) {
        createCustomProvider(input: $input) {
          provider { id }
          apiKeyConfigured
        }
      }
    `, {
      input: {
        name: 'Synthetic Metadata Gateway',
        baseUrl: 'https://gateway.example.test/v1',
        apiKey: 'synthetic-custom-provider-key',
      },
    });
    createdProviderId = created.createCustomProvider.provider.id;
    expect(createdProviderId).toBe('provider_synthetic_metadata_gateway');
    expect(created.createCustomProvider.apiKeyConfigured).toBe(true);

    const provider = await customProvider();
    expect(provider.ownerProvider).toMatchObject({
      id: createdProviderId,
      name: 'Synthetic Metadata Gateway',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      isCustom: true,
      baseUrl: 'https://gateway.example.test/v1',
    });
    expect(provider.sources).toContainEqual(expect.objectContaining({
      modelKind: 'LLM',
      state: 'READY',
      modelCount: 5,
    }));
    expect(provider.llmModels).toHaveLength(5);

    const advertised = provider.llmModels.find((model) => model.value === 'qwen3.8-max');
    expect(advertised).toMatchObject({
      modelIdentifier: 'openai-compatible:provider_synthetic_metadata_gateway:qwen3.8-max',
      providerId: createdProviderId,
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      maxContextTokens: 654321,
      maxInputTokens: 600000,
      maxOutputTokens: 8192,
      metadataProvenance: null,
    });

    const inferredDeepSeek = provider.llmModels.find((model) => model.value === 'deepseek-v4-pro');
    expect(inferredDeepSeek).toMatchObject({
      modelIdentifier: 'openai-compatible:provider_synthetic_metadata_gateway:deepseek-v4-pro',
      maxContextTokens: 1_000_000,
      metadataProvenance: null,
    });

    const inferredGlm = provider.llmModels.find((model) => model.value === 'glm-5.2');
    expect(inferredGlm).toMatchObject({
      maxContextTokens: 198_000,
      metadataProvenance: null,
    });

    const unknown = provider.llmModels.find((model) => model.value === 'synthetic-unknown-model');
    expect(unknown).toMatchObject({
      maxContextTokens: null,
      maxInputTokens: null,
      maxOutputTokens: null,
      metadataProvenance: null,
    });

    const nearMatch = provider.llmModels.find((model) => model.value === 'deepseek-v4-pro-0713');
    expect(nearMatch).toMatchObject({
      maxContextTokens: null,
      maxInputTokens: null,
      maxOutputTokens: null,
      metadataProvenance: null,
    });

    const providerConfig = await readFile(
      path.join(tempDirectory, 'llm', 'custom-llm-providers.json'),
      'utf8',
    );
    expect(providerConfig).not.toContain('synthetic-custom-provider-key');
    expect(providerConfig).not.toContain('resolved_model_metadata');
    expect(providerConfig).not.toContain('private_provider_payload');
    expect(JSON.stringify(provider)).not.toContain('synthetic-custom-provider-key');
    expect(JSON.stringify(provider)).not.toContain('must-not-cross-server-boundary');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves the last-known-good custom catalog when a subsequent discovery fails', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockRejectedValueOnce(new Error('synthetic gateway offline'));

    const refreshed = await execute<{
      reloadProviderModelCatalog: GraphqlProvider;
    }>(`
      mutation ReloadCustomProvider($providerId: String!) {
        reloadProviderModelCatalog(
          providerId: $providerId
          runtimeKind: "autobyteus"
        ) {
          ownerProvider { id name providerType isCustom baseUrl }
          sources { modelKind state modelCount }
          llmModels {
            modelIdentifier
            value
            providerId
            providerType
            maxContextTokens
            maxInputTokens
            maxOutputTokens
            metadataProvenance
          }
        }
      }
    `, { providerId: createdProviderId });
    expect(refreshed.reloadProviderModelCatalog.sources).toContainEqual(expect.objectContaining({
      modelKind: 'LLM',
      state: 'STALE_ERROR',
      modelCount: 5,
    }));

    const provider = await customProvider();
    expect(provider.llmModels.map((model) => model.value)).toEqual([
      'deepseek-v4-pro',
      'deepseek-v4-pro-0713',
      'glm-5.2',
      'qwen3.8-max',
      'synthetic-unknown-model',
    ]);
  });

  it('cleans up the synthetic provider and derived model registry state', async () => {
    expect(createdProviderId).not.toBeNull();
    const deletedProviderId = createdProviderId!;
    const deleted = await execute<{
      deleteCustomProvider: { providerId: string; deleted: boolean };
    }>(`
      mutation DeleteCustomProvider($providerId: String!) {
        deleteCustomProvider(providerId: $providerId) { providerId deleted }
      }
    `, { providerId: deletedProviderId });
    expect(deleted.deleteCustomProvider).toEqual({
      providerId: deletedProviderId,
      deleted: true,
    });

    const afterDelete = await execute<{
      providerModelCatalogSnapshots: Array<{
        ownerProvider: { id: string };
        llmModels: Array<{ providerId: string }>;
      }>;
    }>(`
      query CustomProviderCatalogAfterDelete {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider { id }
          llmModels { providerId }
        }
      }
    `);
    expect(afterDelete.providerModelCatalogSnapshots).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ownerProvider: { id: deletedProviderId } }),
    ]));
    const remainingModelProviderIds = afterDelete.providerModelCatalogSnapshots
      .flatMap(({ llmModels }) => llmModels.map(({ providerId }) => providerId));
    expect(remainingModelProviderIds).not.toContain(deletedProviderId);

    const providerConfig = await readFile(
      path.join(tempDirectory, 'llm', 'custom-llm-providers.json'),
      'utf8',
    );
    expect(providerConfig).not.toContain(deletedProviderId);
    createdProviderId = null;
  });
});
