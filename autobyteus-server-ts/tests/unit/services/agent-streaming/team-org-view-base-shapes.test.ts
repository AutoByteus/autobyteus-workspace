import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projectAgentOrgExecutionSnapshot } from "../../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectAgentOrgExecutionTree } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { projectExecutionTree, projectTeamExecutionViewSnapshot } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-461 rule 3 (CR-461-036): a Team run's and an Org run's views are in the shapes the web received at base
 * `827f1e68dc` (recorded there by `IMP-52-base-*-view-shapes.test.ts`), except their run trees: since SR-084 the runs they
 * delegated, with their closed set, are their trees' rows, whose acceptance is the tree's own tests. The stories:
 * - story 5.2: a Team member delegates an agent run (which delegates further) and a Team run, then a Task closes;
 * - story 5.3: an Org agent delegates a copy of its mounted team, the mounted team's member an agent run, then that Task closes.
 * Compared by key paths (values differ by run); a launch's `llmConfig` is opaque. The rows' own conversations and
 * commands are rule 2's (each run's own stream) and are not part of a delegator's view.
 */
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../fixtures/char-461/${name}`, import.meta.url), "utf8"));
const team = fixture("base-team-view-shapes.json");
const org = fixture("base-org-view-shapes.json");

const pathsOf = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) return value.length ? [...new Set(value.flatMap((item) => pathsOf(item, `${prefix}[]`)))] : [`${prefix}[]`];
  if (value && typeof value === "object") {
    if (prefix.endsWith("llmConfig") || prefix.endsWith("llm_config")) return [prefix];
    return Object.keys(value).flatMap((key) => [`${prefix}.${key}`, ...pathsOf((value as Record<string, unknown>)[key], `${prefix}.${key}`)]);
  }
  return [];
};
/**
 * SR-083, SR-084 (rule 3 as narrowed): the statuses leave the view (each run's own, by run ID), and so do its delegated
 * rows and closed set (its tree's). Every other key path is base's.
 */
const isExceptedPath = (path: string) => /\.(agent_statuses|taskExecutions|task_executions|closed_task_executions|remote_task_executions)(\.|\[|$)/.test(path);
const same = (actual: unknown, expected: unknown) =>
  expect([...new Set(pathsOf(JSON.parse(JSON.stringify(actual))).filter((path) => !isExceptedPath(path)))].sort()).toEqual([...new Set(pathsOf(expected).filter((path) => !isExceptedPath(path)))].sort());

describe("story 5.2: a Team run's view in base's shapes (rule 3)", () => {
  const tree = testExecutionTree({ rootTeamRunId: "team", coordinatorAddress: "/coordinator", children: [testAgentNode("/coordinator", { agentRunId: "coordinator" })] });

  it("the snapshot: its own parts", () => {
    const snapshot = projectTeamExecutionViewSnapshot("team", { snapshot: { tree, statuses: [], inputStates: [], leavingMembers: [] }, baseChangeSequence: 0,
      liveSequenceId: "live", lastMessageChangeSequence: 0 });
    same(snapshot, team.snapshot);
  });

  it("the run list's Team row: `rootTeam` with its own parts", () => {
    same(projectExecutionTree(tree).root_team, team.listRootTeam);
  });
});

describe("story 5.3: an Org run's view in base's shapes (rule 3)", () => {
  const tree = testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/director", "director"),
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead"), testOrgAgentNode("/target/writer", "configured-writer")] })] });
  it("the snapshot: its own parts", () => {
    // A live Org reports its own agents' statuses; its delegated runs' come from those runs (SR-083).
    const own = [["director", "/director"], ["configured-lead", "/target/lead"], ["configured-writer", "/target/writer"]].map(([agentRunId, memberAddress]) => ({
      execution: { agentRunId, memberAddress }, details: { status: "running", backgroundTasksRunning: 0, trigger: null, errorMessage: null, recoverableBlock: null } }));
    const snapshot = projectAgentOrgExecutionSnapshot({ orgRunId: "org", isActive: true, snapshot: { tree, statuses: own, inputStates: [] } as never,
      baseChangeSequence: 0, liveSequenceId: "live", lastMessageChangeSequence: 0 });
    same(snapshot, org.snapshot);
  });

  it("the run list's Org row: `org` with its own parts", () => {
    same({ org: projectAgentOrgExecutionTree(tree) }, org.listRow);
  });
});
