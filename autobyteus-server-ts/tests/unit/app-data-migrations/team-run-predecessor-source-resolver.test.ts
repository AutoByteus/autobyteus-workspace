import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-constants.js";
import { TeamRunPredecessorSourceResolver } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-predecessor-source-resolver.js";

const disposableDirectories: string[] = [];

const createEnvironment = async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "predecessor-source-resolver-"));
  disposableDirectories.push(directory);
  const rootTeamRunId = "root-one";
  const rootDir = path.join(directory, "memory", "agent_teams", rootTeamRunId);
  const backupRoot = path.join(directory, "backups");
  await fs.mkdir(rootDir, { recursive: true });
  return { rootTeamRunId, rootDir, backupRoot };
};

const writeProtectedAttempt = async (input: {
  backupRoot: string;
  rootTeamRunId: string;
  rootDir: string;
  attempt: string;
  manifest?: Record<string, unknown>;
}): Promise<string> => {
  const directory = path.join(input.backupRoot, input.rootTeamRunId, input.attempt);
  await fs.mkdir(directory, { recursive: true });
  if (input.manifest) {
    await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(input.manifest));
  }
  await fs.writeFile(path.join(directory, "task_delegation_records.json"), "{\"legacy\":true}\n");
  await fs.writeFile(path.join(directory, "team_communication_messages.json"), "[]\n");
  return directory;
};

const validManifest = (rootTeamRunId: string, rootDir: string) => ({
  migrationId: TEAM_RUN_EXECUTION_TREE_V1_MIGRATION_ID,
  rootTeamRunId,
  sourceRootDir: rootDir,
  backedUpAt: "2026-08-16T00:00:00.000Z",
});

afterEach(async () => {
  await Promise.all(disposableDirectories.splice(0).map(
    (directory) => fs.rm(directory, { recursive: true, force: true }),
  ));
});

describe("TeamRunPredecessorSourceResolver", () => {
  it("returns live predecessor paths when no V1 execution-tree target exists", async () => {
    const environment = await createEnvironment();

    await expect(new TeamRunPredecessorSourceResolver(environment.backupRoot).resolve(
      environment.rootTeamRunId,
      environment.rootDir,
    )).resolves.toEqual({
      provenance: "LIVE",
      taskRecordsPath: path.join(environment.rootDir, "task_delegation_records.json"),
      communicationPath: path.join(environment.rootDir, "team_communication_messages.json"),
      backupDirectory: null,
    });
  });

  it("returns the newest valid protected predecessor paths for an interrupted promotion", async () => {
    const environment = await createEnvironment();
    await fs.writeFile(path.join(environment.rootDir, "team_run_execution_tree.json"), "{}\n");
    await writeProtectedAttempt({
      ...environment,
      attempt: "2026-08-15T00-00-00-000Z",
      manifest: validManifest(environment.rootTeamRunId, environment.rootDir),
    });
    const newest = await writeProtectedAttempt({
      ...environment,
      attempt: "2026-08-16T00-00-00-000Z",
      manifest: validManifest(environment.rootTeamRunId, environment.rootDir),
    });

    await expect(new TeamRunPredecessorSourceResolver(environment.backupRoot).resolve(
      environment.rootTeamRunId,
      environment.rootDir,
    )).resolves.toEqual({
      provenance: "PROTECTED_V1_BACKUP",
      taskRecordsPath: path.join(newest, "task_delegation_records.json"),
      communicationPath: path.join(newest, "team_communication_messages.json"),
      backupDirectory: newest,
    });
  });

  it("skips an unfinished backup directory with no manifest", async () => {
    const environment = await createEnvironment();
    await fs.writeFile(path.join(environment.rootDir, "team_run_execution_tree.json"), "{}\n");
    const valid = await writeProtectedAttempt({
      ...environment,
      attempt: "2026-08-15T00-00-00-000Z",
      manifest: validManifest(environment.rootTeamRunId, environment.rootDir),
    });
    await writeProtectedAttempt({
      ...environment,
      attempt: "2026-08-16T00-00-00-000Z",
    });

    const result = await new TeamRunPredecessorSourceResolver(environment.backupRoot).resolve(
      environment.rootTeamRunId,
      environment.rootDir,
    );

    expect(result.backupDirectory).toBe(valid);
  });

  it("rejects mismatched or absent protected evidence", async () => {
    const environment = await createEnvironment();
    await fs.writeFile(path.join(environment.rootDir, "team_run_execution_tree.json"), "{}\n");
    const resolver = new TeamRunPredecessorSourceResolver(environment.backupRoot);
    await expect(resolver.resolve(environment.rootTeamRunId, environment.rootDir))
      .rejects.toThrow("no protected predecessor backup");

    await writeProtectedAttempt({
      ...environment,
      attempt: "2026-08-16T00-00-00-000Z",
      manifest: validManifest("different-root", environment.rootDir),
    });
    await expect(resolver.resolve(environment.rootTeamRunId, environment.rootDir))
      .rejects.toThrow("does not match");
  });
});
