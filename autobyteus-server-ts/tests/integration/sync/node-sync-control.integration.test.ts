import 'reflect-metadata';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { graphql as graphqlFn, GraphQLSchema } from 'graphql';
import { buildGraphqlSchema } from '../../../src/api/graphql/schema.js';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface FakeNodeState {
  healthCalls: number;
  exportCalls: Array<Record<string, unknown>>;
  importCalls: Array<Record<string, unknown>>;
}

interface FakeNodeOptions {
  healthStatus?: number;
  exportBundle?: Record<string, JsonValue>;
  importResult?:
    | Record<string, JsonValue>
    | ((input: Record<string, unknown>) => Record<string, JsonValue>);
}

interface FakeNodeServer {
  baseUrl: string;
  state: FakeNodeState;
  close: () => Promise<void>;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function startFakeNode(options: FakeNodeOptions = {}): Promise<FakeNodeServer> {
  const state: FakeNodeState = {
    healthCalls: 0,
    exportCalls: [],
    importCalls: [],
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '';

    if (url === '/rest/health') {
      state.healthCalls += 1;
      const status = options.healthStatus ?? 200;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: status === 200 ? 'ok' : 'error' }));
      return;
    }

    if (url === '/graphql' && req.method === 'POST') {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}') as {
        query?: string;
        variables?: Record<string, unknown>;
      };

      const query = payload.query ?? '';
      const variables = payload.variables ?? {};
      const input = (variables.input ?? {}) as Record<string, unknown>;

      if (query.includes('exportSyncBundle')) {
        state.exportCalls.push(input);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            data: {
              exportSyncBundle:
                options.exportBundle ??
                {
                  watermark: 'wm-integration',
                  entities: {
                    prompt: [],
                  },
                  tombstones: {},
                },
            },
          }),
        );
        return;
      }

      if (query.includes('importSyncBundle')) {
        state.importCalls.push(input);
        const result =
          typeof options.importResult === 'function'
            ? options.importResult(input)
            : options.importResult ??
              {
                success: true,
                appliedWatermark: 'wm-integration',
                summary: {
                  processed: 1,
                  created: 1,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
                failures: [],
              };

        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            data: {
              importSyncBundle: result,
            },
          }),
        );
        return;
      }

      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'Unsupported GraphQL operation' }] }));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve fake node server address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

describe('Node sync control integration', () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const nodesToClose: FakeNodeServer[] = [];

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve('type-graphql'));
    const graphqlPath = require.resolve('graphql', { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    while (nodesToClose.length > 0) {
      const node = nodesToClose.pop();
      if (node) {
        await node.close();
      }
    }
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
            failureSamples {
              entityType
              key
              message
            }
            summary {
              processed
              created
              updated
              deleted
              skipped
            }
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

  const runGraphql = async (
    source: string,
    variables?: Record<string, unknown>,
  ) =>
    graphql({
      schema,
      source,
      variableValues: variables,
    });

  it('executes one export and fan-out imports to all targets', async () => {
    const sourceNode = await startFakeNode({
      exportBundle: {
        watermark: 'wm-fanout',
        entities: {
          prompt: [
            {
              key: 'cat::name::1::default',
              name: 'name',
              category: 'cat',
              promptContent: 'content',
              version: 1,
              isActive: true,
            },
          ],
        },
        tombstones: {},
      },
    });
    const targetA = await startFakeNode();
    const targetB = await startFakeNode();
    nodesToClose.push(sourceNode, targetA, targetB);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: sourceNode.baseUrl },
        targets: [
          { nodeId: 'target-a', baseUrl: targetA.baseUrl },
          { nodeId: 'target-b', baseUrl: targetB.baseUrl },
        ],
        scope: ['PROMPT', 'AGENT_DEFINITION'],
        selection: {
          agentDefinitionIds: ['agent-1'],
          includeDependencies: true,
          includeDeletes: false,
        },
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
          scope: ['PROMPT', 'AGENT_DEFINITION'],
          exportByEntity: [
            {
              entityType: 'PROMPT',
              exportedCount: 1,
              sampledKeys: ['cat::name::1::default'],
              sampleTruncated: false,
            },
            {
              entityType: 'AGENT_DEFINITION',
              exportedCount: 0,
              sampledKeys: [],
              sampleTruncated: false,
            },
          ],
        },
        targetResults: [
          { targetNodeId: 'target-a', status: 'success' },
          { targetNodeId: 'target-b', status: 'success' },
        ],
      },
    });

    expect(sourceNode.state.exportCalls).toHaveLength(1);
    expect(sourceNode.state.exportCalls[0]).toMatchObject({
      scope: ['PROMPT', 'AGENT_DEFINITION'],
      selection: {
        agentDefinitionIds: ['agent-1'],
        includeDependencies: true,
        includeDeletes: false,
      },
    });

    expect(targetA.state.importCalls).toHaveLength(1);
    expect(targetB.state.importCalls).toHaveLength(1);
    expect(targetA.state.importCalls[0]).toMatchObject({
      scope: ['PROMPT', 'AGENT_DEFINITION'],
      conflictPolicy: 'SOURCE_WINS',
      tombstonePolicy: 'SOURCE_DELETE_WINS',
    });
    expect(targetB.state.importCalls[0]).toMatchObject({
      scope: ['PROMPT', 'AGENT_DEFINITION'],
      conflictPolicy: 'SOURCE_WINS',
      tombstonePolicy: 'SOURCE_DELETE_WINS',
    });
    expect(targetA.state.importCalls[0]?.bundle).toMatchObject({ watermark: 'wm-fanout' });
    expect(targetB.state.importCalls[0]?.bundle).toMatchObject({ watermark: 'wm-fanout' });
  });

  it('returns partial-success when one target import returns unsuccessful result', async () => {
    const sourceNode = await startFakeNode();
    const successTarget = await startFakeNode();
    const failingTarget = await startFakeNode({
      importResult: {
        success: false,
        appliedWatermark: 'wm-integration',
        summary: {
          processed: 1,
          created: 0,
          updated: 0,
          deleted: 0,
          skipped: 1,
        },
        failures: [
          {
            entityType: 'PROMPT',
            key: 'cat::name::1::default',
            message: 'conflict',
          },
        ],
      },
    });
    nodesToClose.push(sourceNode, successTarget, failingTarget);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: sourceNode.baseUrl },
        targets: [
          { nodeId: 'target-ok', baseUrl: successTarget.baseUrl },
          { nodeId: 'target-failed', baseUrl: failingTarget.baseUrl },
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
              targetNodeId: 'target-ok',
              status: 'success',
              failureCountTotal: 0,
              failureSampleTruncated: false,
              failureSamples: [],
            },
            {
              targetNodeId: 'target-failed',
              status: 'failed',
              message: 'Import failed with 1 issue(s). First: [prompt] cat::name::1::default: conflict',
              failureCountTotal: 1,
              failureSampleTruncated: false,
              failureSamples: [
                {
                  entityType: 'PROMPT',
                  key: 'cat::name::1::default',
                  message: 'conflict',
                },
              ],
            },
          ],
        },
        targetResults: [
          { targetNodeId: 'target-ok', status: 'success' },
          {
            targetNodeId: 'target-failed',
            status: 'failed',
            message: 'Import failed with 1 issue(s). First: [prompt] cat::name::1::default: conflict',
          },
        ],
      },
    });

    expect(sourceNode.state.exportCalls).toHaveLength(1);
    expect(sourceNode.state.exportCalls[0]).toMatchObject({
      scope: ['PROMPT'],
    });
    expect(successTarget.state.importCalls).toHaveLength(1);
    expect(failingTarget.state.importCalls).toHaveLength(1);
    expect(successTarget.state.importCalls[0]).toMatchObject({
      scope: ['PROMPT'],
      conflictPolicy: 'SOURCE_WINS',
      tombstonePolicy: 'SOURCE_DELETE_WINS',
    });
    expect(failingTarget.state.importCalls[0]).toMatchObject({
      scope: ['PROMPT'],
      conflictPolicy: 'SOURCE_WINS',
      tombstonePolicy: 'SOURCE_DELETE_WINS',
    });
  });

  it('fails preflight on unhealthy target before export is attempted', async () => {
    const sourceNode = await startFakeNode();
    const unhealthyTarget = await startFakeNode({ healthStatus: 503 });
    nodesToClose.push(sourceNode, unhealthyTarget);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: 'source', baseUrl: sourceNode.baseUrl },
        targets: [{ nodeId: 'target-bad', baseUrl: unhealthyTarget.baseUrl }],
        scope: ['PROMPT'],
        conflictPolicy: 'SOURCE_WINS',
        tombstonePolicy: 'SOURCE_DELETE_WINS',
      },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toContain('Node sync preflight failed [health]');
    expect(sourceNode.state.exportCalls).toHaveLength(0);
    expect(unhealthyTarget.state.importCalls).toHaveLength(0);
  });
});
