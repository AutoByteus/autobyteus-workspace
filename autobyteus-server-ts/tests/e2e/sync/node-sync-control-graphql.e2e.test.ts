import 'reflect-metadata';
import path from 'node:path';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';

describe('Node sync control GraphQL endpoint e2e', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const runGraphql = async (
    source: string,
    variables?: Record<string, unknown>,
  ) =>
    graphql({
      schema,
      source,
      variableValues: variables,
    });

  const runNodeSyncMutation = `
    mutation RunNodeSync($input: RunNodeSyncInput!) {
      runNodeSync(input: $input) {
        status
        sourceNodeId
        error
        report {
          sourceNodeId
          scope
          exportByEntity {
            entityType
            exportedCount
            sampledKeys
            sampleTruncated
          }
          targets {
            targetNodeId
            status
            message
            failureCountTotal
            failureSampleTruncated
          }
        }
        targetResults {
          targetNodeId
          status
          message
          summary {
            processed
            created
            updated
            deleted
            skipped
          }
        }
      }
    }
  `;

  it('runs sync successfully across one target', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/rest/health')) {
        return new Response('{}', { status: 200 });
      }

      if (url.endsWith('/graphql')) {
        const payload = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        const query = payload.query ?? '';

        if (query.includes('exportSyncBundle')) {
          return new Response(
            JSON.stringify({
              data: {
                exportSyncBundle: {
                  watermark: 'wm-1',
                  entities: {
                    prompt: [],
                  },
                  tombstones: {},
                },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (query.includes('importSyncBundle')) {
          return new Response(
            JSON.stringify({
              data: {
                importSyncBundle: {
                  success: true,
                  appliedWatermark: 'wm-1',
                  summary: {
                    processed: 1,
                    created: 1,
                    updated: 0,
                    deleted: 0,
                    skipped: 0,
                  },
                  failures: [],
                },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
      }

      return new Response('not found', { status: 404 });
    });

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: 'http://localhost:8000' },
        targets: [{ nodeId: 'target-a', baseUrl: 'http://localhost:8001' }],
        scope: ['PROMPT'],
        conflictPolicy: 'SOURCE_WINS',
        tombstonePolicy: 'SOURCE_DELETE_WINS',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      runNodeSync: {
        status: 'success',
        sourceNodeId: 'source',
        report: {
          sourceNodeId: 'source',
          scope: ['PROMPT'],
          exportByEntity: [
            {
              entityType: 'PROMPT',
              exportedCount: 0,
              sampledKeys: [],
              sampleTruncated: false,
            },
          ],
          targets: [
            {
              targetNodeId: 'target-a',
              status: 'success',
              failureCountTotal: 0,
              failureSampleTruncated: false,
            },
          ],
        },
        targetResults: [
          {
            targetNodeId: 'target-a',
            status: 'success',
            summary: {
              processed: 1,
              created: 1,
              updated: 0,
              deleted: 0,
              skipped: 0,
            },
          },
        ],
      },
    });

    expect(fetchMock).toHaveBeenCalled();
    const graphqlBodies = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/graphql'))
      .map(([, init]) => JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { input?: Record<string, unknown> } });
    const exportRequest = graphqlBodies.find((entry) => String(entry.query ?? '').includes('exportSyncBundle'));
    const importRequest = graphqlBodies.find((entry) => String(entry.query ?? '').includes('importSyncBundle'));
    expect(exportRequest?.variables?.input).toMatchObject({
      scope: ['PROMPT'],
    });
    expect(importRequest?.variables?.input).toMatchObject({
      scope: ['PROMPT'],
      conflictPolicy: 'SOURCE_WINS',
      tombstonePolicy: 'SOURCE_DELETE_WINS',
    });
  });

  it('returns partial-success when one target import fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith('/rest/health')) {
        return new Response('{}', { status: 200 });
      }

      if (url.endsWith('/graphql')) {
        const payload = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        const query = payload.query ?? '';

        if (query.includes('exportSyncBundle')) {
          return new Response(
            JSON.stringify({
              data: {
                exportSyncBundle: {
                  watermark: 'wm-2',
                  entities: { prompt: [] },
                  tombstones: {},
                },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }

        if (query.includes('importSyncBundle')) {
          if (url.includes('8002')) {
            return new Response('target unavailable', { status: 503 });
          }

          return new Response(
            JSON.stringify({
              data: {
                importSyncBundle: {
                  success: true,
                  appliedWatermark: 'wm-2',
                  summary: {
                    processed: 1,
                    created: 1,
                    updated: 0,
                    deleted: 0,
                    skipped: 0,
                  },
                  failures: [],
                },
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
      }

      return new Response('not found', { status: 404 });
    });

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: 'http://localhost:8000' },
        targets: [
          { nodeId: 'target-a', baseUrl: 'http://localhost:8001' },
          { nodeId: 'target-b', baseUrl: 'http://localhost:8002' },
        ],
        scope: ['PROMPT'],
        conflictPolicy: 'SOURCE_WINS',
        tombstonePolicy: 'SOURCE_DELETE_WINS',
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      runNodeSync: {
        status: 'partial-success',
        report: {
          sourceNodeId: 'source',
          scope: ['PROMPT'],
          targets: [
            {
              targetNodeId: 'target-a',
              status: 'success',
              failureCountTotal: 0,
              failureSampleTruncated: false,
            },
            {
              targetNodeId: 'target-b',
              status: 'failed',
              failureCountTotal: 0,
              failureSampleTruncated: false,
              message: expect.stringContaining('GraphQL request failed (503)'),
            },
          ],
        },
        targetResults: [
          { targetNodeId: 'target-a', status: 'success' },
          {
            targetNodeId: 'target-b',
            status: 'failed',
            message: expect.stringContaining('GraphQL request failed (503)'),
          },
        ],
      },
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it('returns preflight configuration error for source-target endpoint overlap', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('fetch should not be called');
    });

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: 'http://localhost:8000/' },
        targets: [{ nodeId: 'target-a', baseUrl: 'localhost:8000' }],
        scope: ['PROMPT'],
        conflictPolicy: 'SOURCE_WINS',
        tombstonePolicy: 'SOURCE_DELETE_WINS',
      },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toContain('Node sync preflight failed [configuration]');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
