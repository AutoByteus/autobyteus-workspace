import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTeamRunStatePackage } from "../../../src/run-history/services/team-run-state-package-validator.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { getTeamRunExecutionTreePath } from "../../../src/run-history/store/team-run-execution-tree-path.js";
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
    const communicationMessages = Object.freeze({
      schemaVersion: 1 as const,
      rootTeamRunId: executionTree.rootTeam.teamRunId,
      messages: [],
    });

    expect(validateTeamRunStatePackage({
      executionTree,
      communicationMessages,
    }).index.rootTeamRunId).toBe(executionTree.rootTeam.teamRunId);
  });

  it("keeps a removed member's line with an outside endpoint, and still refuses a line with no own endpoint (CRR-004 F-4)", () => {
    const tree = currentTree();
    const executionTree = validateTeamRunExecutionTreePayload({
      ...tree,
      rootTeam: {
        ...tree.rootTeam,
        members: tree.rootTeam.members.filter((member) => member.address !== "/reviewer"),
        formerMembers: tree.rootTeam.members.filter((member) => member.address === "/reviewer"),
      },
    });
    const line = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string) => Object.freeze({
      messageId, senderAgentRunId, receiverAgentRunId, content: "hello", messageType: "message", referenceFiles: [],
      createdAt: "2026-11-22T00:00:00.000Z", counterpart: { address: "/other-unit", nodeId: null },
    });
    const pack = (messages: ReturnType<typeof line>[]) => ({
      executionTree,
      communicationMessages: { schemaVersion: 1 as const, rootTeamRunId: executionTree.rootTeam.teamRunId, messages },
    });
    // Another Org unit's agent messaged the reviewer before the reviewer was removed: both directions still load.
    expect(validateTeamRunStatePackage(pack([
      line("m-1", "agent-run-other-unit", "agent-run-reviewer"),
      line("m-2", "agent-run-reviewer", "agent-run-other-unit"),
    ])).index.formerMemberByRunId("agent-run-reviewer")).not.toBeNull();
    expect(() => validateTeamRunStatePackage(pack([line("m-3", "agent-run-other-unit", "agent-run-elsewhere")])))
      .toThrow("Message 'm-3' has no endpoint that is an agent of this run.");
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

/**
 * REQ-018: read tolerantly (AC-020), write exactly (AC-021). A team run holds its own parts only: an old
 * `taskExecutions` list is read as an unknown field and never written (autobyteus-461, E9).
 */
describe("TeamRun execution tree tolerant reading and exact writing", () => {
  const TOP_LEVEL_KEYS = ["applicationBinding", "archivedAt", "createdAt", "handoffs", "rootTeam"];
  const keys = (value: unknown) => Object.keys(value as object).sort();
  const oldTask = () => ({
    address: "/reviewer", agentRunId: "task-reviewer-run", platformAgentRunId: null, startedAt: "2026-09-01T00:00:00.000Z",
    source: { kind: "agent", agentDefinitionId: "reviewer", launchConfiguration: currentTree().rootTeam.defaultLaunchConfiguration },
  });
  /** A tree as earlier releases wrote it: a version number, `settledAt` and the list of hosted copies. */
  const releasedShape = () => {
    const tree = currentTree();
    return { ...tree, schemaVersion: 2, rootTeam: { ...tree.rootTeam, taskExecutions: [{ ...oldTask(), settledAt: null }] } };
  };

  it("loads trees with an unknown field, obsolete settledAt and lists, with and without schemaVersion, keeping only current fields", () => {
    for (const candidate of [{ ...currentTree(), revision: 7 }, releasedShape(), { ...releasedShape(), schemaVersion: undefined }]) {
      const tree = validateTeamRunExecutionTreePayload(candidate);
      expect(keys(tree)).toEqual(TOP_LEVEL_KEYS);
      expect(JSON.stringify(tree)).not.toMatch(/schemaVersion|settledAt|revision|taskExecutions/);
    }
  });

  it("rejects a tree missing a required field", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = currentTree();
    expect(() => validateTeamRunExecutionTreePayload(withoutCreatedAt)).toThrow("missing required field(s): createdAt");
  });

  it("writes the exact current shape and reads back the same tree", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-tree-exact-"));
    const dir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "team-run-current", ancestorTeamRunIds: [] });
    try {
      const store = new TeamRunExecutionTreeStore();
      await store.write(dir, { ...releasedShape(), extra: true } as never);
      const written = JSON.parse(await fs.readFile(getTeamRunExecutionTreePath(dir), "utf8")) as Record<string, any>;
      expect(keys(written)).toEqual(TOP_LEVEL_KEYS);
      expect(JSON.stringify(written)).not.toMatch(/schemaVersion|settledAt|taskExecutions|extra/);
      expect(await store.read(dir, "team-run-current")).toEqual(validateTeamRunExecutionTreePayload(currentTree()));
    } finally {
      await fs.rm(memoryDir, { recursive: true, force: true });
    }
  });
});
