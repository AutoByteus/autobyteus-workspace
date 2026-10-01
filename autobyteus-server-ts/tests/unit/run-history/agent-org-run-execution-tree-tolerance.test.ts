import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { getAgentOrgRunExecutionTreePath } from "../../../src/run-history/store/agent-org-run-execution-tree-path.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/** REQ-018 for AgentOrg trees: read tolerantly (AC-020), write exactly (AC-021). */
const TOP_LEVEL_KEYS = ["applicationBinding", "archivedAt", "createdAt", "handoffs", "rootOrg", "subjectKind"];
const TASK_AGENT_KEYS = ["address", "agentRunId", "delegatorAgentRunId", "platformAgentRunId", "startedAt"];
const keys = (value: unknown) => Object.keys(value as object).sort();
const withoutDelegator = (list: readonly string[]) => list.filter((key) => key !== "delegatorAgentRunId");

const currentOrg = () => testAgentOrgExecutionTree({
  orgRunId: "org-run",
  members: [
    testOrgAgentNode("/director", "director-run"),
    testOrgTeamNode({
      address: "/team",
      teamRunId: "team-run",
      coordinatorAddress: "/team/lead",
      members: [testOrgAgentNode("/team/lead", "team-lead-run")],
    }),
  ],
});

const taskAgent = (extra: Record<string, unknown> = {}) => ({
  address: "/director", agentRunId: "task-director-run", platformAgentRunId: null,
  startedAt: "2026-09-01T00:00:00.000Z", ...extra,
});

const withRootTasks = (taskExecutions: readonly Record<string, unknown>[], extra: Record<string, unknown> = {}) => {
  const tree = currentOrg();
  return { ...tree, ...extra, rootOrg: { ...tree.rootOrg, taskExecutions } };
};

/** The released Org tree V1 shape: `schemaVersion: 1`, `settledAt`, no delegator. */
const releasedOrg = () => {
  const tree = withRootTasks([taskAgent({ settledAt: null })], { schemaVersion: 1 });
  const [director, team] = tree.rootOrg.members;
  return {
    ...tree,
    rootOrg: {
      ...tree.rootOrg,
      members: [director, { ...team, taskExecutions: [taskAgent({ address: "/team/lead", agentRunId: "team-task-run", settledAt: "2026-09-02T00:00:00.000Z" })] }],
    },
  };
};

describe("AgentOrgRun execution tree tolerant reading and exact writing", () => {
  it("loads the released V1 shape, unknown fields and a present schemaVersion, keeping only current fields", () => {
    for (const candidate of [
      releasedOrg(),
      { ...currentOrg(), schemaVersion: 2, revision: 3 },
      withRootTasks([taskAgent({ delegatorAgentRunId: "team-lead-run", extra: true })]),
    ]) {
      const tree = validateAgentOrgRunExecutionTreePayload(candidate, "org-run");
      expect(keys(tree)).toEqual(TOP_LEVEL_KEYS);
      expect(JSON.stringify(tree)).not.toMatch(/schemaVersion|settledAt|revision|extra/);
    }
    const released = validateAgentOrgRunExecutionTreePayload(releasedOrg(), "org-run");
    expect(released.rootOrg.taskExecutions.map(keys)).toEqual([withoutDelegator(TASK_AGENT_KEYS)]);
  });

  it("rejects a missing required field, a wrong subject kind and an unresolvable delegator", () => {
    const { rootOrg: _rootOrg, ...withoutRoot } = currentOrg();
    expect(() => validateAgentOrgRunExecutionTreePayload(withoutRoot)).toThrow("missing required field(s): rootOrg");
    expect(() => validateAgentOrgRunExecutionTreePayload({ ...currentOrg(), subjectKind: "agent_team" }))
      .toThrow("subjectKind must be 'agent_org'");
    expect(() => validateAgentOrgRunExecutionTreePayload(withRootTasks([taskAgent({ delegatorAgentRunId: "ghost-run" })])))
      .toThrow("delegator 'ghost-run' is not an AgentRun in this tree");
  });

  it("writes the exact current shape with the delegator on new children", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "org-tree-exact-"));
    try {
      const loaded = validateAgentOrgRunExecutionTreePayload(releasedOrg(), "org-run");
      const next = {
        ...loaded,
        schemaVersion: 2,
        rootOrg: {
          ...loaded.rootOrg,
          taskExecutions: [...loaded.rootOrg.taskExecutions, taskAgent({ agentRunId: "new-run", delegatorAgentRunId: "director-run" })],
        },
      } as never;
      await new AgentOrgRunExecutionTreeStore().write(dir, next);
      const written = JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(dir), "utf8")) as Record<string, any>;
      expect(keys(written)).toEqual(TOP_LEVEL_KEYS);
      expect(written.rootOrg.taskExecutions.map(keys)).toEqual([withoutDelegator(TASK_AGENT_KEYS), TASK_AGENT_KEYS]);
      expect(written.rootOrg.members[1].taskExecutions.map(keys)).toEqual([withoutDelegator(TASK_AGENT_KEYS)]);
      expect(JSON.stringify(written)).not.toMatch(/schemaVersion|settledAt/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
