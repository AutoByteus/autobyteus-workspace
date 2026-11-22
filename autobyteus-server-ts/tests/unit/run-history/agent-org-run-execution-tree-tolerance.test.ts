import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgLaunchConfiguration, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * REQ-018 for AgentOrg trees: read tolerantly (AC-020), write exactly (AC-021). An organization run holds its own parts
 * only: an old `taskExecutions` list is read as an unknown field and never written (autobyteus-461, E9).
 */
const TOP_LEVEL_KEYS = ["applicationBinding", "archivedAt", "createdAt", "handoffs", "rootOrg", "subjectKind"];
const ROOT_ORG_KEYS = ["address", "defaultLaunchConfiguration", "members", "orgDefinitionId", "orgDefinitionName", "orgRunId"];
const keys = (value: unknown) => Object.keys(value as object).sort();

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

const oldTask = {
  address: "/director", agentRunId: "task-director-run", platformAgentRunId: null, startedAt: "2026-09-01T00:00:00.000Z",
  source: { kind: "agent", agentDefinitionId: "director", launchConfiguration: testOrgLaunchConfiguration("/workspace") },
};

/** A tree as earlier releases wrote it: `schemaVersion`, and the lists of hosted copies on the root and its team. */
const releasedOrg = () => {
  const tree = currentOrg();
  const [director, team] = tree.rootOrg.members;
  return { ...tree, schemaVersion: 1, rootOrg: { ...tree.rootOrg, taskExecutions: [{ ...oldTask, settledAt: null }],
    members: [director, { ...team, taskExecutions: [{ ...oldTask, address: "/team/lead", agentRunId: "team-task-run" }] }] } };
};

describe("AgentOrgRun execution tree tolerant reading and exact writing", () => {
  it("loads an earlier shape, unknown fields and a present schemaVersion, keeping only current fields", () => {
    for (const candidate of [releasedOrg(), { ...currentOrg(), schemaVersion: 2, revision: 3 }]) {
      const tree = validateAgentOrgRunExecutionTreePayload(candidate, "org-run");
      expect(keys(tree)).toEqual(TOP_LEVEL_KEYS);
      expect(keys(tree.rootOrg)).toEqual(ROOT_ORG_KEYS);
      expect(JSON.stringify(tree)).not.toMatch(/schemaVersion|settledAt|revision|taskExecutions/);
    }
  });

  it("rejects a missing required field and a wrong subject kind", () => {
    const { rootOrg: _rootOrg, ...withoutRoot } = currentOrg();
    expect(() => validateAgentOrgRunExecutionTreePayload(withoutRoot)).toThrow("missing required field(s): rootOrg");
    expect(() => validateAgentOrgRunExecutionTreePayload({ ...currentOrg(), subjectKind: "agent_team" }))
      .toThrow("subjectKind must be 'agent_org'");
  });

  it("reads a released tree as the exact current shape (no released-only field), the same tree as the current payload", () => {
    const parsed = validateAgentOrgRunExecutionTreePayload({ ...releasedOrg() }, "org-run");
    expect(keys(parsed as unknown as Record<string, unknown>)).toEqual(TOP_LEVEL_KEYS);
    expect(JSON.stringify(parsed)).not.toMatch(/schemaVersion|settledAt|taskExecutions/);
    expect(parsed).toEqual(validateAgentOrgRunExecutionTreePayload(currentOrg(), "org-run"));
  });
});
