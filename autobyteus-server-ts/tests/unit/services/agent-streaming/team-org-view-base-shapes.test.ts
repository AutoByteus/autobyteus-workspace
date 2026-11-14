import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { projectAgentOrgExecutionEvent, projectAgentOrgExecutionSnapshot } from "../../../../src/services/agent-streaming/agent-org-execution-view-projector.js";
import { projectAgentOrgExecutionTree, projectDelegatedAgentRun, projectDelegatedTeamRun } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { projectExecutionTree, projectTeamExecutionViewSnapshot, projectTeamRowEvent, projectTeamTaskExecutions } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-461 rule 3 (CR-461-036): a Team run's and an Org run's views, and their run list rows, are in the shapes
 * the web received at base `827f1e68dc` (recorded there by `IMP-52-base-*-view-shapes.test.ts`):
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
 * SR-083 (rule 3 as narrowed): the rows gain where they open (`openTarget`, `open_target`), and the statuses leave the
 * view (each run's own, by run ID); CR-461-089: a Team copy's member no longer says it follows its Team (`followsTeam`,
 * `follows_team`: a Team-level choice is the Team's default only). Every other key path is base's.
 */
const isExceptedPath = (path: string) => /\.(openTarget|open_target|agent_statuses|followsTeam|follows_team)(\.|\[|$)/.test(path);
const same = (actual: unknown, expected: unknown) =>
  expect([...new Set(pathsOf(JSON.parse(JSON.stringify(actual))).filter((path) => !isExceptedPath(path)))].sort()).toEqual([...new Set(pathsOf(expected).filter((path) => !isExceptedPath(path)))].sort());

const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: true, workspaceRootPath: null };
const agentRow = (agentRunId: string, address: string, delegatorAgentRunId: string) => projectDelegatedAgentRun({ kind: "agent", address, agentRunId,
  agentDefinitionId: "code-reviewer", delegatorAgentRunId, startedAt: "2026-11-01T00:00:00.000Z" }, { runId: agentRunId, agentDefinitionId: "code-reviewer",
  address, platformAgentRunId: null, ...launch, launchSource: { origin: "configured", fallbacks: [] } } as never);
const teamRow = (teamRunId: string, address: string, delegatorAgentRunId: string, handoffs = [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }]) => {
  const tree = testExecutionTree({ rootTeamRunId: teamRunId, coordinatorAddress: "/lead", children: [
    testAgentNode("/lead", { agentRunId: `${teamRunId}-lead` }), testAgentNode("/designer", { agentRunId: `${teamRunId}-designer` })] });
  const file = { ...tree, handoffs,
    rootTeam: { ...tree.rootTeam, defaultLaunchConfiguration: { ...tree.rootTeam.defaultLaunchConfiguration, ...launch },
      defaultLaunchSource: { origin: "configured", fallbacks: [] },
      members: tree.rootTeam.members.map((member) => ({ ...member, launchConfiguration: { ...member.launchConfiguration, ...launch } })) } };
  return projectDelegatedTeamRun({ kind: "agent_team", address, teamRunId, coordinatorAgentRunId: `${teamRunId}-lead`, delegatorAgentRunId, startedAt: "2026-11-01T00:00:00.000Z",
    members: [{ address: "/lead", agentRunId: `${teamRunId}-lead`, agentDefinitionId: "lead" }, { address: "/designer", agentRunId: `${teamRunId}-designer`, agentDefinitionId: "designer" }] },
  file as never);
};
const sequenced = (changeSequence: number, kind: string) => ({ changeSequence, event: { kind } }) as never;
const root = (hostRunId: string) => ({ hostKind: "root" as const, hostRunId });

describe("story 5.2: a Team run's view in base's shapes (rule 3)", () => {
  const tree = testExecutionTree({ rootTeamRunId: "team", coordinatorAddress: "/coordinator", children: [testAgentNode("/coordinator", { agentRunId: "coordinator" })] });
  // As at base: the run the delegated agent delegated sits in the Team's root beside it (an agent run hosts nothing).
  const rows = [agentRow("reviewer", "/code_reviewer", "coordinator"), agentRow("designer", "/designer", "reviewer"), teamRow("product", "/product_team", "coordinator")];

  it("the snapshot: its tree with the rows, its closed set and its statuses", () => {
    const snapshot = projectTeamExecutionViewSnapshot("team", { snapshot: { tree, statuses: [], inputStates: [] }, baseChangeSequence: 0,
      liveSequenceId: "live", lastMessageChangeSequence: 0 }, { taskExecutions: rows, remoteTaskExecutions: [], closedTaskExecutions: [] });
    same(snapshot, team.snapshot);
  });

  it("TASK_EXECUTION_STARTED for agent runs and a Team run; TASK_EXECUTIONS_CLOSED", () => {
    same(rows.map((execution, index) => projectTeamRowEvent({ kind: "task_execution_started", host: root("team"), execution }, index + 1)), team.started);
    same([projectTeamRowEvent({ kind: "task_executions_closed", taskExecutions: [{ agentRunId: "reviewer" }, { agentRunId: "designer" }] }, 4)], team.closed);
  });

  it("the run list's Team row after Task A closed: `rootTeam` with its open rows (`withTeamRows`)", () => {
    same({ ...projectExecutionTree(tree).root_team, task_executions: projectTeamTaskExecutions([rows[2]!]) }, team.listRootTeam);
  });
});

describe("story 5.3: an Org run's view in base's shapes (rule 3)", () => {
  const tree = testAgentOrgExecutionTree({ orgRunId: "org", members: [testOrgAgentNode("/director", "director"),
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead"), testOrgAgentNode("/target/writer", "configured-writer")] })] });
  // As at base: every new run an Org delegates sits in its root, the mounted team's member's too.
  // The copy as base made it, with the mounted team's handoffs (none in this Org).
  const rows = [teamRow("copy", "/target", "director", []), agentRow("notes", "/code_reviewer", "configured-lead")];

  it("the snapshot: its tree with the rows in its root, its closed set and its statuses", () => {
    // A live Org reports its own agents' statuses; its delegated runs' come from those runs (SR-083).
    const own = [["director", "/director"], ["configured-lead", "/target/lead"], ["configured-writer", "/target/writer"]].map(([agentRunId, memberAddress]) => ({
      execution: { agentRunId, memberAddress }, details: { status: "running", trigger: null, errorMessage: null, recoverableBlock: null } }));
    const snapshot = projectAgentOrgExecutionSnapshot({ orgRunId: "org", isActive: true, snapshot: { tree, statuses: own, inputStates: [] } as never,
      baseChangeSequence: 0, liveSequenceId: "live", lastMessageChangeSequence: 0,
      rows: { taskExecutions: rows, remoteTaskExecutions: [], closedTaskExecutions: [] } });
    same(snapshot, org.snapshot);
  });

  it("task_execution_started, both placed in the root; task_executions_closed", () => {
    same(rows.map((execution, index) => projectAgentOrgExecutionEvent("org", sequenced(index + 1, "task_execution_started"),
      { kind: "task_execution_started", host: root("org"), execution })), org.started);
    same([projectAgentOrgExecutionEvent("org", sequenced(3, "task_executions_closed"), { kind: "task_executions_closed", taskExecutions: [{ agentRunId: "notes" }] })], org.closed);
  });

  it("the run list's Org row: `org` with its rows in its root, and `closed_task_executions`", () => {
    same({ org: projectAgentOrgExecutionTree(tree, rows), closed_task_executions: [{ agentRunId: "notes" }] }, org.listRow);
  });
});
