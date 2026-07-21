import 'reflect-metadata';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import {
  getSecretStorageConfigurationService,
  resetSecretStorageConfigurationServiceForTests,
} from '../../../src/secret-management/configuration/secret-storage-configuration-service.js';

describe('provider secret lifecycle GraphQL E2E', () => {
  let graphql: typeof graphqlFn;
  let schema: GraphQLSchema;
  let tempDirectory: string;
  let originalHosts: string | undefined;

  const execute = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source, variableValues });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const credentialStatus = () => execute<{
    getLlmProviderCredentialStatus: {
      backendHealth: string;
      storageState: string | null;
      lifecycle: string | null;
      instructionCode: string | null;
    } | null;
  }>(`
    query Status($providerId: String!) {
      getLlmProviderCredentialStatus(providerId: $providerId) {
        backendHealth
        storageState
        lifecycle
        instructionCode
      }
    }
  `, { providerId: 'AUTOBYTEUS' });

  beforeAll(async () => {
    originalHosts = process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
    delete process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'provider-secret-graphql-'));
    await getSecretStorageConfigurationService().bootstrap({ serverDataDir: tempDirectory });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    await resetSecretStorageConfigurationServiceForTests();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    if (originalHosts === undefined) delete process.env.AUTOBYTEUS_LLM_SERVER_HOSTS;
    else process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = originalHosts;
  });

  it('saves, replaces, and idempotently removes without value readback', async () => {
    expect((await credentialStatus()).getLlmProviderCredentialStatus).toEqual({
      backendHealth: 'READY',
      storageState: 'MISSING',
      lifecycle: 'WRITABLE',
      instructionCode: null,
    });

    const mutation = `
      mutation Save($providerId: String!, $apiKey: String!) {
        setLlmProviderApiKey(providerId: $providerId, apiKey: $apiKey)
      }
    `;
    const firstCanary = 'synthetic-graphql-secret-first';
    const first = await execute<{ setLlmProviderApiKey: string }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: firstCanary,
    });
    expect(first.setLlmProviderApiKey).toContain('set successfully');
    expect(JSON.stringify(first)).not.toContain(firstCanary);

    const secondCanary = 'synthetic-graphql-secret-second';
    const second = await execute<{ setLlmProviderApiKey: string }>(mutation, {
      providerId: 'AUTOBYTEUS',
      apiKey: secondCanary,
    });
    expect(second.setLlmProviderApiKey).toContain('set successfully');
    expect(JSON.stringify(second)).not.toContain(secondCanary);
    expect((await credentialStatus()).getLlmProviderCredentialStatus?.storageState).toBe('CONFIGURED');

    const removeMutation = `
      mutation Remove($providerId: String!) {
        removeLlmProviderApiKey(providerId: $providerId)
      }
    `;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const removed = await execute<{ removeLlmProviderApiKey: string }>(removeMutation, {
        providerId: 'AUTOBYTEUS',
      });
      expect(removed.removeLlmProviderApiKey).toContain('removed successfully');
    }
    expect((await credentialStatus()).getLlmProviderCredentialStatus?.storageState).toBe('MISSING');
  });

  it('projects only value-free backend status and LOCAL_HARDENED assurance', async () => {
    const result = await execute<{
      getSecretStorageStatus: {
        selectedKind: string;
        health: string;
        instructionCode: string | null;
        lifecycle: string | null;
        assurance: string;
        restartRequired: boolean;
      };
    }>(`
      query SecretStorageStatus {
        getSecretStorageStatus {
          selectedKind
          health
          instructionCode
          lifecycle
          assurance
          restartRequired
        }
      }
    `);
    expect(result.getSecretStorageStatus).toEqual({
      selectedKind: 'LOCAL',
      health: 'READY',
      instructionCode: null,
      lifecycle: 'WRITABLE',
      assurance: 'LOCAL_HARDENED',
      restartRequired: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/synthetic-graphql-secret/);
  });
});
