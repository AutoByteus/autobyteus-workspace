import { describe, expect, it } from "vitest";
import { taskTeamExecutionDtoSchema, teamMemberLaunchConfiguration } from "@autobyteus/team-stream-contracts";
import { collaborationMemberLaunchConfiguration, taskExecutionDtoSchema } from "@autobyteus/collaboration-stream-contracts";
import { projectExecutionTree } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import { projectCollaborationTaskExecution } from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { toDelegateTaskResult } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { TaskTeamExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** REQ-007: run views carry each recorded member launch and source; REQ-008: delegate_task carries launch_notes. */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" };
const fallback = { layer: "agent_default" as const, runtimeKind: "grok_build", llmModelIdentifier: "grok-4", reason: "runtime_unavailable" as const, detail: "no grok" };
const copy: TaskTeamExecution = {
  address: "/se" as never, teamRunId: "se-copy", startedAt: "2026-10-12T00:00:00.000Z", taskExecutions: [], delegatorAgentRunId: "pm",
  members: [
    { address: "/se/lead" as never, agentRunId: "lead-run", platformAgentRunId: null },
    { address: "/se/ie" as never, agentRunId: "ie-run", platformAgentRunId: null },
  ],
  source: {
    kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead" as never, handoffs: [],
    defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [] },
    members: [
      { address: "/se/lead" as never, agentDefinitionId: "lead", launchSource: { origin: "inherited", fallbacks: [fallback] } },
      { address: "/se/ie" as never, agentDefinitionId: "ie", launchConfiguration: codex, launchSource: { origin: "agent_default", fallbacks: [] } },
    ],
  },
};

describe("launch values and sources in run views", () => {
  const tree = (task: TaskTeamExecution) => projectExecutionTree({
    createdAt: copy.startedAt, archivedAt: null, applicationBinding: null, handoffs: [],
    rootTeam: { address: "/", teamDefinitionId: "t", teamDefinitionName: "T", teamRunId: "root", coordinatorAddress: "/pm" as never,
      defaultLaunchConfiguration: claude, taskExecutions: [task],
      members: [{ address: "/pm" as never, agentDefinitionId: "pm", role: null, description: null, agentRunId: "pm", platformAgentRunId: null, launchConfiguration: claude }] },
  } as never);

  it("the Team view (snake_case) carries member launch values and sources only when recorded", () => {
    const dto = taskTeamExecutionDtoSchema.parse(tree(copy).root_team.task_executions[0]);
    const source = dto.source!;
    expect(source.default_launch_source).toEqual({ origin: "inherited", fallbacks: [] });
    expect(source.members[0]).toEqual({ address: "/se/lead", agent_definition_id: "lead",
      launch_source: { origin: "inherited", fallbacks: [{ layer: "agent_default", runtime_kind: "grok_build", llm_model_identifier: "grok-4", reason: "runtime_unavailable", detail: "no grok" }] } });
    expect(source.members.map((member) => teamMemberLaunchConfiguration(source, member).llm_model_identifier)).toEqual(["opus", "sol-6.1"]);
    const { defaultLaunchSource: _d, ...bareSource } = copy.source as Extract<typeof copy.source, { kind: "agent_team" }>;
    const older = { ...copy, source: { ...bareSource, members: bareSource.members.map(({ launchConfiguration: _l, launchSource: _s, ...member }) => member) } } as TaskTeamExecution;
    expect(JSON.stringify(tree(older).root_team.task_executions[0])).not.toMatch(/launch_source|"launch_configuration":\{"runtime_kind":"codex/);
  });

  it("the Org and Agent views (camelCase) carry the same for catalog copies", () => {
    const projected = taskExecutionDtoSchema.parse(projectCollaborationTaskExecution(copy));
    if (!("source" in projected) || projected.source?.kind !== "agent_team") throw new Error("team copy expected");
    const source = projected.source;
    expect(source.members.map((member) => collaborationMemberLaunchConfiguration(source, member).llmModelIdentifier)).toEqual(["opus", "sol-6.1"]);
    expect(source.members[0]!.launchSource?.fallbacks[0]).toEqual(fallback);
    expect(source.members[1]).toMatchObject({ launchConfiguration: { runtimeKind: "codex_app_server" }, launchSource: { origin: "agent_default" } });
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
