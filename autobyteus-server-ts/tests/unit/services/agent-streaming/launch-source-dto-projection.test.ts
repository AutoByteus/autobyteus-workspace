import { describe, expect, it } from "vitest";
import { taskTeamExecutionDtoSchema } from "@autobyteus/team-stream-contracts";
import { taskExecutionDtoSchema } from "@autobyteus/collaboration-stream-contracts";
import { projectExecutionTree } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import { projectDelegatedAgentRun, projectDelegatedTeamRun } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { toDelegateTaskResult } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * REQ-007, D-5: a view's child rows carry each agent's complete launch and recorded source, read from the child's own file
 * (DS-8, autobyteus-461); REQ-008: delegate_task carries launch_notes.
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const fallback = { layer: "agent_default" as const, runtimeKind: "grok_build", llmModelIdentifier: "grok-4", reason: "runtime_unavailable" as const, detail: "no grok" };
/** The child's identity, as the tree's per-run data gives it (SR-056); the launch details come from its own file. */
const teamIdentity = { kind: "agent_team" as const, address: "/se", teamRunId: "se-run", coordinatorAgentRunId: "lead-run", delegatorAgentRunId: "pm", startedAt: "2026-10-12T00:00:00.000Z",
  members: [{ address: "/lead", agentRunId: "lead-run", agentDefinitionId: null }, { address: "/ie", agentRunId: "ie-run", agentDefinitionId: null }] };
const agentIdentity = { kind: "agent" as const, address: "/writer", agentRunId: "writer-run", agentDefinitionId: "writer", delegatorAgentRunId: "pm",
  startedAt: "2026-10-12T00:00:00.000Z" };
/** A delegated team's own file: its lead takes the team's launch; its engineer has its own, with its own source. */
const teamFile = (recorded: boolean) => {
  const base = testExecutionTree({ rootTeamRunId: "se-run", coordinatorAddress: "/lead", children: [
    testAgentNode("/lead", { agentRunId: "lead-run", workspaceRootPath: "/w" }),
    testAgentNode("/ie", { agentRunId: "ie-run", workspaceRootPath: "/w" }),
  ] });
  const team = base.rootTeam;
  return { ...base, rootTeam: { ...team, defaultLaunchConfiguration: { ...team.defaultLaunchConfiguration, ...claude },
    ...(recorded ? { defaultLaunchSource: { origin: "inherited" as const, fallbacks: [] } } : {}), members: [
    { ...team.members[0]!, launchConfiguration: { ...team.members[0]!.launchConfiguration, ...claude },
      ...(recorded ? { launchSource: { origin: "inherited" as const, fallbacks: [fallback] } } : {}) },
    { ...team.members[1]!, launchConfiguration: { ...team.members[1]!.launchConfiguration, ...claude, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" },
      ...(recorded ? { launchSource: { origin: "agent_default" as const, fallbacks: [] } } : {}) },
  ] } };
};

describe("launch values and sources in run views' child rows", () => {
  const teamView = (recorded: boolean) => projectExecutionTree(testExecutionTree({ rootTeamRunId: "root", coordinatorAddress: "/pm",
    children: [testAgentNode("/pm", { agentRunId: "pm" })] }), [projectDelegatedTeamRun(teamIdentity, teamFile(recorded) as never)]);

  it("the Team view (snake_case) carries each member's launch and whether it took the team's; sources only when recorded", () => {
    const dto = taskTeamExecutionDtoSchema.parse(teamView(true).root_team.task_executions[0]);
    expect(dto.source.members[0]).toMatchObject({ address: "/lead",
      launch_configuration: { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus" }, follows_team: true,
      launch_source: { origin: "inherited", fallbacks: [{ layer: "agent_default", runtime_kind: "grok_build", llm_model_identifier: "grok-4", reason: "runtime_unavailable", detail: "no grok" }] } });
    expect(dto.source.members.map((member) => [member.launch_configuration.llm_model_identifier, member.follows_team])).toEqual([["opus", true], ["sol-6.1", false]]);
    expect(dto.source.default_launch_source).toEqual({ origin: "inherited", fallbacks: [] });
    expect(JSON.stringify(teamView(false).root_team.task_executions[0])).not.toMatch(/launch_source/);
  });

  it("the Org and Agent views (camelCase) carry the same, and an agent child's source from its own run_metadata", () => {
    const projected = taskExecutionDtoSchema.parse(projectDelegatedTeamRun(teamIdentity, teamFile(true) as never));
    if (!("teamRunId" in projected) || projected.source.kind !== "agent_team") throw new Error("team child expected");
    expect(projected.source.members.map((member) => [member.launchConfiguration.llmModelIdentifier, member.followsTeam])).toEqual([["opus", true], ["sol-6.1", false]]);
    expect(projected.source.members[0]!.launchSource?.fallbacks[0]).toEqual(fallback);
    const agent = taskExecutionDtoSchema.parse(projectDelegatedAgentRun(agentIdentity, {
      runId: "writer-run", agentDefinitionId: "writer", address: "/writer", platformAgentRunId: null, ...claude,
      launchSource: { origin: "configured", fallbacks: [] } } as never));
    expect(agent).toMatchObject({ agentRunId: "writer-run", source: { kind: "agent", launchSource: { origin: "configured" } } });
  });
});

describe("delegate_task launch_notes", () => {
  it("serializes non-empty notes only, and the strict result schema accepts them", () => {
    const withNotes = toDelegateTaskResult({ delegated: true, copy: { kind: "team", teamRunId: "t", teamCoordinatorAgentRunId: "c" }, taskId: "x", launchNotes: ["ie: fell back"] });
    expect(withNotes).toEqual({ delegated: true, target_kind: "team", target_team_run_id: "t", target_team_coordinator_agent_run_id: "c", task_id: "x", launch_notes: ["ie: fell back"] });
    expect(DelegateTaskResultSchema.parse(withNotes)).toEqual(withNotes);
    const without = toDelegateTaskResult({ delegated: true, copy: { kind: "agent", agentRunId: "a" }, launchNotes: [] });
    expect(without).toEqual({ delegated: true, target_kind: "agent", target_agent_run_id: "a" });
    expect(() => DelegateTaskResultSchema.parse({ ...without, launch_notes: [] })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: false, message: "no", launch_notes: ["x"] })).toThrow();
  });
});
