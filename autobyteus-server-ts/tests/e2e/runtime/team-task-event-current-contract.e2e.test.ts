import { describe, expect, it } from "vitest";
import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";

const startedAt = "2026-08-28T00:00:00.000Z";

describe("current Team delegated-execution stream contract", () => {
  it("parses exact task-Agent and task-Team TASK_EXECUTION_STARTED payloads carrying the delegator", () => {
    const agentStarted = parseTeamStreamServerMessage({
      type: "TASK_EXECUTION_STARTED",
      payload: {
        change_sequence: 1,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_agent",
          address: "/worker",
          agent_run_id: "task-agent-run-001",
          platform_agent_run_id: null,
          delegator_agent_run_id: "coordinator-run-001",
          started_at: startedAt,
        },
      },
    });
    expect(agentStarted).toMatchObject({
      type: "TASK_EXECUTION_STARTED",
      payload: { execution: { agent_run_id: "task-agent-run-001", delegator_agent_run_id: "coordinator-run-001" } },
    });

    const teamStarted = parseTeamStreamServerMessage({
      type: "TASK_EXECUTION_STARTED",
      payload: {
        change_sequence: 2,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_team",
          address: "/worker",
          team_run_id: "task-team-run-001",
          members: [{
            kind: "task_team_agent",
            address: "/worker/lead",
            agent_run_id: "task-team-lead-run-001",
            platform_agent_run_id: null,
          }],
          task_executions: [],
          delegator_agent_run_id: "coordinator-run-001",
          started_at: startedAt,
        },
      },
    });
    expect(teamStarted).toMatchObject({
      type: "TASK_EXECUTION_STARTED",
      payload: { execution: { team_run_id: "task-team-run-001", delegator_agent_run_id: "coordinator-run-001" } },
    });
  });

  it("rejects the retired task-record events and settlement fields", () => {
    expect(() => parseTeamStreamServerMessage({
      type: "TASK_DELEGATION_EVENT",
      payload: { event_type: "TASK_AGENT_ACTIVATED", change_sequence: 1 },
    })).toThrow();
    expect(() => parseTeamStreamServerMessage({
      type: "TASK_EXECUTION_STARTED",
      payload: {
        change_sequence: 1,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_agent",
          address: "/worker",
          agent_run_id: "task-agent-run-001",
          platform_agent_run_id: null,
          delegator_agent_run_id: "coordinator-run-001",
          started_at: startedAt,
          settled_at: null,
        },
      },
    })).toThrow();
    expect(() => parseTeamStreamServerMessage({
      type: "TASK_EXECUTION_STARTED",
      payload: {
        change_sequence: 1,
        parent_team_run_id: "root-team-run-001",
        execution: {
          kind: "task_agent",
          address: "/worker",
          agent_run_id: "task-agent-run-001",
          platform_agent_run_id: null,
          started_at: startedAt,
        },
      },
    })).toThrow();
  });
});
