import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTaskDelegationRecordsV1Payload } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamRunStatePackage } from "../../../src/run-history/services/team-run-state-package-validator.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../src/services/team-communication/team-communication-v1-schema.js";

const scenarioRoot = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1",
);

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;

describe("TeamRun V1 state package", () => {
  for (const scenario of [
    "case-001-persistent-only",
    "case-002-active-task-agent",
    "case-003-nested-task-team",
    "case-004-settled-task",
    "case-005-restart-interruption",
  ]) {
    it(`strictly validates ${scenario}`, async () => {
      const directory = path.join(scenarioRoot, scenario);
      const executionTree = validateTeamRunExecutionTreePayload(
        await readJson(path.join(directory, "team_run_execution_tree.json")),
      );
      const taskRecords = validateTaskDelegationRecordsV1Payload(
        await readJson(path.join(directory, "task_delegation_records.json")),
        executionTree.rootTeam.teamRunId,
      );
      const communicationMessages = validateTeamCommunicationMessagesV1Payload(
        await readJson(path.join(directory, "team_communication_messages.json")),
        executionTree.rootTeam.teamRunId,
      );
      expect(validateTeamRunStatePackage({
        executionTree,
        taskRecords,
        communicationMessages,
      }).index.rootTeamRunId).toBe(executionTree.rootTeam.teamRunId);
    });
  }

  it("rejects unknown fields instead of normalizing them", async () => {
    const payload = await readJson(path.join(
      scenarioRoot,
      "case-001-persistent-only/team_run_execution_tree.json",
    )) as Record<string, unknown>;
    expect(() => validateTeamRunExecutionTreePayload({ ...payload, revision: 1 }))
      .toThrow("unsupported or missing field");
  });
});
