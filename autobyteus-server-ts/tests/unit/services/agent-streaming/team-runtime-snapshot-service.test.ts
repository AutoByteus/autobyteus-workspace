import { describe, expect, it } from "vitest";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { TeamRuntimeSnapshotService } from "../../../../src/services/agent-streaming/team-runtime-snapshot-service.js";

const taskTeamIdentity = {
  taskTeamRunId: "task-team-run-7",
  taskTeamInstanceId: "task-team-instance-7",
  parentTeamRunId: "root-team-1",
  taskId: "task-42",
  logicalTeam: {
    memberName: "research_team",
    memberPath: ["research_team"],
    memberRouteKey: "research_team",
    templateMemberRunId: "research-template-run",
    teamDefinitionId: "research-team-definition",
    coordinatorMemberRouteKey: "review_group/critic",
  },
  ingress: {
    memberName: "critic",
    memberPath: ["review_group", "critic"],
    memberRouteKey: "review_group/critic",
    memberRunId: "critic-runtime-93",
  },
  createdAt: "2026-08-02T12:00:00.000Z",
};

describe("TeamRuntimeSnapshotService", () => {
  it("preserves task-team scope until initial AGENT_STATUS wire mapping", () => {
    const teamRun = {
      getLeafAgentStatusSnapshots: () => [{
        scopeKind: "task_team_member",
        teamRunId: "root-team-1",
        payload: {
          status: "running",
          agent_id: "critic-runtime-93",
          agent_name: "critic",
          member_path: ["research_team", "review_group", "critic"],
          member_route_key: "research_team/review_group/critic",
          source_path: ["research_team", "review_group", "critic"],
          source_route_key: "research_team/review_group/critic",
        },
        taskTeamInstance: taskTeamIdentity,
      }],
    } as unknown as TeamRun;

    const messages = new TeamRuntimeSnapshotService().getInitialMessages(teamRun, {
      teamRunId: "root-team-1",
      isActive: true,
    });

    expect(messages[0]).toMatchObject({
      type: ServerMessageType.AGENT_STATUS,
      payload: {
        agent_id: "critic-runtime-93",
        task_team_run_id: "task-team-run-7",
        task_team_instance_id: "task-team-instance-7",
        task_id: "task-42",
        team_route_key: "research_team",
        team_path: ["research_team"],
        task_team_relative_member_path: ["review_group", "critic"],
        task_team_relative_member_route_key: "review_group/critic",
      },
    });
    expect(messages[1]).toMatchObject({
      type: ServerMessageType.TEAM_RUN_LIFECYCLE,
      payload: { team_run_id: "root-team-1", is_active: true },
    });
  });

  it("rejects a task-team leaf whose source path is outside its logical team scope", () => {
    const teamRun = {
      getLeafAgentStatusSnapshots: () => [{
        scopeKind: "task_team_member",
        teamRunId: "root-team-1",
        payload: {
          status: "running",
          agent_id: "critic-runtime-93",
          agent_name: "critic",
          member_path: ["other", "critic"],
          member_route_key: "other/critic",
          source_path: ["other", "critic"],
          source_route_key: "other/critic",
        },
        taskTeamInstance: taskTeamIdentity,
      }],
    } as unknown as TeamRun;

    expect(() => new TeamRuntimeSnapshotService().getInitialMessages(teamRun, {
      teamRunId: "root-team-1",
      isActive: true,
    })).toThrow("is not rooted below 'research_team'");
  });
});
