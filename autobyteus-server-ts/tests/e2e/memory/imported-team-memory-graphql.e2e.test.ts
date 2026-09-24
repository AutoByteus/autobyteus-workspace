import "reflect-metadata";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { resetMemoryExplorerSourceServiceForTests } from "../../../src/agent-memory/services/memory-explorer-source-service.js";
import { resetLocalFileMemoryImportStoreForTests } from "../../../src/memory-sync/hub/local-file-memory-import-store.js";
import { resetMemoryImportCatalogServiceForTests } from "../../../src/memory-sync/hub/memory-import-catalog-service.js";
import { resetTeamRunHistoryCatalogState } from "../../../src/run-history/services/team-run-history-catalog-service.js";
import { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamRunHistoryIndexStore } from "../../../src/run-history/store/team-run-history-index-store.js";
import { TaskDelegationRecordsV1Store } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store } from "../../../src/services/team-communication/team-communication-v1-store.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const hashesOf = async (root: string): Promise<Map<string, string>> => {
  const hashes = new Map<string, string>();
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) hashes.set(path.relative(root, full),
        createHash("sha256").update(await fs.readFile(full)).digest("hex"));
    }
  };
  await visit(root);
  return hashes;
};

describe("imported Team memory GraphQL e2e", () => {
  const sourceNodeId = "imported-team-memory-e2e";
  const definitionId = "imported-team-definition";
  const rootIds = ["imported-team-run-1", "imported-team-run-2"];
  let appDataDir: string;
  let importRoot: string;
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;

  beforeAll(async () => {
    appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "imported-team-memory-graphql-"));
    appConfigProvider.resetForTests();
    const config = appConfigProvider.config;
    config.setCustomAppDataDir(appDataDir);
    resetLocalFileMemoryImportStoreForTests();
    resetMemoryImportCatalogServiceForTests();
    resetMemoryExplorerSourceServiceForTests();
    importRoot = path.join(config.getMemoryDir(), "imports", sourceNodeId);
    await fs.mkdir(importRoot, { recursive: true });
    await fs.writeFile(path.join(importRoot, "source-node.json"), JSON.stringify({
      schemaVersion: 1, sourceNodeId, displayName: "Imported Team E2E",
      firstImportedAt: "2026-09-01T00:00:00.000Z",
      lastImportedAt: "2026-09-01T00:00:00.000Z",
      lastKnownEndpoint: null, lastSyncStatus: null, lastError: null,
    }));
    const treeStore = new TeamRunExecutionTreeStore();
    const rows = [];
    for (const [index, rootId] of rootIds.entries()) {
      const agentRunId = `imported-member-${index + 1}`;
      const createdAt = `2026-09-0${index + 1}T00:00:00.000Z`;
      const teamDir = path.join(importRoot, "agent_teams", rootId);
      const tree = testExecutionTree({
        rootTeamRunId: rootId, rootTeamDefinitionId: definitionId,
        teamDefinitionName: "Imported Team", coordinatorAddress: "/lead",
        createdAt, children: [testAgentNode("/lead", { agentRunId, workspaceRootPath: "/workspace/imported" })],
      });
      expect((await treeStore.write(teamDir, tree)).outcome).toBe("committed");
      await new TaskDelegationRecordsV1Store().write(teamDir, { schemaVersion: 1, rootTeamRunId: rootId, records: [] });
      await new TeamCommunicationV1Store().write(teamDir, { schemaVersion: 1, rootTeamRunId: rootId, messages: [] });
      const memberDir = path.join(teamDir, agentRunId);
      await fs.mkdir(memberDir, { recursive: true });
      await fs.writeFile(path.join(memberDir, "raw_traces_active.jsonl"), "{}\n");
      rows.push({ teamRunId: rootId, teamDefinitionId: definitionId, teamDefinitionName: "Imported Team",
        workspaceRootPath: "/workspace/imported", summary: `imported run ${index + 1}`,
        createdAt, archivedAt: null, terminatedAt: null });
    }
    await new TeamRunHistoryIndexStore(importRoot).writeIndex(rows);
    resetTeamRunHistoryCatalogState(importRoot);
    const readiness = new RootRunPackageReadinessIndex(importRoot);
    await readiness.rebuild();
    expect(readiness.listAdmitted("agent_team")).toEqual(rootIds);

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    if (importRoot) {
      resetTeamRunHistoryCatalogState(importRoot);
      resetRootRunPackageReadinessIndex(importRoot);
    }
    resetMemoryExplorerSourceServiceForTests();
    resetMemoryImportCatalogServiceForTests();
    resetLocalFileMemoryImportStoreForTests();
    appConfigProvider.resetForTests();
    if (appDataDir) await fs.rm(appDataDir, { recursive: true, force: true });
  });

  const execute = async <T>(source: string): Promise<T> => {
    const result = await graphql({ schema, source, variableValues: { source: { type: "IMPORTED", sourceNodeId } } });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  it("uses one tree read per admitted root in each imported GraphQL request without changing any source file", async () => {
    const before = await hashesOf(importRoot);
    const read = vi.spyOn(TeamRunExecutionTreeStore.prototype, "read");
    try {
      const cards = await execute<{ listAgentTeamsWithMemory: { entries: Array<{
        teamDefinitionId: string; teamRunCount: number; memberMemoryCount: number;
      }> } }>(`query($source: MemoryExplorerSourceInput!) {
        listAgentTeamsWithMemory(source: $source, page: 1, pageSize: 10) {
          entries { teamDefinitionId teamRunCount memberMemoryCount memory { hasRawTraces } }
        }
      }`);
      expect(cards.listAgentTeamsWithMemory.entries).toEqual([
        expect.objectContaining({ teamDefinitionId: definitionId, teamRunCount: 2, memberMemoryCount: 1 }),
      ]);
      expect(read.mock.calls.map(([, id]) => id).sort()).toEqual(rootIds);
      expect(await hashesOf(importRoot)).toEqual(before);

      read.mockClear();
      const runs = await execute<{ listAgentTeamRunsWithMemory: { entries: Array<{
        teamRunId: string; summary: string | null; memberTargets: Array<{ agentRunId: string }>;
      }> } }>(`query($source: MemoryExplorerSourceInput!) {
        listAgentTeamRunsWithMemory(teamDefinitionId: "${definitionId}", source: $source, page: 1, pageSize: 10) {
          entries { teamRunId summary memberTargets { memberAddress agentRunId displayName } }
        }
      }`);
      expect(runs.listAgentTeamRunsWithMemory.entries.map((entry) => entry.teamRunId).sort()).toEqual(rootIds);
      expect(runs.listAgentTeamRunsWithMemory.entries.map((entry) => entry.memberTargets[0]?.agentRunId).sort())
        .toEqual(["imported-member-1", "imported-member-2"]);
      expect(read.mock.calls.map(([, id]) => id).sort()).toEqual(rootIds);
      expect(await hashesOf(importRoot)).toEqual(before);
    } finally {
      read.mockRestore();
    }
  });
});
