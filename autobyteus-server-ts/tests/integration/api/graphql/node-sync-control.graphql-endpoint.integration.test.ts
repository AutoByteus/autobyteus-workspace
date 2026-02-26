import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerGraphql } from "../../../../src/api/graphql/index.js";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface FakeNodeState {
  healthCalls: number;
  exportCalls: Array<Record<string, unknown>>;
  importCalls: Array<Record<string, unknown>>;
}

interface FakeNodeOptions {
  healthStatus?: number;
  exportBundle?: Record<string, JsonValue>;
  importResult?: Record<string, JsonValue>;
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
                  watermark: "wm-endpoint",
                  entities: { prompt: [] },
                  tombstones: {},
                },
            },
          }),
        );
        return;
      }

      if (query.includes("importSyncBundle")) {
        state.importCalls.push(input);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            data: {
              importSyncBundle:
                options.importResult ??
                {
                  success: true,
                  appliedWatermark: "wm-endpoint",
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
    throw new Error("Failed to bind fake node server.");
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
        }
        targets {
          targetNodeId
          status
          failureCountTotal
        }
      }
      targetResults {
        targetNodeId
        status
      }
    }
  }
`;

describe("GraphQL /graphql endpoint integration: runNodeSync", () => {
  const nodesToClose: FakeNodeServer[] = [];
  let app = fastify();

  beforeEach(async () => {
    app = fastify();
    await registerGraphql(app);
  });

  afterEach(async () => {
    while (nodesToClose.length > 0) {
      const node = nodesToClose.pop();
      if (node) {
        await node.close();
      }
    }
    await app.close();
  });

  it("runs sync successfully through GraphQL endpoint transport", async () => {
    const sourceNode = await startFakeNode({
      exportBundle: {
        watermark: "wm-endpoint-success",
        entities: { prompt: [] },
        tombstones: {},
      },
    });
    const targetNode = await startFakeNode();
    nodesToClose.push(sourceNode, targetNode);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: runNodeSyncMutation,
        variables: {
          input: {
            source: { nodeId: "source", baseUrl: sourceNode.baseUrl },
            targets: [{ nodeId: "target", baseUrl: targetNode.baseUrl }],
            scope: ["PROMPT"],
            conflictPolicy: "SOURCE_WINS",
            tombstonePolicy: "SOURCE_DELETE_WINS",
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.errors).toBeUndefined();
    expect(body.data).toMatchObject({
      runNodeSync: {
        status: "success",
        sourceNodeId: "source",
        report: {
          sourceNodeId: "source",
          scope: ["PROMPT"],
          exportByEntity: [
            {
              entityType: "PROMPT",
              exportedCount: 0,
            },
          ],
          targets: [
            {
              targetNodeId: "target",
              status: "success",
              failureCountTotal: 0,
            },
          ],
        },
        targetResults: [{ targetNodeId: "target", status: "success" }],
      },
    });

    expect(sourceNode.state.exportCalls).toHaveLength(1);
    expect(targetNode.state.importCalls).toHaveLength(1);
    expect(sourceNode.state.exportCalls[0]).toMatchObject({
      scope: ["PROMPT"],
    });
    expect(targetNode.state.importCalls[0]).toMatchObject({
      scope: ["PROMPT"],
      conflictPolicy: "SOURCE_WINS",
      tombstonePolicy: "SOURCE_DELETE_WINS",
    });
  });

  it("returns GraphQL error when preflight health check fails", async () => {
    const sourceNode = await startFakeNode();
    const unhealthyTarget = await startFakeNode({ healthStatus: 503 });
    nodesToClose.push(sourceNode, unhealthyTarget);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: runNodeSyncMutation,
        variables: {
          input: {
            source: { nodeId: "source", baseUrl: sourceNode.baseUrl },
            targets: [{ nodeId: "target-bad", baseUrl: unhealthyTarget.baseUrl }],
            scope: ["PROMPT"],
            conflictPolicy: "SOURCE_WINS",
            tombstonePolicy: "SOURCE_DELETE_WINS",
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toBeNull();
    expect(String(body.errors?.[0]?.message ?? "")).toContain("Node sync preflight failed [health]");
    expect(sourceNode.state.exportCalls).toHaveLength(0);
    expect(unhealthyTarget.state.importCalls).toHaveLength(0);
  });
});
