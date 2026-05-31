import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

describe("Memory explorer GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let usingTemp = false;
  let memoryDir: string;
  const createdAgentRunIds: string[] = [];
  const config = appConfigProvider.config;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-explorer-"));
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
    for (const runId of createdAgentRunIds.splice(0)) {
      fs.rmSync(path.join(memoryDir, "agents", runId), { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (usingTemp) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const writeAgentMetadata = async (runId: string, agentDefinitionId: string) => {
    await new AgentRunMetadataStore(memoryDir).writeMetadata(runId, {
      runId,
      agentDefinitionId,
      workspaceRootPath: "/workspace/graphql-memory-test",
      memoryDir: path.join(memoryDir, "agents", runId),
      llmModelIdentifier: "model-a",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      startedAt: "2026-05-31T00:00:00Z",
    });
  };

  it("lists agents with memory and selected-agent runs through BFF queries", async () => {
    const alphaRun = `gql-memory-alpha-${Date.now()}`;
    const betaRun = `gql-memory-beta-${Date.now()}`;
    createdAgentRunIds.push(alphaRun, betaRun);
    await writeAgentMetadata(alphaRun, "gql-memory-alpha-agent");
    await writeAgentMetadata(betaRun, "gql-memory-beta-agent");
    touch(path.join(memoryDir, "agents", alphaRun, "raw_traces.jsonl"), 4000000000);
    touch(path.join(memoryDir, "agents", betaRun, "raw_traces.jsonl"), 4000000100);

    const agentsQuery = `
      query ListAgentsWithMemory($search: String!) {
        listAgentsWithMemory(search: $search, page: 1, pageSize: 10) {
          entries { attribution agentDefinitionId displayName runCount memory { hasRawTraces } }
          total
        }
      }
    `;
    const agentsData = await execGraphql<{
      listAgentsWithMemory: { entries: Array<{ agentDefinitionId: string; runCount: number }> };
    }>(agentsQuery, { search: "gql-memory" });

    expect(agentsData.listAgentsWithMemory.entries.map((entry) => entry.agentDefinitionId).sort()).toEqual([
      "gql-memory-alpha-agent",
      "gql-memory-beta-agent",
    ]);

    const runsQuery = `
      query ListAgentRunsWithMemory($selector: AgentWithMemorySelectorInput!) {
        listAgentRunsWithMemory(selector: $selector, page: 1, pageSize: 10) {
          entries { runId memory { hasRawTraces } }
          total
        }
      }
    `;
    const runsData = await execGraphql<{
      listAgentRunsWithMemory: { entries: Array<{ runId: string }>; total: number };
    }>(runsQuery, {
      selector: { attribution: "DEFINITION", agentDefinitionId: "gql-memory-alpha-agent" },
    });

    expect(runsData.listAgentRunsWithMemory.entries).toHaveLength(1);
    expect(runsData.listAgentRunsWithMemory.entries[0]?.runId).toBe(alphaRun);
  });
});
