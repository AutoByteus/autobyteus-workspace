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
import {
  createEpisodicCatalog,
  releaseProcessEpisodicCatalog,
  setProcessEpisodicCatalog,
  type EpisodicCatalog,
} from "../../../src/agent-episodic-catalog/services/episodic-catalog.js";

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

  /** As a composition root does (autobyteus-554): this memory folder's catalog, started and bound for the resolvers. */
  const composeCatalog = async (): Promise<EpisodicCatalog> => {
    const catalog = createEpisodicCatalog({
      memoryDir,
      journals: { readJournalSpans: async () => ({ kind: "none" }), onJournalChanged: () => () => undefined },
      tasks: { currentTaskOf: () => null },
    });
    setProcessEpisodicCatalog(catalog);
    catalog.start({ taskTitles: { taskTitleOf: async () => null } });
    await catalog.whenStartPassDone();
    return catalog;
  };

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
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      startedAt: "2026-05-31T00:00:00Z",
    });
  };

  it("lists the agents and one agent's episodes from the episodic catalog through BFF queries (autobyteus-554)", async () => {
    const alphaRun = `gql-memory-alpha-${Date.now()}`;
    const betaRun = `gql-memory-beta-${Date.now()}`;
    createdAgentRunIds.push(alphaRun, betaRun);
    await writeAgentMetadata(alphaRun, "gql-memory-alpha-agent");
    await writeAgentMetadata(betaRun, "gql-memory-beta-agent");
    touch(path.join(memoryDir, "agents", alphaRun, "raw_traces_active.jsonl"), 4000000000);
    touch(path.join(memoryDir, "agents", betaRun, "raw_traces_active.jsonl"), 4000000100);
    const catalog = await composeCatalog();
    try {
      const agentsData = await execGraphql<{
        listAgentsWithMemory: { entries: Array<{ agentDefinitionId: string; runCount: number }> };
      }>(`query ListAgentsWithMemory($search: String!) {
        listAgentsWithMemory(search: $search, page: 1, pageSize: 10) { entries { attribution agentDefinitionId displayName runCount latestMemoryAt } total }
      }`, { search: "gql-memory" });
      expect(agentsData.listAgentsWithMemory.entries.map((entry) => [entry.agentDefinitionId, entry.runCount]).sort()).toEqual([
        ["gql-memory-alpha-agent", 1],
        ["gql-memory-beta-agent", 1],
      ]);

      const episodesData = await execGraphql<{
        listAgentEpisodes: { entries: Array<{ runId: string; subject: { kind: string; runId: string }; place: unknown; memory: { hasRawTraces: boolean } }>; total: number };
      }>(`query ListAgentEpisodes($selector: AgentWithMemorySelectorInput!) {
        listAgentEpisodes(selector: $selector, page: 1, pageSize: 10) {
          entries { runId subject { kind runId agentDefinitionId } place { kind name } summary taskTitle workspaceRootPath lastActivityAt memory { hasRawTraces } }
          total
        }
      }`, { selector: { attribution: "DEFINITION", agentDefinitionId: "gql-memory-alpha-agent" } });
      expect(episodesData.listAgentEpisodes.total).toBe(1);
      expect(episodesData.listAgentEpisodes.entries[0]).toMatchObject({
        runId: alphaRun, subject: { kind: "AGENT", runId: alphaRun }, place: null, memory: { hasRawTraces: true },
      });
    } finally {
      releaseProcessEpisodicCatalog(catalog);
      await catalog.stop();
    }
  });

  it("answers the folder states without creating a folder, and an empty member list for an unknown team (autobyteus-554)", async () => {
    const data = await execGraphql<{
      agentSemanticMemoryFolder: { folderPath: string; exists: boolean; isEmpty: boolean };
      globalSemanticMemoryFolder: { folderPath: string; exists: boolean; isEmpty: boolean };
      listMemoryGroupMembers: unknown[];
    }>(`query {
      agentSemanticMemoryFolder(agentDefinitionId: "gql-memory-alpha-agent") { folderPath exists isEmpty }
      globalSemanticMemoryFolder { folderPath exists isEmpty }
      listMemoryGroupMembers(kind: TEAM, definitionId: "gql-memory-no-team") { kind id name shared memberCount }
    }`);
    expect(data.agentSemanticMemoryFolder).toEqual({ folderPath: path.join(memoryDir, "semantic", "gql-memory-alpha-agent"), exists: false, isEmpty: true });
    expect(data.globalSemanticMemoryFolder).toEqual({ folderPath: path.join(memoryDir, "semantic-global"), exists: false, isEmpty: true });
    expect(fs.existsSync(path.join(memoryDir, "semantic", "gql-memory-alpha-agent"))).toBe(false);
    expect(data.listMemoryGroupMembers).toEqual([]);
  });

  it("refuses the agents list when no composition root bound the catalog (EPISODIC_CATALOG_NOT_COMPOSED)", async () => {
    await expect(execGraphql(`query { listAgentsWithMemory(page: 1, pageSize: 10) { total } }`)).rejects.toThrow("EPISODIC_CATALOG_NOT_COMPOSED");
  });
});
