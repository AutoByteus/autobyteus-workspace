import 'reflect-metadata';
import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';
import { LLMFactory } from 'autobyteus-ts';

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
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      KIMI_API_KEY: process.env.KIMI_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      VERTEX_AI_API_KEY: process.env.VERTEX_AI_API_KEY,
    };
    process.env.OLLAMA_HOSTS = ' ';
    process.env.LMSTUDIO_HOSTS = ' ';
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = ' ';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.VERTEX_AI_API_KEY;
    LLMFactory.resetForTests();

    const query = `
      query AvailableModels {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider {
            id
          }
          llmModels {
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
        providerModelCatalogSnapshots: Array<{
          ownerProvider: { id: string };
          llmModels: Array<{
            modelIdentifier: string;
            name: string;
            value: string;
            canonicalName: string;
          }>;
        }>;
      }>(query);

      const minimaxModels = result.providerModelCatalogSnapshots
        .filter((row) => row.ownerProvider.id === 'MINIMAX')
        .flatMap((row) => row.llmModels);
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
      LLMFactory.resetForTests();
      for (const [key, value] of Object.entries(previousDiscoveryEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }, 20_000);

  it('surfaces current static Anthropic models through the settings-facing GraphQL model list', async () => {
    const previousEnv = {
      OLLAMA_HOSTS: process.env.OLLAMA_HOSTS,
      LMSTUDIO_HOSTS: process.env.LMSTUDIO_HOSTS,
      AUTOBYTEUS_LLM_SERVER_HOSTS: process.env.AUTOBYTEUS_LLM_SERVER_HOSTS,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      KIMI_API_KEY: process.env.KIMI_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      VERTEX_AI_API_KEY: process.env.VERTEX_AI_API_KEY,
    };
    process.env.OLLAMA_HOSTS = ' ';
    process.env.LMSTUDIO_HOSTS = ' ';
    process.env.AUTOBYTEUS_LLM_SERVER_HOSTS = ' ';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.VERTEX_AI_API_KEY;
    LLMFactory.resetForTests();

    const query = `
      query AnthropicModels {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider {
            id
          }
          llmModels {
            modelIdentifier
            name
            value
            canonicalName
            maxContextTokens
            maxOutputTokens
          }
        }
      }
    `;

    try {
      const result = await execGraphql<{
        providerModelCatalogSnapshots: Array<{
          ownerProvider: { id: string };
          llmModels: Array<{
            modelIdentifier: string;
            name: string;
            value: string;
            canonicalName: string;
            maxContextTokens: number | null;
            maxOutputTokens: number | null;
          }>;
        }>;
      }>(query);

      const anthropicModels = result.providerModelCatalogSnapshots
        .filter((row) => row.ownerProvider.id === 'ANTHROPIC')
        .flatMap((row) => row.llmModels);
      const byIdentifier = new Map(anthropicModels.map((model) => [model.modelIdentifier, model]));
      const identifiers = anthropicModels.map((model) => model.modelIdentifier);
      const namesAndValues = anthropicModels.flatMap((model) => [
        model.name,
        model.value,
        model.canonicalName,
      ]);

      expect(identifiers).toEqual(expect.arrayContaining([
        'claude-fable-5',
        'claude-opus-4.8',
        'claude-sonnet-5',
      ]));
      expect(byIdentifier.get('claude-fable-5')).toMatchObject({
        value: 'claude-fable-5',
        canonicalName: 'claude-fable-5',
        maxContextTokens: 1000000,
        maxOutputTokens: 128000,
      });
      expect(byIdentifier.get('claude-opus-4.8')).toMatchObject({
        value: 'claude-opus-4-8',
        canonicalName: 'claude-opus-4.8',
        maxContextTokens: 1000000,
        maxOutputTokens: 128000,
      });
      expect(byIdentifier.get('claude-sonnet-5')).toMatchObject({
        value: 'claude-sonnet-5',
        canonicalName: 'claude-sonnet-5',
        maxContextTokens: 1000000,
        maxOutputTokens: 128000,
      });
      expect(identifiers).not.toContain('claude-sonnet-4.8');
      expect(namesAndValues).not.toContain('claude-sonnet-4-8');
    } finally {
      LLMFactory.resetForTests();
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }, 20_000);
});
