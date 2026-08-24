import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

type ProviderCredentialSetting = {
  provider: {
    id: string;
    name: string;
    providerType: string;
    isCustom: boolean;
    baseUrl: string | null;
    catalogMode: string;
  };
  apiKeyConfigured: boolean;
};

type ProviderCatalogSnapshot = {
  ownerProvider: { id: string; name: string };
  sources: Array<{ modelKind: string; state: string; modelCount: number }>;
  llmModels: Array<{ modelIdentifier: string }>;
  audioModels: Array<{ modelIdentifier: string }>;
  imageModels: Array<{ modelIdentifier: string }>;
  videoModels: Array<{ modelIdentifier: string }>;
};

type GeminiCommandResult = {
  setup: {
    activeMode: string | null;
    aiStudioConfigured: boolean | null;
    vertexExpressConfigured: boolean | null;
    vertexProject: { project: string; location: string } | null;
  };
  credentialSetting: ProviderCredentialSetting;
};

describe('provider and Gemini one-vault GraphQL E2E', () => {
  let server: RunningTestServer;
  let runtimeRoot: string;
  let database: ReturnType<typeof resolveTestDatabaseLocation>;

  const execute = <T>(query: string, variables: Record<string, unknown> = {}) =>
    executeGraphql<T>(server.serverUrl, query, variables);

  const providerCredentialSettings = () => execute<{
    providerCredentialSettings: ProviderCredentialSetting[];
  }>(`
    query ProviderCredentialSettings {
      providerCredentialSettings(runtimeKind: "autobyteus") {
        provider {
          id
          name
          providerType
          isCustom
          baseUrl
          catalogMode
        }
        apiKeyConfigured
      }
    }
  `);

  const provider = async (providerId: string) =>
    (await providerCredentialSettings()).providerCredentialSettings.find(
      ({ provider: candidate }) => candidate.id === providerId,
    ) ?? null;

  const providerCatalogSnapshots = () => execute<{
    providerModelCatalogSnapshots: ProviderCatalogSnapshot[];
  }>(`
    query ProviderModelCatalogSnapshots {
      providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
        ownerProvider { id name }
        sources { modelKind state modelCount }
        llmModels { modelIdentifier }
        audioModels { modelIdentifier }
        imageModels { modelIdentifier }
        videoModels { modelIdentifier }
      }
    }
  `);

  const providerCatalog = async (providerId: string) =>
    (await providerCatalogSnapshots()).providerModelCatalogSnapshots.find(
      ({ ownerProvider }) => ownerProvider.id === providerId,
    ) ?? null;

  const geminiStatus = () => execute<{
    getGeminiSetupConfig: {
      activeMode: string | null;
      aiStudioConfigured: boolean | null;
      vertexExpressConfigured: boolean | null;
      vertexProject: { project: string; location: string } | null;
    };
  }>(`
    query GeminiStatus {
      getGeminiSetupConfig {
        activeMode
        aiStudioConfigured
        vertexExpressConfigured
        vertexProject { project location }
      }
    }
  `);

  beforeAll(async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    runtimeRoot = path.join(testRuntimeRoot, `provider-graphql-${suffix}`);
    database = resolveTestDatabaseLocation(`file:./db/provider-graphql-${suffix}.db`);
    server = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
    });
  }, 180_000);

  afterAll(async () => {
    if (server?.child.exitCode === null) await server.stop();
    if (runtimeRoot && database) await removeOwnedTestRuntime(runtimeRoot, database);
  });

  it('saves and replaces a provider key without value readback', async () => {
    expect((await provider('AUTOBYTEUS'))?.apiKeyConfigured).toBe(false);
    const mutation = `
      mutation Save($providerId: String!, $apiKey: String!) {
        saveProviderApiKey(providerId: $providerId, apiKey: $apiKey) {
          provider { id name providerType isCustom baseUrl catalogMode }
          apiKeyConfigured
        }
      }
    `;
    const firstCanary = 'synthetic-graphql-secret-first';
    const first = await execute<{ saveProviderApiKey: ProviderCredentialSetting }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: firstCanary,
    });
    expect(first.saveProviderApiKey).toMatchObject({
      provider: { id: 'AUTOBYTEUS' },
      apiKeyConfigured: true,
    });
    expect(JSON.stringify(first)).not.toContain(firstCanary);

    const secondCanary = 'synthetic-graphql-secret-second';
    const second = await execute<{ saveProviderApiKey: ProviderCredentialSetting }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: secondCanary,
    });
    expect(second.saveProviderApiKey).toMatchObject({
      provider: { id: 'AUTOBYTEUS' },
      apiKeyConfigured: true,
    });
    expect(JSON.stringify(second)).not.toContain(secondCanary);
    expect((await provider('AUTOBYTEUS'))?.apiKeyConfigured).toBe(true);
    const evidence = server.output() + fs.readFileSync(server.runtimeEnvironmentPath, 'utf8');
    expect(evidence).not.toContain(firstCanary);
    expect(evidence).not.toContain(secondCanary);
  });

  it('exposes only the approved ordinary-provider and Gemini configuration commands', async () => {
    const schema = await execute<{
      queryType: {
        fields: Array<{ name: string }>;
      };
      mutationType: {
        fields: Array<{ name: string }>;
      };
    }>(`
      query MutationSurface {
        queryType: __type(name: "Query") {
          fields { name }
        }
        mutationType: __type(name: "Mutation") {
          fields { name }
        }
      }
    `);
    const queryFields = schema.queryType.fields.map(({ name }) => name);
    const mutationFields = schema.mutationType.fields.map(({ name }) => name);

    expect(queryFields).toEqual(expect.arrayContaining([
      'providerCredentialSettings',
      'providerModelCatalogSnapshots',
    ]));
    expect(queryFields).not.toContain('providerSettings');
    expect(queryFields).not.toContain('availableLlmProvidersWithModels');
    expect(queryFields).not.toContain('availableAudioProvidersWithModels');
    expect(queryFields).not.toContain('availableImageProvidersWithModels');
    expect(queryFields).not.toContain('availableVideoProvidersWithModels');
    expect(mutationFields).toEqual(expect.arrayContaining([
      'saveProviderApiKey',
      'saveGeminiAiStudio',
      'saveGeminiVertexExpress',
      'saveGeminiVertexProject',
      'useGeminiMode',
      'deleteCustomProvider',
    ]));
    expect(mutationFields).toEqual(expect.arrayContaining([
      'ensureProviderModelCatalog',
      'reloadProviderModelCatalog',
    ]));
    expect(mutationFields).not.toContain('reloadLlmModels');
    expect(mutationFields).not.toContain('reloadAudioModels');
    expect(mutationFields).not.toContain('reloadImageModels');
    expect(mutationFields).not.toContain('reloadVideoModels');
    expect(mutationFields).not.toContain('removeProviderApiKey');
    expect(mutationFields).not.toContain('removeGeminiConfiguration');
  });

  it('serves five warm credential descriptor reads within the local budget', async () => {
    await providerCredentialSettings();
    const durations: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const startedAt = performance.now();
      const result = await providerCredentialSettings();
      durations.push(performance.now() - startedAt);
      expect(result.providerCredentialSettings.length).toBeGreaterThan(0);
    }
    expect(Math.max(...durations)).toBeLessThan(250);
  });

  it('keeps Gemini configuration independent and activation explicit with no priority/fallback', async () => {
    expect((await geminiStatus()).getGeminiSetupConfig).toEqual({
      activeMode: null,
      aiStudioConfigured: false,
      vertexExpressConfigured: false,
      vertexProject: null,
    });

    const aiCanary = 'synthetic-gemini-ai-studio';
    const expressCanary = 'synthetic-gemini-vertex-express';
    const aiSaved = await execute<{ saveGeminiAiStudio: GeminiCommandResult }>(`
      mutation SaveAi($apiKey: String!, $activateAfterSave: Boolean!) {
        saveGeminiAiStudio(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
          setup {
            activeMode aiStudioConfigured vertexExpressConfigured
            vertexProject { project location }
          }
          credentialSetting { provider { id } apiKeyConfigured }
        }
      }
    `, { apiKey: aiCanary, activateAfterSave: false });
    expect(aiSaved.saveGeminiAiStudio.setup).toMatchObject({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: false,
    });
    expect(aiSaved.saveGeminiAiStudio.credentialSetting).toMatchObject({
      provider: { id: 'GEMINI' },
      apiKeyConfigured: true,
    });
    const expressSaved = await execute<{ saveGeminiVertexExpress: GeminiCommandResult }>(`
      mutation SaveExpress($apiKey: String!, $activateAfterSave: Boolean!) {
        saveGeminiVertexExpress(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
          setup {
            activeMode aiStudioConfigured vertexExpressConfigured
            vertexProject { project location }
          }
          credentialSetting { provider { id } apiKeyConfigured }
        }
      }
    `, { apiKey: expressCanary, activateAfterSave: false });
    expect(expressSaved.saveGeminiVertexExpress.setup).toMatchObject({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: true,
    });
    const projectSaved = await execute<{ saveGeminiVertexProject: GeminiCommandResult }>(`
      mutation SaveProject(
        $project: String!
        $location: String!
        $activateAfterSave: Boolean!
      ) {
        saveGeminiVertexProject(
          project: $project
          location: $location
          activateAfterSave: $activateAfterSave
        ) {
          setup {
            activeMode aiStudioConfigured vertexExpressConfigured
            vertexProject { project location }
          }
          credentialSetting { provider { id } apiKeyConfigured }
        }
      }
    `, {
      project: 'synthetic-project',
      location: 'europe-west1',
      activateAfterSave: false,
    });
    expect(projectSaved.saveGeminiVertexProject.setup).toMatchObject({
      activeMode: null,
      vertexProject: {
        project: 'synthetic-project',
        location: 'europe-west1',
      },
    });
    expect((await geminiStatus()).getGeminiSetupConfig).toMatchObject({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: true,
      vertexProject: {
        project: 'synthetic-project',
        location: 'europe-west1',
      },
    });

    const activate = async (mode: string) =>
      await execute<{ useGeminiMode: GeminiCommandResult }>(`
        mutation UseMode($mode: GeminiSetupMode!) {
          useGeminiMode(mode: $mode) {
            setup {
              activeMode aiStudioConfigured vertexExpressConfigured
              vertexProject { project location }
            }
            credentialSetting { provider { id } apiKeyConfigured }
          }
        }
      `, { mode });
    expect((await activate('AI_STUDIO')).useGeminiMode.setup).toMatchObject({
      activeMode: 'AI_STUDIO',
    });
    expect((await activate('VERTEX_PROJECT')).useGeminiMode.setup).toMatchObject({
      activeMode: 'VERTEX_PROJECT',
    });
    expect((await activate('VERTEX_EXPRESS')).useGeminiMode.setup).toMatchObject({
      activeMode: 'VERTEX_EXPRESS',
    });

    expect((await geminiStatus()).getGeminiSetupConfig).toMatchObject({
      activeMode: 'VERTEX_EXPRESS',
      aiStudioConfigured: true,
      vertexExpressConfigured: true,
      vertexProject: {
        project: 'synthetic-project',
        location: 'europe-west1',
      },
    });
    expect(JSON.stringify({
      aiSaved,
      expressSaved,
      projectSaved,
    })).not.toContain(aiCanary);
    expect(JSON.stringify({
      aiSaved,
      expressSaved,
      projectSaved,
    })).not.toContain(expressCanary);
    expect(fs.readFileSync(server.runtimeEnvironmentPath, 'utf8')).not.toContain(aiCanary);
    expect(fs.readFileSync(server.runtimeEnvironmentPath, 'utf8')).not.toContain(expressCanary);
  });

  it('keeps vault status and built-in catalogs value-free and available with missing credentials', async () => {
    const status = await execute<{
      getSecretVaultStatus: {
        health: string;
        instructionCode: string | null;
        assurance: string;
      };
    }>(`
      query VaultStatus {
        getSecretVaultStatus {
          health
          instructionCode
          assurance
        }
      }
    `);
    expect(status.getSecretVaultStatus).toEqual({
      health: 'READY',
      instructionCode: null,
      assurance: 'LOCAL_HARDENED',
    });
    const catalogs = await providerCatalogSnapshots();
    expect(catalogs.providerModelCatalogSnapshots.length).toBeGreaterThan(0);
    expect(catalogs.providerModelCatalogSnapshots.some(
      (row) => row.ownerProvider.id === 'OPENAI' && row.llmModels.length > 0,
    )).toBe(true);
    expect(JSON.stringify({ status, catalogs })).not.toMatch(
      /synthetic-(?:graphql-secret|gemini)/,
    );
  });

  it('probes, creates, discovers, and deletes a custom provider through GraphQL and the vault', async () => {
    const syntheticCredential = 'synthetic-custom-provider-credential';
    let authorizedDiscoveryRequests = 0;
    const fixture = http.createServer((request, response) => {
      if (
        request.method !== 'GET'
        || request.url !== '/v1/models'
        || request.headers.authorization !== `Bearer ${syntheticCredential}`
      ) {
        response.writeHead(401, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'UNAUTHORIZED' }));
        return;
      }
      authorizedDiscoveryRequests += 1;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        data: [
          { id: 'synthetic-model-a' },
          { id: 'synthetic-model-b' },
        ],
      }));
    });
    await new Promise<void>((resolve, reject) => {
      fixture.once('error', reject);
      fixture.listen(0, '127.0.0.1', () => {
        fixture.off('error', reject);
        resolve();
      });
    });
    const address = fixture.address();
    if (!address || typeof address === 'string') {
      fixture.close();
      throw new Error('CUSTOM_PROVIDER_FIXTURE_ADDRESS_UNAVAILABLE');
    }
    const baseUrl = `http://127.0.0.1:${address.port}/v1`;
    let providerId: string | null = null;
    try {
      const input = {
        name: 'Round 13 Synthetic Gateway',
        baseUrl,
        apiKey: syntheticCredential,
      };
      const probe = await execute<{
        probeCustomProvider: {
          discoveredModels: Array<{ id: string; name: string }>;
        };
      }>(`
        mutation Probe($input: CustomProviderInputObject!) {
          probeCustomProvider(input: $input) {
            discoveredModels { id name }
          }
        }
      `, { input });
      expect(probe.probeCustomProvider).toEqual({
        discoveredModels: [
          { id: 'synthetic-model-a', name: 'synthetic-model-a' },
          { id: 'synthetic-model-b', name: 'synthetic-model-b' },
        ],
      });
      expect(JSON.stringify(probe)).not.toContain(syntheticCredential);

      const created = await execute<{
        createCustomProvider: ProviderCredentialSetting;
      }>(`
        mutation Create($input: CustomProviderInputObject!) {
          createCustomProvider(input: $input) {
            provider { id name providerType isCustom baseUrl catalogMode }
            apiKeyConfigured
          }
        }
      `, { input });
      providerId = created.createCustomProvider.provider.id;
      expect(providerId).toMatch(/^provider_/);
      expect(created.createCustomProvider.apiKeyConfigured).toBe(true);
      expect(JSON.stringify(created)).not.toContain(syntheticCredential);

      const customSettings = await provider(providerId);
      expect(customSettings).toMatchObject({
        provider: {
          id: providerId,
        },
        apiKeyConfigured: true,
      });
      const customCatalog = await providerCatalog(providerId);
      expect(customCatalog?.sources).toContainEqual(expect.objectContaining({
        modelKind: 'LLM',
        state: 'READY',
        modelCount: 2,
      }));
      expect(customCatalog?.llmModels.map((model) => model.modelIdentifier)).toEqual([
        `openai-compatible:${providerId}:synthetic-model-a`,
        `openai-compatible:${providerId}:synthetic-model-b`,
      ]);
      expect(authorizedDiscoveryRequests).toBe(2);

      const deleted = await execute<{
        deleteCustomProvider: { providerId: string; deleted: boolean };
      }>(`
        mutation Delete($providerId: String!) {
          deleteCustomProvider(providerId: $providerId) { providerId deleted }
        }
      `, { providerId });
      expect(deleted.deleteCustomProvider).toEqual({ providerId, deleted: true });
      expect(await provider(providerId)).toBeNull();
      expect(await providerCatalog(providerId)).toBeNull();
      providerId = null;
      const evidence = server.output() + fs.readFileSync(server.runtimeEnvironmentPath, 'utf8');
      expect(evidence).not.toContain(syntheticCredential);
    } finally {
      if (providerId) {
        await execute<{
          deleteCustomProvider: { providerId: string; deleted: boolean };
        }>(`
          mutation Delete($providerId: String!) {
            deleteCustomProvider(providerId: $providerId) { providerId deleted }
          }
        `, { providerId }).catch(() => undefined);
      }
      await new Promise<void>((resolve) => fixture.close(() => resolve()));
    }
  });
});
