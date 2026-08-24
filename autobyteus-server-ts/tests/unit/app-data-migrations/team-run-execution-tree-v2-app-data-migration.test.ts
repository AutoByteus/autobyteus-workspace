import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import {
  TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID,
  TeamRunExecutionTreeV2AppDataMigration,
  transformTeamRunExecutionTreeV1ToV2,
} from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v2-app-data-migration.js";
import type {
  AgentLaunchConfiguration,
  ConfiguredAgentExecution,
  ConfiguredTeamExecution,
  TeamRunExecutionTreeFileV1,
} from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-types.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import {
  resetTeamRunPackageCatalog,
  TeamRunPackageCatalog,
} from "../../../src/run-history/services/team-run-package-catalog.js";

const roots: string[] = [];
const address = (value: string) => assertAgentTeamAddress(value);
const launch = (runtimeKind: AgentLaunchConfiguration["runtimeKind"], model: string, workspaceRootPath: string): AgentLaunchConfiguration => ({
  runtimeKind,
  llmModelIdentifier: model,
  llmConfig: { reasoning_effort: runtimeKind === "CODEX" ? "medium" : "high" },
  autoExecuteTools: runtimeKind !== "CLAUDE",
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  workspaceRootPath,
});
const agent = (input: {
  address: string;
  runId: string;
  runtime: AgentLaunchConfiguration["runtimeKind"];
  model: string;
  workspace: string;
}): ConfiguredAgentExecution => ({
  address: address(input.address),
  agentDefinitionId: `definition-${input.runId}`,
  role: `role-${input.runId}`,
  description: `description-${input.runId}`,
  agentRunId: input.runId,
  platformAgentRunId: null,
  launchConfiguration: launch(input.runtime, input.model, input.workspace),
});

const v1Tree = (): TeamRunExecutionTreeFileV1 => {
  const teacher = agent({ address: "/teacher", runId: "teacher-run", runtime: "CODEX", model: "gpt-5.6-luna", workspace: "/classroom" });
  const studentOne = agent({ address: "/StudentStudyGroup/student_one", runId: "student-one-run", runtime: "CLAUDE", model: "claude-sonnet", workspace: "/study" });
  const studentTwo = agent({ address: "/StudentStudyGroup/student_two", runId: "student-two-run", runtime: "AUTOBYTEUS", model: "gpt-5.4", workspace: "/study-two" });
  const studyGroup: ConfiguredTeamExecution = {
    address: address("/StudentStudyGroup"),
    teamDefinitionId: "study-group-definition",
    role: "Study group",
    description: "Nested classroom students",
    teamRunId: "study-group-run",
    coordinatorAddress: address("/StudentStudyGroup/student_one"),
    members: [studentOne, studentTwo],
    taskExecutions: [],
  };
  return {
    schemaVersion: 1,
    createdAt: "2026-08-24T10:00:00.000Z",
    archivedAt: null,
    applicationBinding: null,
    handoffs: [],
    rootTeam: {
      teamDefinitionId: "nested-classroom-definition",
      teamDefinitionName: "Nested Classroom",
      teamRunId: "classroom-run",
      coordinatorAddress: address("/teacher"),
      members: [teacher, studyGroup],
      taskExecutions: [],
    },
  };
};

const makeMemory = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-v2-migration-"));
  roots.push(root);
  return path.join(root, "memory");
};
const writePackage = async (memoryDir: string, tree: unknown): Promise<string> => {
  const rootDir = path.join(memoryDir, "agent_teams", "classroom-run");
  await fs.mkdir(rootDir, { recursive: true });
  await fs.writeFile(path.join(rootDir, "team_run_execution_tree.json"), `${JSON.stringify(tree, null, 2)}\n`);
  await fs.writeFile(path.join(rootDir, "task_delegation_records.json"), `${JSON.stringify({ schemaVersion: 1, rootTeamRunId: "classroom-run", records: [] }, null, 2)}\n`);
  await fs.writeFile(path.join(rootDir, "team_communication_messages.json"), `${JSON.stringify({ schemaVersion: 1, rootTeamRunId: "classroom-run", messages: [] }, null, 2)}\n`);
  return rootDir;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (root) => {
    resetTeamRunPackageCatalog(path.join(root, "memory"));
    await fs.rm(root, { recursive: true, force: true });
  }));
});

describe("TeamRunExecutionTreeV2AppDataMigration", () => {
  it("is registered once immediately after its memory-layout prerequisite", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const index = definitions.findIndex(({ id }) => id === TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID);
    expect(index).toBeGreaterThan(0);
    expect(definitions.filter(({ id }) => id === TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID)).toHaveLength(1);
    expect(definitions[index]?.prerequisiteMigrationIds).toContain(definitions[index - 1]?.id);
  });

  it("deterministically derives each Team default from its direct coordinator and preserves exact Agent snapshots", () => {
    const source = v1Tree();
    const migrated = transformTeamRunExecutionTreeV1ToV2(source);

    expect(migrated).toMatchObject({
      schemaVersion: 2,
      rootTeam: {
        address: "/",
        defaultLaunchConfiguration: {
          runtimeKind: "codex_app_server",
          llmModelIdentifier: "gpt-5.6-luna",
          workspaceRootPath: "/classroom",
        },
        members: expect.arrayContaining([
          expect.objectContaining({
            address: "/teacher",
            launchConfiguration: expect.objectContaining({ runtimeKind: "codex_app_server" }),
          }),
          expect.objectContaining({
            address: "/StudentStudyGroup",
            defaultLaunchConfiguration: expect.objectContaining({
              runtimeKind: "claude_agent_sdk",
              llmModelIdentifier: "claude-sonnet",
              workspaceRootPath: "/study",
            }),
            members: [
              expect.objectContaining({ address: "/StudentStudyGroup/student_one" }),
              expect.objectContaining({
                address: "/StudentStudyGroup/student_two",
                launchConfiguration: expect.objectContaining({
                  runtimeKind: "autobyteus",
                  llmModelIdentifier: "gpt-5.4",
                  workspaceRootPath: "/study-two",
                }),
              }),
            ],
          }),
        ]),
      },
    });
    expect(source.schemaVersion).toBe(1);
    expect((source.rootTeam as Record<string, unknown>).defaultLaunchConfiguration).toBeUndefined();
  });

  it("migrates V1 once, is idempotent on V2, and becomes admissible only after catalog rebuild", async () => {
    const memoryDir = await makeMemory();
    const rootDir = await writePackage(memoryDir, v1Tree());
    const catalog = new TeamRunPackageCatalog(memoryDir);
    await catalog.rebuild();
    expect(catalog.listAdmittedRootIds()).toEqual([]);

    const migration = new TeamRunExecutionTreeV2AppDataMigration(memoryDir);
    await expect(migration.execute()).resolves.toMatchObject({
      status: "SUCCEEDED",
      summary: { scannedCount: 1, migratedCount: 1, failedCount: 0 },
    });
    const migratedBytes = await fs.readFile(path.join(rootDir, "team_run_execution_tree.json"), "utf8");
    expect(JSON.parse(migratedBytes)).toMatchObject({ schemaVersion: 2 });

    await catalog.rebuild();
    expect(catalog.listAdmittedRootIds()).toEqual(["classroom-run"]);
    await expect(migration.execute()).resolves.toMatchObject({
      status: "SUCCEEDED",
      summary: { scannedCount: 1, migratedCount: 0, skippedCount: 1, failedCount: 0 },
    });
    await expect(fs.readFile(path.join(rootDir, "team_run_execution_tree.json"), "utf8")).resolves.toBe(migratedBytes);
  });

  it("preserves invalid V1 bytes and excludes that root when no direct coordinator can define the Team default", async () => {
    const memoryDir = await makeMemory();
    const source = v1Tree();
    const invalid: TeamRunExecutionTreeFileV1 = {
      ...source,
      rootTeam: { ...source.rootTeam, coordinatorAddress: address("/missing") },
    };
    const rootDir = await writePackage(memoryDir, invalid);
    const filePath = path.join(rootDir, "team_run_execution_tree.json");
    const before = await fs.readFile(filePath, "utf8");

    await expect(new TeamRunExecutionTreeV2AppDataMigration(memoryDir).execute()).resolves.toMatchObject({
      status: "FAILED",
      summary: { scannedCount: 1, migratedCount: 0, failedCount: 1 },
      errorMessage: expect.stringContaining("could not be upgraded"),
    });
    await expect(fs.readFile(filePath, "utf8")).resolves.toBe(before);
    const catalog = new TeamRunPackageCatalog(memoryDir);
    await catalog.rebuild();
    expect(catalog.listAdmittedRootIds()).toEqual([]);
    expect(catalog.getDiagnostics().get("classroom-run")).toBeTruthy();
  });
});
