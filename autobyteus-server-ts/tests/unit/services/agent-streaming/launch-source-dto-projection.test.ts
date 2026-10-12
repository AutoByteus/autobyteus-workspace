import { describe, expect, it } from "vitest";
import { collaboratorEntryDtoSchema as teamCollaboratorDtoSchema, teamMemberLaunchConfiguration } from "@autobyteus/team-stream-contracts";
import {
  collaborationMemberLaunchConfiguration,
  collaboratorEntryDtoSchema,
  taskExecutionDtoSchema,
} from "@autobyteus/collaboration-stream-contracts";
import { projectCollaboratorEntry } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import {
  projectCollaborationCollaborator,
  projectCollaborationTaskExecution,
} from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import { toDelegateTaskResult } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";
import type { CollaboratorTeamEntry, TaskExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** REQ-007: run views carry each recorded member launch and source; REQ-008: delegate_task carries launch_notes. */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1" };
const fallback = { layer: "agent_default" as const, runtimeKind: "grok_build", llmModelIdentifier: "grok-4", reason: "runtime_unavailable" as const, detail: "no grok" };
const entry: CollaboratorTeamEntry = {
  kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "se-run", coordinatorAddress: "/se/lead" as never,
  handoffs: [], taskExecutions: [], addedAt: "2026-10-12T00:00:00.000Z", addedViaAgentRunId: "pm",
  defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [] },
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null, launchSource: { origin: "inherited", fallbacks: [fallback] } },
    { address: "/se/ie" as never, agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null, launchConfiguration: codex, launchSource: { origin: "agent_default", fallbacks: [] } },
  ],
};

describe("launch values and sources in run views", () => {
  it("the Team view (snake_case) carries member launch values and sources only when recorded", () => {
    const dto = teamCollaboratorDtoSchema.parse(projectCollaboratorEntry(entry));
    if (dto.kind !== "agent_team") throw new Error("team expected");
    expect(dto.default_launch_source).toEqual({ origin: "inherited", fallbacks: [] });
    expect(dto.members[0]).toEqual({ address: "/se/lead", agent_definition_id: "lead", agent_run_id: "lead-run", platform_agent_run_id: null,
      launch_source: { origin: "inherited", fallbacks: [{ layer: "agent_default", runtime_kind: "grok_build", llm_model_identifier: "grok-4", reason: "runtime_unavailable", detail: "no grok" }] } });
    expect(dto.members.map((member) => teamMemberLaunchConfiguration(dto, member).llm_model_identifier)).toEqual(["opus", "sol-6.1"]);
    const before = { ...entry, defaultLaunchSource: undefined, members: entry.members.map(({ launchConfiguration: _l, launchSource: _s, ...member }) => member) };
    const old = projectCollaboratorEntry(before as CollaboratorTeamEntry);
    expect(JSON.stringify(old)).not.toMatch(/launch_source|"launch_configuration"/);
  });

  it("the Org and Agent views (camelCase) carry the same, for collaborators and catalog copies", () => {
    const dto = collaboratorEntryDtoSchema.parse(projectCollaborationCollaborator(entry));
    if (dto.kind !== "agent_team") throw new Error("team expected");
    expect(dto.members.map((member) => collaborationMemberLaunchConfiguration(dto, member).llmModelIdentifier)).toEqual(["opus", "sol-6.1"]);
    expect(dto.members[0]!.launchSource?.fallbacks[0]).toEqual(fallback);
    const copy = {
      address: "/se", teamRunId: "copy", startedAt: "2026-10-12T00:00:00.000Z", taskExecutions: [],
      members: [{ address: "/se/lead", agentRunId: "c-lead", platformAgentRunId: null }],
      source: { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead", handoffs: [],
        members: entry.members.map(({ agentRunId: _a, platformAgentRunId: _p, ...member }) => member),
        defaultLaunchConfiguration: claude, defaultLaunchSource: entry.defaultLaunchSource },
    } as unknown as TaskExecution;
    const projected = taskExecutionDtoSchema.parse(projectCollaborationTaskExecution(copy));
    expect("source" in projected && projected.source?.kind === "agent_team" && projected.source.members[1]).toMatchObject({
      launchConfiguration: { runtimeKind: "codex_app_server" }, launchSource: { origin: "agent_default" },
    });
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
