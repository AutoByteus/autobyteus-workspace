import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTeamRunStatePackage } from "../../../src/run-history/services/team-run-state-package-validator.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
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

describe("TeamRun current (tree + messages) state package", () => {
  it("validates one native flat Team tree with exact Team sidecars", () => {
    const executionTree = validateTeamRunExecutionTreePayload(currentTree());
    const communicationMessages = validateTeamCommunicationMessagesV1Payload({
      schemaVersion: 1,
      rootTeamRunId: executionTree.rootTeam.teamRunId,
      messages: [],
    }, executionTree.rootTeam.teamRunId);

    expect(validateTeamRunStatePackage({
      executionTree,
      communicationMessages,
    }).index.rootTeamRunId).toBe(executionTree.rootTeam.teamRunId);
  });

  it("still rejects a preserved released V1 tree without any version check (retired runtime kinds)", async () => {
    const payload = await readJson(path.join(
      historicalScenarioRoot,
      "case-001-persistent-only/team_run_execution_tree.json",
    ));
    // Structural recognition: the V1 root lacks current required fields…
    expect(() => validateTeamRunExecutionTreePayload(payload)).toThrow("rootTeam is missing required field(s)");
    // …and every V1 launch configuration carries a retired runtime kind the current enum rejects.
    const tree = currentTree();
    for (const runtimeKind of ["AUTOBYTEUS", "CLAUDE", "CODEX"]) {
      expect(() => validateTeamRunExecutionTreePayload({
        ...tree,
        rootTeam: { ...tree.rootTeam, defaultLaunchConfiguration: { ...tree.rootTeam.defaultLaunchConfiguration, runtimeKind } },
      })).toThrow("runtimeKind is unsupported");
    }
  });
});

/** REQ-018: read tolerantly (AC-020), write exactly (AC-021). */
describe("TeamRun execution tree tolerant reading and exact writing", () => {
  const TOP_LEVEL_KEYS = ["applicationBinding", "archivedAt", "createdAt", "handoffs", "rootTeam"];
  const TASK_AGENT_KEYS = ["address", "agentRunId", "delegatorAgentRunId", "platformAgentRunId", "startedAt"];
  const TASK_TEAM_KEYS = ["address", "delegatorAgentRunId", "members", "startedAt", "taskExecutions", "teamRunId"];
  const keys = (value: unknown) => Object.keys(value as object).sort();

  const withTasks = (taskExecutions: readonly Record<string, unknown>[], extra: Record<string, unknown> = {}) => {
    const tree = currentTree();
    return { ...tree, ...extra, rootTeam: { ...tree.rootTeam, taskExecutions } };
  };
  const taskAgent = (extra: Record<string, unknown> = {}) => ({
    address: "/reviewer", agentRunId: "task-reviewer-run", platformAgentRunId: null,
    startedAt: "2026-09-01T00:00:00.000Z", ...extra,
  });
  const taskTeam = (extra: Record<string, unknown> = {}) => ({
    address: "/reviewer", teamRunId: "task-team-run", startedAt: "2026-09-01T00:00:00.000Z",
    members: [{ address: "/reviewer/lead", agentRunId: "task-team-lead-run", platformAgentRunId: null, legacyNote: "x" }],
    taskExecutions: [], ...extra,
  });
  /** The released (pre-change) shape: a version number and `settledAt`, no delegator. */
  const releasedShape = () => withTasks(
    [taskAgent({ settledAt: null }), taskTeam({ settledAt: "2026-09-02T00:00:00.000Z" })],
    { schemaVersion: 2 },
  );

  it("loads trees with an unknown field, obsolete settledAt, with and without schemaVersion, keeping only current fields", () => {
    const candidates = [
      { ...currentTree(), revision: 7 },
      releasedShape(),
      withTasks([taskAgent({ delegatorAgentRunId: "agent-run-coordinator" })], { schemaVersion: 3 }),
      withTasks([taskAgent({ delegatorAgentRunId: "agent-run-coordinator" })]),
    ];
    for (const candidate of candidates) {
      const tree = validateTeamRunExecutionTreePayload(candidate);
      expect(keys(tree)).toEqual(TOP_LEVEL_KEYS);
      expect(JSON.stringify(tree)).not.toMatch(/schemaVersion|settledAt|revision|legacyNote/);
    }
    const released = validateTeamRunExecutionTreePayload(releasedShape());
    // Children recorded before the delegator was stored stay without one.
    expect(released.rootTeam.taskExecutions.map(keys)).toEqual([
      TASK_AGENT_KEYS.filter((key) => key !== "delegatorAgentRunId"),
      TASK_TEAM_KEYS.filter((key) => key !== "delegatorAgentRunId"),
    ]);
  });

  it("rejects a tree missing a required field or naming an unresolvable delegator", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = currentTree();
    expect(() => validateTeamRunExecutionTreePayload(withoutCreatedAt)).toThrow("missing required field(s): createdAt");
    const { startedAt: _startedAt, ...taskWithoutStart } = taskAgent();
    expect(() => validateTeamRunExecutionTreePayload(withTasks([taskWithoutStart])))
      .toThrow("missing required field(s): startedAt");
    expect(() => validateTeamRunExecutionTreePayload(withTasks([taskAgent({ delegatorAgentRunId: "unknown-run" })])))
      .toThrow("delegator 'unknown-run' is not an AgentRun in this tree");
    expect(() => validateTeamRunExecutionTreePayload(withTasks([taskAgent({ delegatorAgentRunId: "" })])))
      .toThrow("delegatorAgentRunId must be a non-empty trimmed string");
    // A task-Team member AgentRun is a valid delegator.
    expect(validateTeamRunExecutionTreePayload(withTasks([
      taskTeam(), taskAgent({ agentRunId: "nested-run", delegatorAgentRunId: "task-team-lead-run" }),
    ])).rootTeam.taskExecutions).toHaveLength(2);
  });

  it("writes the exact current shape: no schemaVersion, no settledAt, the delegator on new children", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "team-tree-exact-"));
    try {
      const store = new TeamRunExecutionTreeStore();
      const loaded = validateTeamRunExecutionTreePayload(releasedShape());
      const withNewChild = {
        ...loaded,
        rootTeam: {
          ...loaded.rootTeam,
          taskExecutions: [
            ...loaded.rootTeam.taskExecutions,
            taskAgent({ agentRunId: "new-run", delegatorAgentRunId: "agent-run-coordinator" }),
          ],
        },
      } as never;
      await store.write(dir, withNewChild);
      const written = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(dir), "utf8")) as Record<string, any>;
      expect(keys(written)).toEqual(TOP_LEVEL_KEYS);
      expect(written.rootTeam.taskExecutions.map(keys)).toEqual([
        TASK_AGENT_KEYS.filter((key) => key !== "delegatorAgentRunId"),
        TASK_TEAM_KEYS.filter((key) => key !== "delegatorAgentRunId"),
        TASK_AGENT_KEYS,
      ]);
      expect(written.rootTeam.taskExecutions[1].members.map(keys)).toEqual([["address", "agentRunId", "platformAgentRunId"]]);
      // Even a caller that passes stray fields cannot write them.
      await store.write(dir, { ...(withNewChild as object), schemaVersion: 3, extra: true } as never);
      expect(keys(JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(dir), "utf8")))).toEqual(TOP_LEVEL_KEYS);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
