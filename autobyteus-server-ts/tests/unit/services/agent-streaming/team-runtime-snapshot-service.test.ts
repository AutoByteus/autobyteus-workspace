import { describe, expect, it } from "vitest";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusSnapshot,
} from "../../../../src/agent-team-execution/domain/team-agent-status.js";
import { createTeamExecutionAddress } from "../../../../src/agent-team-execution/domain/team-execution-address.js";
import type { TeamRun } from "../../../../src/agent-team-execution/domain/team-run.js";
import { TeamRuntimeSnapshotService } from "../../../../src/services/agent-streaming/team-runtime-snapshot-service.js";

describe("TeamRuntimeSnapshotService", () => {
  it("projects exact current task-Team Agent identity before the root lifecycle snapshot", () => {
    const executionAddress = createTeamExecutionAddress({
      rootTeamRunId: "root-team-1",
      taskTeamRunIds: ["task-team-run-7"],
      memberAddress: "/research_group/review_team/review_group/critic",
      taskAgentRunId: null,
    });
    const snapshot = createTeamAgentStatusSnapshot({
      execution: createTeamAgentExecutionBinding({
        executionAddress,
        agentRunId: "critic-agent-run-93",
      }),
      details: createTeamAgentStatusDetails({
        status: "running",
        trigger: "turn_started",
      }),
    });
    const teamRun = {
      getLeafAgentStatusSnapshots: () => [snapshot],
    } as unknown as TeamRun;

    expect(new TeamRuntimeSnapshotService().getInitialMessages(teamRun, {
      teamRunId: "root-team-1",
      isActive: true,
    })).toEqual([
      {
        type: "AGENT_STATUS",
        payload: {
          agent_execution: {
            kind: "task_team_agent",
            execution_address: {
              root_team_run_id: "root-team-1",
              task_team_run_ids: ["task-team-run-7"],
              member_address: "/research_group/review_team/review_group/critic",
              task_agent_run_id: null,
            },
            agent_run_id: "critic-agent-run-93",
          },
          status: "running",
          trigger: "turn_started",
          tool_name: null,
          error_message: null,
          error_details: null,
        },
      },
      {
        type: "TEAM_RUN_LIFECYCLE",
        payload: { is_active: true },
      },
    ]);
  });
});
