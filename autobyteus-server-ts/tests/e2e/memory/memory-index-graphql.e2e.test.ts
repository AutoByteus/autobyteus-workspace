import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
};

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

describe("Memory index GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let usingTemp = false;
  let memoryDir: string;
  const createdAgentIds: string[] = [];
  const config = appConfigProvider.config;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-index-"));
    if (!config.isInitialized()) {
      config.setCustomAppDataDir(tempRoot);
      usingTemp = true;
    }
    memoryDir = config.getMemoryDir();

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    for (const agentId of createdAgentIds.splice(0)) {
      const dir = path.join(memoryDir, "agents", agentId);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (usingTemp) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("lists memory snapshots ordered by newest", async () => {
    const agentA = "agent-alpha";
    const agentB = "agent-beta";
    createdAgentIds.push(agentA, agentB);

    touch(path.join(memoryDir, "agents", agentA, "raw_traces.jsonl"), 1000);
    touch(path.join(memoryDir, "agents", agentB, "raw_traces.jsonl"), 2000);

    const query = `
      query ListRunMemorySnapshots($page: Int!, $pageSize: Int!) {
        listRunMemorySnapshots(page: $page, pageSize: $pageSize) {
          entries {
            runId
            hasRawTraces
            lastUpdatedAt
          }
          total
          page
          pageSize
          totalPages
        }
      }
    `;

    const data = await execGraphql<{ listRunMemorySnapshots: { entries: Array<{ runId: string }> } }>(
      query,
      { page: 1, pageSize: 10 },
    );

    expect(data.listRunMemorySnapshots.entries[0]?.runId).toBe(agentB);
    expect(data.listRunMemorySnapshots.entries[1]?.runId).toBe(agentA);
  });

  it("filters by search", async () => {
    const agentA = "search-alpha";
    const agentB = "search-beta";
    createdAgentIds.push(agentA, agentB);

    touch(path.join(memoryDir, "agents", agentA, "raw_traces.jsonl"), 1000);
    touch(path.join(memoryDir, "agents", agentB, "raw_traces.jsonl"), 2000);

    const query = `
      query ListRunMemorySnapshots($search: String) {
        listRunMemorySnapshots(search: $search) {
          entries { runId }
          total
        }
      }
    `;

    const data = await execGraphql<{ listRunMemorySnapshots: { entries: Array<{ runId: string }>; total: number } }>(
      query,
      { search: "alpha" },
    );

    expect(data.listRunMemorySnapshots.entries).toHaveLength(1);
    expect(data.listRunMemorySnapshots.entries[0]?.runId).toBe(agentA);
    expect(data.listRunMemorySnapshots.total).toBe(1);
  });
});
