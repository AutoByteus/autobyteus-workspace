import { describe, expect, it } from "vitest";
import { taskTeamExecutionDtoSchema, teamCopyAgentLaunch } from "@autobyteus/team-stream-contracts";
import {
  collaborationCopyAgentLaunch,
  agentOrgExecutionEventDtoSchema,
  agentRunCollaborationEventDtoSchema,
  taskExecutionDtoSchema,
} from "@autobyteus/collaboration-stream-contracts";
import { projectExecutionTree, projectSequencedTeamRunEvent } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import {
  projectCollaborationSelectionsChanged,
  projectCollaborationTaskExecution,
} from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import type { TaskTeamExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** DS-004: run views carry the user's choices (only when recorded), and the contract rule reads them like the server. */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const at = "2026-10-13T00:00:00.000Z";
const sonnet = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" }, selectedAt: at };
const haiku = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt: at };
const copy: TaskTeamExecution = {
  address: "/se" as never, teamRunId: "copy", startedAt: at, taskExecutions: [], delegatorAgentRunId: "pm", userTeamLaunchSelection: sonnet,
  members: [{ address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: null, userLaunchSelection: haiku }],
};

describe("user launch choices in run views", () => {
  it("the Team view (snake_case) carries choices when recorded and the contract rule resolves them", () => {
    const projected = projectExecutionTree({
      createdAt: at, archivedAt: null, applicationBinding: null, handoffs: [],
      rootTeam: { address: "/", teamDefinitionId: "t", teamDefinitionName: "T", teamRunId: "root", coordinatorAddress: "/pm" as never,
        defaultLaunchConfiguration: claude, taskExecutions: [copy],
        members: [{ address: "/pm" as never, agentDefinitionId: "pm", role: null, description: null, agentRunId: "pm", platformAgentRunId: null, launchConfiguration: claude }] },
    } as never);
    const team = taskTeamExecutionDtoSchema.parse(projected.root_team.task_executions[0]);
    expect(team.user_team_launch_selection).toEqual({ llm_model_identifier: "sonnet", llm_config: { thinking: "low" }, selected_at: at });
    expect(team.members[0]).toMatchObject({ user_launch_selection: { llm_model_identifier: "haiku" } });
    const launch = (agentSelection: typeof team.members[number] extends { user_launch_selection?: infer S } ? S : never, followsTeam: boolean) =>
      teamCopyAgentLaunch({ started: projected.root_team.default_launch_configuration, followsTeam, teamSelection: team.user_team_launch_selection, agentSelection })
        .launch.llm_model_identifier;
    expect(launch(undefined, true)).toBe("sonnet");
    expect(launch(team.members[0] && "user_launch_selection" in team.members[0] ? team.members[0].user_launch_selection : undefined, true)).toBe("haiku");
  });

  it("the collaboration view (camelCase) carries choices when recorded and leaves older records unchanged", () => {
    expect(taskExecutionDtoSchema.parse(projectCollaborationTaskExecution(copy))).toMatchObject({ userTeamLaunchSelection: sonnet,
      members: [{ userLaunchSelection: haiku }] });
    expect(collaborationCopyAgentLaunch({ started: { ...claude, runtimeKind: claude.runtimeKind } as never, followsTeam: true, teamSelection: sonnet, agentSelection: null }).selected).toBe("team");
    const { userTeamLaunchSelection: _team, ...older } = copy;
    const olderDto = taskExecutionDtoSchema.parse(projectCollaborationTaskExecution({ ...older, members: [{ address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: null }] }));
    expect(olderDto).not.toHaveProperty("userTeamLaunchSelection");
  });

  it("a live Save's committed choices project onto the Team stream and the Org/Agent collaboration streams", () => {
    const selections = [{ reference: { agentRunId: "ie-run" }, selection: haiku }, { reference: { teamRunId: "se-run" }, selection: sonnet }];
    const message = projectSequencedTeamRunEvent(null as never, {
      changeSequence: 7, event: { eventSourceType: TeamRunEventSourceType.DELEGATED_LAUNCH_SELECTIONS, selections },
    } as never);
    expect(message).toEqual({ type: "DELEGATED_LAUNCH_SELECTIONS_CHANGED", payload: { change_sequence: 7, selections: [
      { agent_run_id: "ie-run", selection: { llm_model_identifier: "haiku", llm_config: null, selected_at: at } },
      { team_run_id: "se-run", selection: { llm_model_identifier: "sonnet", llm_config: { thinking: "low" }, selected_at: at } },
    ] } });
    const event = projectCollaborationSelectionsChanged(selections);
    expect(event).toEqual({ kind: "delegated_launch_selections_changed", selections: [
      { agentRunId: "ie-run", selection: haiku }, { teamRunId: "se-run", selection: sonnet },
    ] });
    expect(agentOrgExecutionEventDtoSchema.parse(event)).toEqual(event);
    expect(agentRunCollaborationEventDtoSchema.parse(event)).toEqual(event);
  });
});
