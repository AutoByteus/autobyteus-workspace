import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID,
  TeamAgentMemoryLayoutAppDataMigration,
} from "../../../src/app-data-migrations/migrations/team-agent-memory-layout-app-data-migration.js";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { MigrateNativeWorkingContextSnapshotsV5Migration } from "../../../src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.js";
import { RemoveExternalRuntimeWorkingContextSnapshotsMigration } from "../../../src/app-data-migrations/migrations/remove-external-runtime-working-context-snapshots-migration.js";
import { testAgentNode, testAgentTeamNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

type Candidate = Readonly<{
  teamRunId: string;
  agentRunId: string;
}>;

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("TeamAgentMemoryLayoutAppDataMigration", () => {
  let memoryDir: string;
  let layout: AgentMemoryLayout;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-agent-layout-migration-"));
    layout = new AgentMemoryLayout(memoryDir);
  });

  afterEach(async () => fs.rm(memoryDir, { recursive: true, force: true }));

  const writeCurrentRoot = async (
    rootTeamRunId: string,
    candidates: readonly Candidate[],
  ): Promise<void> => {
    const tree = testExecutionTree({
      rootTeamRunId,
      coordinatorAddress: "/lead",
      children: [
        testAgentNode("/lead", { agentRunId: `${rootTeamRunId}-lead` }),
        ...candidates.map((candidate, index) => {
          const teamAddress = `/team_${index}`;
          const agentAddress = `${teamAddress}/worker`;
          return testAgentTeamNode({
            address: teamAddress,
            coordinatorAddress: agentAddress,
            teamRunId: candidate.teamRunId,
            children: [testAgentNode(agentAddress, { agentRunId: candidate.agentRunId })],
          });
        }),
      ],
    });
    const rootDir = layout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
    await fs.mkdir(rootDir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(rootDir, "team_run_execution_tree.json"), JSON.stringify(tree)),
      fs.writeFile(path.join(rootDir, "task_delegation_records.json"), JSON.stringify({
        schemaVersion: 1,
        rootTeamRunId,
        records: [],
      })),
      fs.writeFile(path.join(rootDir, "team_communication_messages.json"), JSON.stringify({
        schemaVersion: 1,
        rootTeamRunId,
        messages: [],
      })),
    ]);
  };

  const pathsFor = (rootTeamRunId: string, candidate: Candidate) => ({
    source: layout.getTeamAgentRunDirPath({ rootTeamRunId, ancestorTeamRunIds: [] }, candidate.agentRunId),
    target: layout.getTeamAgentRunDirPath({
      rootTeamRunId,
      ancestorTeamRunIds: [candidate.teamRunId],
    }, candidate.agentRunId),
  });

  it("applies every deterministic physical-state disposition without merging or overwriting", async () => {
    const root = "state-table-root";
    const candidates = [
      { teamRunId: "move-team", agentRunId: "move-agent" },
      { teamRunId: "current-team", agentRunId: "current-agent" },
      { teamRunId: "empty-team", agentRunId: "empty-agent" },
      { teamRunId: "conflict-team", agentRunId: "conflict-agent" },
      { teamRunId: "residue-team", agentRunId: "residue-agent" },
      { teamRunId: "invalid-target-team", agentRunId: "invalid-target-agent" },
      { teamRunId: "invalid-source-team", agentRunId: "invalid-source-agent" },
    ] as const;
    await writeCurrentRoot(root, candidates);
    const [move, current, , conflict, residue, invalidTarget, invalidSource] =
      candidates.map((candidate) => pathsFor(root, candidate));

    await fs.mkdir(path.join(move.source, "context_files"), { recursive: true });
    await fs.writeFile(path.join(move.source, "raw_traces.jsonl"), "trace-one\n");
    await fs.writeFile(path.join(move.source, "context_files", "image.bin"), Buffer.from([0, 1, 2, 255]));
    await fs.mkdir(current.target, { recursive: true });
    await fs.writeFile(path.join(current.target, "current.txt"), "current");
    await fs.mkdir(conflict.source, { recursive: true });
    await fs.mkdir(conflict.target, { recursive: true });
    await fs.writeFile(path.join(conflict.source, "flat.txt"), "flat");
    await fs.writeFile(path.join(conflict.target, "canonical.txt"), "canonical");
    await fs.mkdir(path.dirname(residue.source), { recursive: true });
    await fs.writeFile(residue.source, "unsupported-flat-entry");
    await fs.mkdir(residue.target, { recursive: true });
    await fs.mkdir(invalidTarget.source, { recursive: true });
    await fs.mkdir(path.dirname(invalidTarget.target), { recursive: true });
    await fs.writeFile(invalidTarget.target, "unsupported-target-entry");
    await fs.writeFile(invalidSource.source, "unsupported-source-entry");

    const result = await new TeamAgentMemoryLayoutAppDataMigration(memoryDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary).toMatchObject({
      scannedCount: 7,
      migratedCount: 1,
      skippedCount: 4,
      failedCount: 2,
    });
    expect(result.summary.details.map((detail) => detail.itemId).sort()).toEqual([
      "FAILED_INVALID_TARGET",
      "FAILED_UNSUPPORTED_SOURCE",
      "MIGRATED",
      "PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING",
      "PRESERVED_SYNC_VISIBLE_RESIDUE_WARNING",
      "SKIPPED_ALREADY_CURRENT",
      "SKIPPED_UNMATERIALIZED",
    ]);
    expect(await exists(move.source)).toBe(false);
    await expect(fs.readFile(path.join(move.target, "raw_traces.jsonl"), "utf8"))
      .resolves.toBe("trace-one\n");
    await expect(fs.readFile(path.join(move.target, "context_files", "image.bin")))
      .resolves.toEqual(Buffer.from([0, 1, 2, 255]));
    await expect(fs.readFile(path.join(conflict.source, "flat.txt"), "utf8"))
      .resolves.toBe("flat");
    await expect(fs.readFile(path.join(conflict.target, "canonical.txt"), "utf8"))
      .resolves.toBe("canonical");
    await expect(fs.readFile(residue.source, "utf8")).resolves.toBe("unsupported-flat-entry");
    expect(await exists(invalidTarget.source)).toBe(true);
    await expect(fs.readFile(invalidTarget.target, "utf8")).resolves.toBe("unsupported-target-entry");
    await expect(fs.readFile(invalidSource.source, "utf8")).resolves.toBe("unsupported-source-entry");
  });

  it("is idempotent after a complete whole-directory rename", async () => {
    const root = "rerun-root";
    const candidate = { teamRunId: "nested-team", agentRunId: "nested-agent" };
    await writeCurrentRoot(root, [candidate]);
    const paths = pathsFor(root, candidate);
    await fs.mkdir(paths.source, { recursive: true });
    await fs.writeFile(path.join(paths.source, "memory.json"), '{"preserved":true}');
    const migration = new TeamAgentMemoryLayoutAppDataMigration(memoryDir);

    const first = await migration.execute();
    const second = await migration.execute();

    expect(first.status).toBe("SUCCEEDED");
    expect(first.summary).toMatchObject({ scannedCount: 1, migratedCount: 1, skippedCount: 0, failedCount: 0 });
    expect(second.status).toBe("SUCCEEDED");
    expect(second.summary).toMatchObject({ scannedCount: 1, migratedCount: 0, skippedCount: 1, failedCount: 0 });
    expect(second.summary.details).toEqual([
      expect.objectContaining({ itemId: "SKIPPED_ALREADY_CURRENT", status: "SKIPPED" }),
    ]);
    await expect(fs.readFile(path.join(paths.target, "memory.json"), "utf8"))
      .resolves.toBe('{"preserved":true}');
  });

  it("reports exact warning totals with at most five sorted relative-path examples", async () => {
    const root = "bounded-warning-root";
    const candidates = Array.from({ length: 7 }, (_, index) => ({
      teamRunId: `team-${index + 1}`,
      agentRunId: `agent-${7 - index}`,
    }));
    await writeCurrentRoot(root, candidates);
    for (const candidate of candidates) {
      const paths = pathsFor(root, candidate);
      await fs.mkdir(paths.source, { recursive: true });
      await fs.mkdir(paths.target, { recursive: true });
    }

    const result = await new TeamAgentMemoryLayoutAppDataMigration(memoryDir).execute();
    const detail = result.summary.details[0]!;

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary).toMatchObject({
      scannedCount: 7,
      migratedCount: 0,
      skippedCount: 7,
      failedCount: 0,
    });
    expect(result.summary.details).toHaveLength(1);
    expect(detail.itemId).toBe("PRESERVED_SYNC_VISIBLE_CONFLICT_WARNING");
    expect(detail.message).toContain("Count: 7.");
    for (const example of ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"]) {
      expect(detail.message).toContain(`agent_teams/${root}/${example}`);
    }
    expect(detail.message).not.toContain(`agent_teams/${root}/agent-6`);
    expect(detail.message).not.toContain(`agent_teams/${root}/agent-7`);
  });

  it("registers required-on-startup ANYTIME recovery after V1 and gates canonical snapshot migrations", () => {
    const migration = new TeamAgentMemoryLayoutAppDataMigration(memoryDir);
    const external = new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir);
    const native = new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir);
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const ids = definitions.map((definition) => definition.id);

    expect(migration).toMatchObject({
      id: TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID,
      requiredOnStartup: true,
      executionPolicy: "ANYTIME",
      prerequisiteMigrationIds: [TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID],
    });
    expect(ids.indexOf(TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID))
      .toBe(ids.indexOf(TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID) + 1);
    expect(external.prerequisiteMigrationIds).toEqual([TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID]);
    expect(native.prerequisiteMigrationIds).toEqual([TEAM_AGENT_MEMORY_LAYOUT_MIGRATION_ID]);
  });
});
