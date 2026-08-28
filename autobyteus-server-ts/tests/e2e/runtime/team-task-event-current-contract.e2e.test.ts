import { describe, expect, it } from "vitest";
import {
  parseTeamStreamServerMessage,
  type TaskDelegationRecordDto,
} from "@autobyteus/team-stream-contracts";

const createdAt = "2026-08-28T00:00:00.000Z";

const activeTask = (
  taskExecution: { agent_run_id: string } | { team_run_id: string },
): TaskDelegationRecordDto => ({
  task_id: "task-001",
  delegator_agent_run_id: "coordinator-run-001",
  recipient_address: "/worker",
  task_execution: taskExecution,
  description: "Produce the delegated result.",
  reference_files: [],
  status: "active",
  updates: [],
  created_at: createdAt,
});

describe("current Team task-event stream contract", () => {
  it("parses exact task-Agent and task-Team activation payloads", () => {
    const agentActivation = parseTeamStreamServerMessage({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_AGENT_ACTIVATED",
        change_sequence: 1,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_agent",
          address: "/worker",
          agent_run_id: "task-agent-run-001",
          platform_agent_run_id: null,
          started_at: createdAt,
          settled_at: null,
        },
        task: activeTask({ agent_run_id: "task-agent-run-001" }),
      },
    });
    expect(agentActivation).toMatchObject({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_AGENT_ACTIVATED",
        execution: { agent_run_id: "task-agent-run-001" },
        task: { task_id: "task-001", task_execution: { agent_run_id: "task-agent-run-001" } },
      },
    });

    const teamActivation = parseTeamStreamServerMessage({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_TEAM_ACTIVATED",
        change_sequence: 2,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_team",
          address: "/worker",
          team_run_id: "task-team-run-001",
          members: [],
          task_executions: [],
          started_at: createdAt,
          settled_at: null,
        },
        task: activeTask({ team_run_id: "task-team-run-001" }),
      },
    });
    expect(teamActivation).toMatchObject({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_TEAM_ACTIVATED",
        execution: { team_run_id: "task-team-run-001" },
        task: { task_id: "task-001", task_execution: { team_run_id: "task-team-run-001" } },
      },
    });
  });

  it("parses submitted and reviewed task records as TASK_CHANGED updates", () => {
    const submittedTask: TaskDelegationRecordDto = {
      ...activeTask({ agent_run_id: "task-agent-run-001" }),
      status: "awaiting_review",
      updates: [{
        kind: "submission",
        submission_id: "task-001_submission_0001",
        message: "Initial result",
        reference_files: [],
        created_at: createdAt,
      }],
    };
    const submitted = parseTeamStreamServerMessage({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_CHANGED",
        change_sequence: 3,
        task: submittedTask,
      },
    });
    expect(submitted).toMatchObject({
      payload: {
        event_type: "TASK_CHANGED",
        task: {
          task_id: "task-001",
          status: "awaiting_review",
          updates: [{ kind: "submission", submission_id: "task-001_submission_0001" }],
        },
      },
    });

    const reviewed = parseTeamStreamServerMessage({
      type: "TASK_DELEGATION_EVENT",
      payload: {
        event_type: "TASK_CHANGED",
        change_sequence: 4,
        task: {
          ...submittedTask,
          status: "active",
          updates: [
            ...submittedTask.updates,
            {
              kind: "review",
              review_id: "task-001_review_0001",
              reviewed_submission_id: "task-001_submission_0001",
              decision: "request_revision",
              comment: "Please revise.",
              reference_files: [],
              created_at: createdAt,
            },
          ],
        },
      },
    });
    expect(reviewed).toMatchObject({
      payload: {
        event_type: "TASK_CHANGED",
        task: {
          task_id: "task-001",
          status: "active",
          updates: [
            { kind: "submission" },
            {
              kind: "review",
              review_id: "task-001_review_0001",
              reviewed_submission_id: "task-001_submission_0001",
              decision: "request_revision",
            },
          ],
        },
      },
    });
  });
});
