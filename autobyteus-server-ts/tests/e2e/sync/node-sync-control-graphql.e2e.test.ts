import "reflect-metadata";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";

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
  return Buffer.concat(chunks).toString("utf8");
}

async function startFakeNode(options: FakeNodeOptions = {}): Promise<FakeNodeServer> {
  const state: FakeNodeState = {
    healthCalls: 0,
    exportCalls: [],
    importCalls: [],
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "";

    if (url === "/rest/health") {
      state.healthCalls += 1;
      const status = options.healthStatus ?? 200;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: status === 200 ? "ok" : "error" }));
      return;
    }

    if (url === "/graphql" && req.method === "POST") {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || "{}") as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      const query = payload.query ?? "";
      const variables = payload.variables ?? {};
      const input = (variables.input ?? {}) as Record<string, unknown>;

      if (query.includes("exportSyncBundle")) {
        state.exportCalls.push(input);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              exportSyncBundle:
                options.exportBundle ??
                {
                  watermark: "wm-e2e",
                  entities: { agent_definition: [] },
                  tombstones: {},
                },
            },
          }),
        );
        return;
      }

      if (query.includes("importSyncBundle")) {
        state.importCalls.push(input);
        const result =
          typeof options.importResult === "function"
            ? options.importResult(input)
            : options.importResult ??
              {
                success: true,
                appliedWatermark: "wm-e2e",
                summary: {
                  processed: 1,
                  created: 1,
                  updated: 0,
                  deleted: 0,
                  skipped: 0,
                },
                failures: [],
              };

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              importSyncBundle: result,
            },
          }),
        );
        return;
      }

      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ errors: [{ message: "Unsupported GraphQL operation" }] }));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve fake node server address.");
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

describe("Node sync control GraphQL endpoint e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const nodesToClose: FakeNodeServer[] = [];

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
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

  it("runs sync successfully across one target", async () => {
    const sourceNode = await startFakeNode();
    const targetNode = await startFakeNode();
    nodesToClose.push(sourceNode, targetNode);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: "source", baseUrl: sourceNode.baseUrl },
        targets: [{ nodeId: "target-a", baseUrl: targetNode.baseUrl }],
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      runNodeSync: {
        status: "success",
        sourceNodeId: "source",
        report: {
          sourceNodeId: "source",
          scope: ["AGENT_DEFINITION"],
          exportByEntity: [
            {
              entityType: "AGENT_DEFINITION",
              exportedCount: 0,
              sampledKeys: [],
              sampleTruncated: false,
            },
          ],
          targets: [
            {
              targetNodeId: "target-a",
              status: "success",
              failureCountTotal: 0,
              failureSampleTruncated: false,
            },
          ],
        },
      },
    });

    expect(sourceNode.state.exportCalls).toHaveLength(1);
    expect(targetNode.state.importCalls).toHaveLength(1);
    expect(sourceNode.state.exportCalls[0]).toMatchObject({
      scope: ["AGENT_DEFINITION"],
    });
    expect(targetNode.state.importCalls[0]).toMatchObject({
      scope: ["AGENT_DEFINITION"],
      conflictPolicy: "SOURCE_WINS",
      tombstonePolicy: "SOURCE_DELETE_WINS",
    });
  });

  it("returns partial-success when one target import fails", async () => {
    const sourceNode = await startFakeNode();
    const successTarget = await startFakeNode();
    const failingTarget = await startFakeNode({
      importResult: {
        success: false,
        appliedWatermark: "wm-e2e",
        summary: {
          processed: 1,
          created: 0,
          updated: 0,
          deleted: 0,
          skipped: 1,
        },
        failures: [
          {
            entityType: "AGENT_DEFINITION",
            key: "agent-1",
            message: "conflict",
          },
        ],
      },
    });
    nodesToClose.push(sourceNode, successTarget, failingTarget);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: "source", baseUrl: sourceNode.baseUrl },
        targets: [
          { nodeId: "target-a", baseUrl: successTarget.baseUrl },
          { nodeId: "target-b", baseUrl: failingTarget.baseUrl },
        ],
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
      },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      runNodeSync: {
        status: "partial-success",
        report: {
          sourceNodeId: "source",
          scope: ["AGENT_DEFINITION"],
          targets: [
            {
              targetNodeId: "target-a",
              status: "success",
              failureCountTotal: 0,
              failureSampleTruncated: false,
            },
            {
              targetNodeId: "target-b",
              status: "failed",
              failureCountTotal: 1,
              failureSampleTruncated: false,
            },
          ],
        },
      },
    });

    expect(sourceNode.state.exportCalls).toHaveLength(1);
    expect(successTarget.state.importCalls).toHaveLength(1);
    expect(failingTarget.state.importCalls).toHaveLength(1);
  });

  it("returns preflight configuration error for source-target endpoint overlap", async () => {
    const sourceNode = await startFakeNode();
    nodesToClose.push(sourceNode);

    const result = await runGraphql(runNodeSyncMutation, {
      input: {
        source: { nodeId: "source", baseUrl: `${sourceNode.baseUrl}/` },
        targets: [{ nodeId: "target-a", baseUrl: sourceNode.baseUrl.replace("http://", "") }],
        scope: ["AGENT_DEFINITION"],
        conflictPolicy: "SOURCE_WINS",
        tombstonePolicy: "SOURCE_DELETE_WINS",
      },
    });

    expect(result.data).toBeNull();
    expect(result.errors?.[0]?.message).toContain("Node sync preflight failed [configuration]");
  });
});
