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

describe('provider and Gemini one-vault GraphQL E2E', () => {
  let server: RunningTestServer;
  let runtimeRoot: string;
  let database: ReturnType<typeof resolveTestDatabaseLocation>;

  const execute = <T>(query: string, variables: Record<string, unknown> = {}) =>
    executeGraphql<T>(server.serverUrl, query, variables);

  const providerSettings = () => execute<{
    providerSettings: Array<{
      provider: {
        id: string;
        apiKeyConfigured: boolean;
        status: string;
        statusMessage: string | null;
      };
      llmModels: Array<{ modelIdentifier: string }>;
      audioModels: Array<{ modelIdentifier: string }>;
      imageModels: Array<{ modelIdentifier: string }>;
      videoModels: Array<{ modelIdentifier: string }>;
    }>;
  }>(`
    query ProviderSettings {
      providerSettings(runtimeKind: "autobyteus") {
        provider {
          id
          apiKeyConfigured
          status
          statusMessage
        }
        llmModels { modelIdentifier }
        audioModels { modelIdentifier }
        imageModels { modelIdentifier }
        videoModels { modelIdentifier }
      }
    }
  `);

  const provider = async (providerId: string) =>
    (await providerSettings()).providerSettings.find(
      ({ provider: candidate }) => candidate.id === providerId,
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
    expect((await provider('AUTOBYTEUS'))?.provider.apiKeyConfigured).toBe(false);
    const mutation = `
      mutation Save($providerId: String!, $apiKey: String!) {
        saveProviderApiKey(providerId: $providerId, apiKey: $apiKey)
      }
    `;
    const firstCanary = 'synthetic-graphql-secret-first';
    const first = await execute<{ saveProviderApiKey: boolean }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: firstCanary,
    });
    expect(first.saveProviderApiKey).toBe(true);
    expect(JSON.stringify(first)).not.toContain(firstCanary);

    const secondCanary = 'synthetic-graphql-secret-second';
    const second = await execute<{ saveProviderApiKey: boolean }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: secondCanary,
    });
    expect(second.saveProviderApiKey).toBe(true);
    expect(JSON.stringify(second)).not.toContain(secondCanary);
    expect((await provider('AUTOBYTEUS'))?.provider.apiKeyConfigured).toBe(true);

    expect((await provider('AUTOBYTEUS'))?.provider.apiKeyConfigured).toBe(true);
    const evidence = server.output() + fs.readFileSync(server.runtimeEnvironmentPath, 'utf8');
    expect(evidence).not.toContain(firstCanary);
    expect(evidence).not.toContain(secondCanary);
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
    const aiSaved = await execute<{ saveGeminiAiStudio: Record<string, unknown> }>(`
      mutation SaveAi($apiKey: String!, $activateAfterSave: Boolean!) {
        saveGeminiAiStudio(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
          activeMode aiStudioConfigured vertexExpressConfigured
          vertexProject { project location }
        }
      }
    `, { apiKey: aiCanary, activateAfterSave: false });
    expect(aiSaved.saveGeminiAiStudio).toMatchObject({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: false,
    });
    const expressSaved = await execute<{ saveGeminiVertexExpress: Record<string, unknown> }>(`
      mutation SaveExpress($apiKey: String!, $activateAfterSave: Boolean!) {
        saveGeminiVertexExpress(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
          activeMode aiStudioConfigured vertexExpressConfigured
          vertexProject { project location }
        }
      }
    `, { apiKey: expressCanary, activateAfterSave: false });
    expect(expressSaved.saveGeminiVertexExpress).toMatchObject({
      activeMode: null,
      aiStudioConfigured: true,
      vertexExpressConfigured: true,
    });
    const projectSaved = await execute<{ saveGeminiVertexProject: Record<string, unknown> }>(`
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
          activeMode aiStudioConfigured vertexExpressConfigured
          vertexProject { project location }
        }
      }
    `, {
      project: 'synthetic-project',
      location: 'europe-west1',
      activateAfterSave: false,
    });
    expect(projectSaved.saveGeminiVertexProject).toMatchObject({
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
      await execute<{ useGeminiMode: Record<string, unknown> }>(`
        mutation UseMode($mode: GeminiSetupMode!) {
          useGeminiMode(mode: $mode) {
            activeMode aiStudioConfigured vertexExpressConfigured
            vertexProject { project location }
          }
        }
      `, { mode });
    expect((await activate('AI_STUDIO')).useGeminiMode).toMatchObject({
      activeMode: 'AI_STUDIO',
    });
    expect((await activate('VERTEX_PROJECT')).useGeminiMode).toMatchObject({
      activeMode: 'VERTEX_PROJECT',
    });
    expect((await activate('VERTEX_EXPRESS')).useGeminiMode).toMatchObject({
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
    const catalogs = await execute<{
      availableLlmProvidersWithModels: Array<{
        provider: { id: string; name: string };
        models: Array<{ modelIdentifier: string }>;
      }>;
    }>(`
      query Catalogs {
        availableLlmProvidersWithModels(runtimeKind: "autobyteus") {
          provider { id name }
          models { modelIdentifier }
        }
      }
    `);
    expect(catalogs.availableLlmProvidersWithModels.length).toBeGreaterThan(0);
    expect(catalogs.availableLlmProvidersWithModels.some(
      (row) => row.provider.id === 'OPENAI' && row.models.length > 0,
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
        createCustomProvider: string;
      }>(`
        mutation Create($input: CustomProviderInputObject!) {
          createCustomProvider(input: $input)
        }
      `, { input });
      providerId = created.createCustomProvider;
      expect(providerId).toMatch(/^provider_/);
      expect(JSON.stringify(created)).not.toContain(syntheticCredential);

      const customSettings = await provider(providerId);
      expect(customSettings).toMatchObject({
        provider: {
          id: providerId,
          apiKeyConfigured: true,
          status: 'READY',
        },
      });
      expect(customSettings?.llmModels.map((model) => model.modelIdentifier)).toEqual([
        `openai-compatible:${providerId}:synthetic-model-a`,
        `openai-compatible:${providerId}:synthetic-model-b`,
      ]);
      expect(authorizedDiscoveryRequests).toBeGreaterThanOrEqual(2);

      const deleted = await execute<{ deleteCustomProvider: boolean }>(`
        mutation Delete($providerId: String!) {
          deleteCustomProvider(providerId: $providerId)
        }
      `, { providerId });
      expect(deleted.deleteCustomProvider).toBe(true);
      expect(await provider(providerId)).toBeNull();
      providerId = null;
      const evidence = server.output() + fs.readFileSync(server.runtimeEnvironmentPath, 'utf8');
      expect(evidence).not.toContain(syntheticCredential);
    } finally {
      if (providerId) {
        await execute<{ deleteCustomProvider: boolean }>(`
          mutation Delete($providerId: String!) {
            deleteCustomProvider(providerId: $providerId)
          }
        `, { providerId }).catch(() => undefined);
      }
      await new Promise<void>((resolve) => fixture.close(() => resolve()));
    }
  });
});
