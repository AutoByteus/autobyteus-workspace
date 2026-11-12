import { describe, expect, it } from "vitest";
import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";

// The Team stream's message for the runs a Team run delegated to (autobyteus-461 DS-8, SR-042 … SR-044): a delegated run
// is a run of its own, shown under the run that delegated it. CHILD_RUNS_CHANGED carries each new or reopened child's row
// with its delegator and the runs that left the view; it replaced TASK_EXECUTION_STARTED and the closed/reopened events.

const startedAt = "2026-08-28T00:00:00.000Z";
const launch = {
  runtime_kind: "autobyteus",
  llm_model_identifier: "test-model",
  llm_config: null,
  auto_execute_tools: false,
  workspace_root_path: null,
};
const agentRow = {
  parent_team_run_id: "root-team-run-001",
  execution: {
    kind: "task_agent",
    address: "/worker",
    agent_run_id: "task-agent-run-001",
    platform_agent_run_id: null,
    delegator_agent_run_id: "coordinator-run-001",
    started_at: startedAt,
    source: { kind: "agent", agent_definition_id: "worker", launch_configuration: launch },
  },
};
const teamRow = {
  parent_team_run_id: "root-team-run-001",
  execution: {
    kind: "task_team",
    address: "/worker",
    team_run_id: "task-team-run-001",
    members: [{ kind: "task_team_agent", address: "/lead", agent_run_id: "task-team-lead-run-001", platform_agent_run_id: null }],
    task_executions: [],
    delegator_agent_run_id: "coordinator-run-001",
    started_at: startedAt,
    source: {
      kind: "agent_team",
      team_definition_id: "worker-team",
      coordinator_address: "/lead",
      members: [{ address: "/lead", agent_definition_id: "lead", launch_configuration: launch, follows_team: false }],
      handoffs: [],
      default_launch_configuration: launch,
    },
  },
};

describe("current Team delegated-run stream contract (CHILD_RUNS_CHANGED)", () => {
  it("parses added task-Agent and task-Team rows carrying the delegator, and removed runs by their IDs", () => {
    const added = parseTeamStreamServerMessage({ type: "CHILD_RUNS_CHANGED", payload: { run_id: "root-team-run-001", added: [agentRow, teamRow], removed: [] } });
    expect(added).toMatchObject({
      type: "CHILD_RUNS_CHANGED",
      payload: { added: [
        { execution: { agent_run_id: "task-agent-run-001", delegator_agent_run_id: "coordinator-run-001" } },
        { execution: { team_run_id: "task-team-run-001", delegator_agent_run_id: "coordinator-run-001" } },
      ] },
    });
    const removed = parseTeamStreamServerMessage({ type: "CHILD_RUNS_CHANGED",
      payload: { run_id: "root-team-run-001", added: [], removed: [{ agent_run_id: "task-agent-run-001" }, { team_run_id: "task-team-run-001" }] } });
    expect(removed).toMatchObject({ payload: { removed: [{ agent_run_id: "task-agent-run-001" }, { team_run_id: "task-team-run-001" }] } });
  });

  it("rejects the retired events, a row without its delegator, and settlement fields", () => {
    for (const type of ["TASK_EXECUTION_STARTED", "TASK_EXECUTIONS_CLOSED", "TASK_EXECUTIONS_REOPENED", "TASK_DELEGATION_EVENT"]) {
      expect(() => parseTeamStreamServerMessage({ type, payload: { change_sequence: 1, parent_team_run_id: "root-team-run-001", execution: agentRow.execution } }), type).toThrow();
    }
    const { delegator_agent_run_id: _omitted, ...withoutDelegator } = agentRow.execution;
    expect(() => parseTeamStreamServerMessage({ type: "CHILD_RUNS_CHANGED",
      payload: { run_id: "root-team-run-001", added: [{ ...agentRow, execution: withoutDelegator }], removed: [] } })).toThrow();
    expect(() => parseTeamStreamServerMessage({ type: "CHILD_RUNS_CHANGED",
      payload: { run_id: "root-team-run-001", added: [{ ...agentRow, execution: { ...agentRow.execution, settled_at: null } }], removed: [] } })).toThrow();
  });
});
