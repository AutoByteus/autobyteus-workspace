import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTaskDelegationRecordsV1Payload } from "../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamRunStatePackage } from "../../../src/run-history/services/team-run-state-package-validator.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../src/services/team-communication/team-communication-v1-schema.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const historicalScenarioRoot = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1",
);

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;

const currentTree = () => testExecutionTree({
  rootTeamRunId: "team-run-current",
  rootTeamDefinitionId: "team-def-current",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", { agentRunId: "agent-run-coordinator" }),
    testAgentNode("/reviewer", { agentRunId: "agent-run-reviewer" }),
  ],
});

describe("TeamRun V2 state package", () => {
  it("strictly validates one native flat Team tree with exact Team sidecars", () => {
    const executionTree = validateTeamRunExecutionTreePayload(currentTree());
    const taskRecords = validateTaskDelegationRecordsV1Payload({
      schemaVersion: 1,
      rootTeamRunId: executionTree.rootTeam.teamRunId,
      records: [],
    }, executionTree.rootTeam.teamRunId);
    const communicationMessages = validateTeamCommunicationMessagesV1Payload({
      schemaVersion: 1,
      rootTeamRunId: executionTree.rootTeam.teamRunId,
      messages: [],
    }, executionTree.rootTeam.teamRunId);

    expect(validateTeamRunStatePackage({
      executionTree,
      taskRecords,
      communicationMessages,
    }).index.rootTeamRunId).toBe(executionTree.rootTeam.teamRunId);
  });

  it("rejects the retired V1 tree from the current reader", async () => {
    const payload = await readJson(path.join(
      historicalScenarioRoot,
      "case-001-persistent-only/team_run_execution_tree.json",
    ));
    expect(() => validateTeamRunExecutionTreePayload(payload))
      .toThrow("schemaVersion must be 2");
  });

  it("rejects unknown fields instead of normalizing them", () => {
    expect(() => validateTeamRunExecutionTreePayload({ ...currentTree(), revision: 1 }))
      .toThrow("unsupported or missing field");
  });
});
