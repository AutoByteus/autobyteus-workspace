import 'reflect-metadata';
import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';

describe('token usage related model-list GraphQL coverage', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it('keeps removed MiniMax M2.7 absent from the settings-facing GraphQL model list', async () => {
    const previousDiscoveryEnv = {
      OLLAMA_HOSTS: process.env.OLLAMA_HOSTS,
      LMSTUDIO_HOSTS: process.env.LMSTUDIO_HOSTS,
      AUTOBYTEUS_LLM_SERVER_HOSTS: process.env.AUTOBYTEUS_LLM_SERVER_HOSTS,
    };
    process.env.OLLAMA_HOSTS = ' ';
    process.env.LMSTUDIO_HOSTS = ' ';
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = ' ';

    const query = `
      query AvailableModels {
        availableLlmProvidersWithModels(runtimeKind: "autobyteus") {
          provider {
            id
          }
          models {
            modelIdentifier
            name
            value
            canonicalName
          }
        }
      }
    `;

    try {
      const result = await execGraphql<{
        availableLlmProvidersWithModels: Array<{
          provider: { id: string };
          models: Array<{
            modelIdentifier: string;
            name: string;
            value: string;
            canonicalName: string;
          }>;
        }>;
      }>(query);

      const minimaxModels = result.availableLlmProvidersWithModels
        .filter((row) => row.provider.id === 'MINIMAX')
        .flatMap((row) => row.models);
      const identifiers = minimaxModels.map((model) => model.modelIdentifier);
      const namesAndValues = minimaxModels.flatMap((model) => [
        model.name,
        model.value,
        model.canonicalName,
      ]);

      expect(identifiers).toContain('minimax-m3');
      expect(namesAndValues).toContain('MiniMax-M3');
      expect(identifiers).not.toContain('minimax-m2.7');
      expect(namesAndValues).not.toContain('MiniMax-M2.7');
    } finally {
      for (const [key, value] of Object.entries(previousDiscoveryEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }, 20_000);});
