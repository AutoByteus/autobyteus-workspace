import { describe, expect, it } from "vitest";
import {
  collaboratorEntryDtoSchema as teamCollaboratorDtoSchema,
  taskTeamExecutionDtoSchema,
  teamCopyAgentLaunch,
  teamMemberFollowsTeam,
} from "@autobyteus/team-stream-contracts";
import {
  collaborationCopyAgentLaunch,
  collaborationMemberFollowsTeam,
  collaboratorEntryDtoSchema,
  taskExecutionDtoSchema,
} from "@autobyteus/collaboration-stream-contracts";
import { projectCollaboratorEntry, projectExecutionTree } from "../../../../src/services/agent-streaming/team-execution-view-projector.js";
import {
  projectCollaborationCollaborator,
  projectCollaborationTaskExecution,
} from "../../../../src/services/agent-streaming/collaboration-execution-tree-dto-projection.js";
import type { CollaboratorTeamEntry, TaskTeamExecution } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** DS-004: run views carry the user's choices (only when recorded), and the contract rule reads them like the server. */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const at = "2026-10-13T00:00:00.000Z";
const sonnet = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" }, selectedAt: at };
const haiku = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt: at };
const entry: CollaboratorTeamEntry = {
  kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "se-run", coordinatorAddress: "/se/lead" as never,
  handoffs: [], taskExecutions: [], addedAt: at, addedViaAgentRunId: "pm", defaultLaunchConfiguration: claude,
  userTeamLaunchSelection: sonnet,
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
    { address: "/se/ie" as never, agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null, userLaunchSelection: haiku },
  ],
};
const copy: TaskTeamExecution = {
  address: "/se" as never, teamRunId: "copy", startedAt: at, taskExecutions: [], delegatorAgentRunId: "pm", userTeamLaunchSelection: sonnet,
  members: [{ address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: null, userLaunchSelection: haiku }],
};

describe("user launch choices in run views", () => {
  it("the Team view (snake_case) carries choices when recorded and the contract rule resolves them", () => {
    const dto = teamCollaboratorDtoSchema.parse(projectCollaboratorEntry(entry));
    if (dto.kind !== "agent_team") throw new Error("team expected");
    expect(dto.user_team_launch_selection).toEqual({ llm_model_identifier: "sonnet", llm_config: { thinking: "low" }, selected_at: at });
    expect(dto.members[0]).not.toHaveProperty("user_launch_selection");
    expect(dto.members.map((member) => teamCopyAgentLaunch({
      started: dto.default_launch_configuration, followsTeam: teamMemberFollowsTeam(member),
      teamSelection: dto.user_team_launch_selection, agentSelection: member.user_launch_selection,
    }).launch.llm_model_identifier)).toEqual(["sonnet", "haiku"]);
    const projected = projectExecutionTree({
      createdAt: at, archivedAt: null, applicationBinding: null, handoffs: [],
      rootTeam: { address: "/", teamDefinitionId: "t", teamDefinitionName: "T", teamRunId: "root", coordinatorAddress: "/pm" as never,
        defaultLaunchConfiguration: claude, collaborators: [], taskExecutions: [copy],
        members: [{ address: "/pm" as never, agentDefinitionId: "pm", role: null, description: null, agentRunId: "pm", platformAgentRunId: null, launchConfiguration: claude }] },
    } as never);
    const team = taskTeamExecutionDtoSchema.parse(projected.root_team.task_executions[0]);
    expect(team.user_team_launch_selection?.llm_model_identifier).toBe("sonnet");
    expect(team.members[0]).toMatchObject({ user_launch_selection: { llm_model_identifier: "haiku" } });
  });

  it("the collaboration view (camelCase) carries choices when recorded and leaves older records unchanged", () => {
    const dto = collaboratorEntryDtoSchema.parse(projectCollaborationCollaborator(entry));
    if (dto.kind !== "agent_team") throw new Error("team expected");
    expect(dto.userTeamLaunchSelection).toEqual(sonnet);
    expect(dto.members.map((member) => collaborationCopyAgentLaunch({
      started: dto.defaultLaunchConfiguration, followsTeam: collaborationMemberFollowsTeam(member),
      teamSelection: dto.userTeamLaunchSelection, agentSelection: member.userLaunchSelection,
    }).selected)).toEqual(["team", "agent"]);
    expect(taskExecutionDtoSchema.parse(projectCollaborationTaskExecution(copy))).toMatchObject({ userTeamLaunchSelection: sonnet,
      members: [{ userLaunchSelection: haiku }] });
    const { userTeamLaunchSelection: _team, ...older } = copy;
    const olderDto = taskExecutionDtoSchema.parse(projectCollaborationTaskExecution({ ...older, members: [{ address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: null }] }));
    expect(olderDto).not.toHaveProperty("userTeamLaunchSelection");
  });
});
