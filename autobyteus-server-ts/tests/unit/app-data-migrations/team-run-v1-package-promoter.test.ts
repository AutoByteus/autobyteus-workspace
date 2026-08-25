import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateTeamRunExecutionTreePayload as validateTeamRunExecutionTreeV1Payload } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-schema.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../src/services/team-communication/team-communication-v1-schema.js";
import { TeamRunV1PackagePromoter } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-v1-package-promoter.js";

const disposableDirectories: string[] = [];
const fixtureRoot = path.resolve(
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-001-persistent-only",
);
const rootTeamRunId = "team-run-root";

const readJson = async (name: string): Promise<unknown> =>
  JSON.parse(await fs.readFile(path.join(fixtureRoot, name), "utf8")) as unknown;

const packageFixture = async () => ({
  executionTree: validateTeamRunExecutionTreeV1Payload(
    await readJson("team_run_execution_tree.json"),
    rootTeamRunId,
  ),
  taskRecords: validateTaskDelegationRecordsV1Payload(
    await readJson("task_delegation_records.json"),
    rootTeamRunId,
  ),
  communicationMessages: validateTeamCommunicationMessagesV1Payload(
    await readJson("team_communication_messages.json"),
    rootTeamRunId,
  ),
});

const environment = async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "team-v1-promoter-"));
  disposableDirectories.push(directory);
  const rootDir = path.join(directory, "memory", "agent_teams", rootTeamRunId);
  const backupRoot = path.join(directory, "backups");
  await fs.mkdir(rootDir, { recursive: true });
  const metadataPath = path.join(rootDir, "team_run_metadata.json");
  const sourceTaskRecordsPath = path.join(rootDir, "legacy_tasks.json");
  const sourceCommunicationPath = path.join(rootDir, "legacy_messages.json");
  await Promise.all([
    fs.writeFile(metadataPath, '{"legacy":true}\n'),
    fs.copyFile(path.join(fixtureRoot, "task_delegation_records.json"), sourceTaskRecordsPath),
    fs.copyFile(path.join(fixtureRoot, "team_communication_messages.json"), sourceCommunicationPath),
  ]);
  return {
    rootDir,
    backupRoot,
    metadataPath,
    sourceTaskRecordsPath,
    sourceCommunicationPath,
  };
};

afterEach(async () => {
  await Promise.all(disposableDirectories.splice(0).map(
    (directory) => fs.rm(directory, { recursive: true, force: true }),
  ));
});

describe("TeamRunV1PackagePromoter", () => {
  it("commits a staged package, removes the marker last, and preserves a protected backup", async () => {
    const input = await environment();
    const result = await new TeamRunV1PackagePromoter(input.backupRoot).promote({
      ...input,
      rootTeamRunId,
      package: await packageFixture(),
    });

    expect(result).toMatchObject({ kind: "COMMITTED" });
    if (result.kind !== "COMMITTED") throw new Error(result.message);
    await expect(fs.access(input.metadataPath)).rejects.toThrow();
    await expect(fs.readFile(
      path.join(result.backupDirectory, "team_run_metadata.promoted.json"),
      "utf8",
    )).resolves.toBe('{"legacy":true}\n');
  });

  it("admits a complete independently valid current package after a promotion operation error", async () => {
    const input = await environment();
    await fs.rm(input.metadataPath);
    const result = await new TeamRunV1PackagePromoter(input.backupRoot).promote({
      ...input,
      rootTeamRunId,
      package: await packageFixture(),
    });

    expect(result).toMatchObject({
      kind: "COMMITTED_WITH_WARNING",
      message: expect.stringContaining("independently validates"),
    });
  });

  it("excludes a post-error incomplete package without claiming source preservation", async () => {
    const input = await environment();
    const valid = await packageFixture();
    const result = await new TeamRunV1PackagePromoter(input.backupRoot).promote({
      ...input,
      rootTeamRunId,
      package: {
        ...valid,
        communicationMessages: { ...valid.communicationMessages, messages: null } as never,
      },
    });

    expect(result).toMatchObject({
      kind: "EXCLUDED_PROMOTION_WARNING",
      markerPresent: true,
    });
    if (result.kind !== "EXCLUDED_PROMOTION_WARNING") {
      throw new Error("Expected excluded promotion warning");
    }
    expect(result.message).not.toContain("preserved");
    await expect(fs.readFile(input.metadataPath, "utf8")).resolves.toBe('{"legacy":true}\n');
  });
});
