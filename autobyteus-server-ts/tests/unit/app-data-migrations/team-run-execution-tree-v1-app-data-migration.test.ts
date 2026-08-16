import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamRunExecutionTreeV1AppDataMigration } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.js";
import {
  resetTeamRunV1PackageCatalog,
  TeamRunV1PackageCatalog,
} from "../../../src/run-history/services/team-run-v1-package-catalog.js";

const disposableDirectories: string[] = [];
const scenarios = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1",
);

const createEnvironment = async (): Promise<{ memoryDir: string; appDataDir: string }> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-v1-migration-"));
  disposableDirectories.push(root);
  const memoryDir = path.join(root, "memory");
  const appDataDir = path.join(root, "app-data");
  await Promise.all([fs.mkdir(memoryDir, { recursive: true }), fs.mkdir(appDataDir, { recursive: true })]);
  return { memoryDir, appDataDir };
};

const copyCurrentScenario = async (memoryDir: string, scenario: string): Promise<string> => {
  const source = path.join(scenarios, scenario);
  const tree = JSON.parse(await fs.readFile(path.join(source, "team_run_execution_tree.json"), "utf8")) as {
    rootTeam: { teamRunId: string };
  };
  const target = path.join(memoryDir, "agent_teams", tree.rootTeam.teamRunId);
  await fs.mkdir(target, { recursive: true });
  await Promise.all([
    "team_run_execution_tree.json",
    "task_delegation_records.json",
    "team_communication_messages.json",
  ].map((name) => fs.copyFile(path.join(source, name), path.join(target, name))));
  return tree.rootTeam.teamRunId;
};

const tokenStore = () => ({
  listExecutionIdentityMigrationEvidence: vi.fn(async () => []),
  migrateExecutionIdentity: vi.fn(async () => ({ migratedRows: 0, alreadyCurrent: true })),
  disconnectExecutionIdentityMigration: vi.fn(async () => undefined),
});

afterEach(async () => {
  await Promise.all(disposableDirectories.splice(0).map(async (directory) => {
    resetTeamRunV1PackageCatalog(path.join(directory, "memory"));
    await fs.rm(directory, { recursive: true, force: true });
  }));
});

describe("TeamRunExecutionTreeV1AppDataMigration", () => {
  it("keeps unresolved predecessor bytes retryable while admitting an independent valid root", async () => {
    const { memoryDir, appDataDir } = await createEnvironment();
    const validRoot = await copyCurrentScenario(memoryDir, "case-001-persistent-only");
    const invalidRoot = "root-unresolved";
    const invalidDirectory = path.join(memoryDir, "agent_teams", invalidRoot);
    await fs.mkdir(invalidDirectory, { recursive: true });
    const predecessorBytes = '{"schemaVersion":3,"broken":true}\n';
    await fs.writeFile(path.join(invalidDirectory, "team_run_metadata.json"), predecessorBytes, "utf8");

    const result = await new TeamRunExecutionTreeV1AppDataMigration(
      memoryDir,
      appDataDir,
      tokenStore(),
    ).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: `team-root:${validRoot}`, status: "SKIPPED" }),
      expect.objectContaining({ itemId: `team-root:${invalidRoot}`, status: "FAILED" }),
    ]));
    await expect(fs.readFile(path.join(invalidDirectory, "team_run_metadata.json"), "utf8"))
      .resolves.toBe(predecessorBytes);

    const catalog = new TeamRunV1PackageCatalog(memoryDir);
    await catalog.rebuild();
    expect(catalog.listAdmittedRootIds()).toEqual([validRoot]);
    expect(catalog.getDiagnostics().get(invalidRoot)).toContain("pending migration");
  });

  it("does not promote partial target residue without its protected predecessor backup", async () => {
    const { memoryDir, appDataDir } = await createEnvironment();
    const source = path.join(scenarios, "case-001-persistent-only");
    const rootTeamRunId = "root-partial";
    const rootDirectory = path.join(memoryDir, "agent_teams", rootTeamRunId);
    await fs.mkdir(rootDirectory, { recursive: true });
    const predecessorBytes = '{"schemaVersion":3,"still":"authoritative"}\n';
    await fs.writeFile(path.join(rootDirectory, "team_run_metadata.json"), predecessorBytes, "utf8");
    await fs.copyFile(path.join(source, "team_run_execution_tree.json"), path.join(rootDirectory, "team_run_execution_tree.json"));

    const result = await new TeamRunExecutionTreeV1AppDataMigration(
      memoryDir,
      appDataDir,
      tokenStore(),
    ).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary.details).toContainEqual(expect.objectContaining({
      itemId: `team-root:${rootTeamRunId}`,
      status: "FAILED",
      message: expect.stringContaining("no protected predecessor backup"),
    }));
    await expect(fs.readFile(path.join(rootDirectory, "team_run_metadata.json"), "utf8"))
      .resolves.toBe(predecessorBytes);
  });
});
