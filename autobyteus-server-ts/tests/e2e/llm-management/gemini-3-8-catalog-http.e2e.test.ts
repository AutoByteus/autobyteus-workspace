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

describe('Gemini 3.8 built-server catalog HTTP E2E', () => {
  let server: RunningTestServer;
  let runtimeRoot: string;
  let database: ReturnType<typeof resolveTestDatabaseLocation>;

  beforeAll(async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    runtimeRoot = path.join(testRuntimeRoot, `gemini-3-8-catalog-http-${suffix}`);
    database = resolveTestDatabaseLocation(`file:./db/gemini-3-8-catalog-http-${suffix}.db`);
    server = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
    });
  });

  afterAll(async () => {
    if (server?.child.exitCode === null) await server.stop();
    if (runtimeRoot && database) await removeOwnedTestRuntime(runtimeRoot, database);
  });

  it('projects one exact current Flash row and schema through the built HTTP GraphQL boundary', async () => {
    const result = await executeGraphql<{
      providerModelCatalogSnapshots: Array<{
        ownerProvider: { id: string };
        llmModels: Array<{
          modelIdentifier: string;
          name: string;
          value: string;
          canonicalName: string;
          providerId: string;
          configSchema: {
            properties?: Record<string, { enum?: string[]; default?: unknown }>;
          } | null;
          maxContextTokens: number | null;
          maxInputTokens: number | null;
          maxOutputTokens: number | null;
          metadataProvenance: string | null;
        }>;
      }>;
    }>(server.serverUrl, `
      query Gemini38Catalog {
        providerModelCatalogSnapshots(runtimeKind: "autobyteus") {
          ownerProvider { id }
          llmModels {
            modelIdentifier
            name
            value
            canonicalName
            providerId
            configSchema
            maxContextTokens
            maxInputTokens
            maxOutputTokens
            metadataProvenance
          }
        }
      }
    `);

    const geminiModels = result.providerModelCatalogSnapshots
      .filter((snapshot) => snapshot.ownerProvider.id === 'GEMINI')
      .flatMap((snapshot) => snapshot.llmModels);
    const currentFlashRows = geminiModels.filter((candidate) => candidate.modelIdentifier.includes('flash'));

    expect(currentFlashRows).toHaveLength(1);
    expect(currentFlashRows[0]).toMatchObject({
      modelIdentifier: 'gemini-3.8-flash',
      name: 'gemini-3.8-flash',
      value: 'gemini-3.8-flash',
      canonicalName: 'gemini-3.8-flash',
      providerId: 'GEMINI',
      maxContextTokens: 1_048_576,
      maxInputTokens: 1_048_576,
      maxOutputTokens: 65_536,
      metadataProvenance: null,
    });
    expect(currentFlashRows[0]?.configSchema?.properties).toMatchObject({
      thinking_level: { enum: ['low', 'medium', 'high'], default: 'medium' },
      include_thoughts: { default: false },
    });
    expect(currentFlashRows[0]?.configSchema?.properties?.thinking_level?.enum).not.toContain('minimal');
    expect(geminiModels.map((candidate) => candidate.modelIdentifier)).not.toContain('gemini-3.7-flash');
  });
});
