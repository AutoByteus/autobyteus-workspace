import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { closedTaskExecutionsDigest } from "@autobyteus/collaboration-stream-contracts";
import { projectAgentCollaborationEvent, projectAgentCollaborationView } from "../../../../src/services/agent-streaming/agent-collaboration-view-projector.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 rule 3 (the frontend contract's acceptance check): an agent run's view of its delegated runs is in the
 * shapes the web received at base `827f1e68dc` (recorded there by `IMP-46-base-view-shapes.test.ts`, story 5.1's S1, S6
 * and S10): the snapshot's rows and closed set, `task_execution_started`, `task_executions_closed`, and the run list's
 * poll. Compared by their key paths (values differ by run); a launch's `llmConfig` is opaque.
 */
const base = JSON.parse(readFileSync(new URL("../../../fixtures/char-461/base-agent-view-shapes.json", import.meta.url), "utf8"));

const pathsOf = (value: unknown, prefix = ""): string[] => {
  if (Array.isArray(value)) return value.length ? [...new Set(value.flatMap((item) => pathsOf(item, `${prefix}[]`)))] : [`${prefix}[]`];
  if (value && typeof value === "object") {
    if (prefix.endsWith("llmConfig")) return [prefix];
    return Object.keys(value).flatMap((key) => [`${prefix}.${key}`, ...pathsOf((value as Record<string, unknown>)[key], `${prefix}.${key}`)]);
  }
  return [];
};
/** SR-083: the rows gain where they open (`openTarget`, `open_target`); every other key path is base's. */
const isOpenTargetPath = (path: string) => /\.(openTarget|open_target)(\.|$)/.test(path);
const same = (actual: unknown, expected: unknown) =>
  expect([...new Set(pathsOf(actual).filter((path) => !isOpenTargetPath(path)))].sort()).toEqual([...new Set(pathsOf(expected))].sort());

const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/w" };
const agentDto = projectDelegatedAgentRun({ kind: "agent", address: "/code_reviewer", agentRunId: "reviewer-run", agentDefinitionId: "code-reviewer",
  delegatorAgentRunId: "host", startedAt: "2026-11-01T00:00:00.000Z" }, { runId: "reviewer-run", agentDefinitionId: "code-reviewer", address: "/code_reviewer",
  platformAgentRunId: null, ...launch, launchSource: { origin: "configured", fallbacks: [] } } as never);
const teamFile = () => {
  const tree = testExecutionTree({ rootTeamRunId: "team-run", coordinatorAddress: "/lead", children: [
    testAgentNode("/lead", { agentRunId: "lead-run", workspaceRootPath: "/w" }), testAgentNode("/designer", { agentRunId: "designer-run", workspaceRootPath: "/w" })] });
  return { ...tree, handoffs: [{ from: "/lead", to: "/designer", rules: ["When UI work is needed."] }],
    rootTeam: { ...tree.rootTeam, defaultLaunchConfiguration: { ...tree.rootTeam.defaultLaunchConfiguration, ...launch },
      defaultLaunchSource: { origin: "configured", fallbacks: [] },
      members: tree.rootTeam.members.map((member) => ({ ...member, launchConfiguration: { ...member.launchConfiguration, ...launch } })) } };
};
const teamDto = projectDelegatedTeamRun({ kind: "agent_team", address: "/product_team", teamRunId: "team-run", coordinatorAgentRunId: "lead-run",
  delegatorAgentRunId: "host", startedAt: "2026-11-01T00:00:00.000Z",
  members: [{ address: "/lead", agentRunId: "lead-run", agentDefinitionId: "lead" }, { address: "/designer", agentRunId: "designer-run", agentDefinitionId: "designer" }] },
  teamFile() as never);
/** A row event in the run's view stream, as `ChildRowsFeed` publishes it; its record is read at send time. */
const sequenced = (changeSequence: number, kind: string) => ({ changeSequence, event: { kind } }) as never;
const host = { address: "/research_assistant", agentRunId: "host", agentDefinitionId: "research-assistant" };

describe("an agent run's view in base's shapes (rule 3)", () => {
  it("each delegated run's record: an agent run and a team run", () => {
    same(agentDto, base.snapshot.root_agent.execution_tree.taskExecutions[0]);
    same(teamDto, base.snapshot.root_agent.execution_tree.taskExecutions[1]);
  });

  it("the snapshot: its tree with the rows, its closed set and its statuses", () => {
    const snapshot = projectAgentCollaborationView({ hostRunId: "host", isActive: true, baseChangeSequence: 0, liveSequenceId: "live", lastMessageChangeSequence: 0,
      snapshot: { host, createdAt: "2026-11-01T00:00:00.000Z", statuses: [], inputStates: [] } as never,
      rows: { taskExecutions: [agentDto, teamDto], remoteTaskExecutions: [], closedTaskExecutions: [] },
      childStatuses: [{ agentRunId: "reviewer-run", memberAddress: "/code_reviewer", status: "running" }] });
    same(snapshot, base.snapshot);
  });

  it("task_execution_started for an agent run and a team run, placed in the root; task_executions_closed", () => {
    const started = [agentDto, teamDto].map((execution, index) => projectAgentCollaborationEvent("host", sequenced(index + 1, "task_execution_started"),
      { kind: "task_execution_started", host: { hostKind: "root", hostRunId: "host" }, execution })?.event);
    same(started, base.started);
    const closed = projectAgentCollaborationEvent("host", sequenced(3, "task_executions_closed"), { kind: "task_executions_closed", taskExecutions: [{ agentRunId: "reviewer-run" }] })?.event;
    same([closed], base.closed);
  });

  it("the run list's poll (agentRunCollaborationStatuses), in its GraphQL shape", () => {
    const baseAnswer = base.poll.map((answer: { runId: string; isActive: boolean; closedTaskExecutionsDigest: string; statuses: Array<{ execution: { agentRunId: string; memberAddress: string }; details: { status: string; recoverableBlock: unknown } }> }) => ({
      runId: answer.runId, isActive: answer.isActive, closedTaskExecutionsDigest: answer.closedTaskExecutionsDigest,
      statuses: answer.statuses.map((status) => ({ agentRunId: status.execution.agentRunId, memberAddress: status.execution.memberAddress,
        status: status.details.status, recoverableBlock: status.details.recoverableBlock })) }));
    same([{ runId: "host", isActive: true, closedTaskExecutionsDigest: closedTaskExecutionsDigest([]),
      statuses: [{ agentRunId: "reviewer-run", memberAddress: "/code_reviewer", status: "running", recoverableBlock: null }] }], baseAnswer);
  });
});
