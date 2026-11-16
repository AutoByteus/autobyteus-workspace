import { describe, expect, it } from "vitest";
import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";

// autobyteus-461 SR-084: a Team view's delegated runs are its tree's rows. The view sends its tree right after its snapshot
// (`RUN_TREE_SNAPSHOT`) and each change, numbered in its one sequence (`RUN_TREE_CHANGED`: rows added, keys removed, rows
// updated). The per-execution events (`TASK_EXECUTION_STARTED`, `TASK_EXECUTIONS_CLOSED`, `TASK_EXECUTIONS_REOPENED`) went with
// the hosting lifecycle that produced them.
const launch = {
  runtimeKind: "autobyteus",
  llmModelIdentifier: "test-model",
  llmConfig: null,
  autoExecuteTools: false,
  workspaceRootPath: null,
  source: { origin: "agent_default", fallbacks: [] },
  ownSource: true,
};
const coordinatorRow = { key: "team_member:root-team-run-001:coordinator-run-001", parentKey: null, depth: 0, kind: "team_member", name: "coordinator",
  address: "/coordinator", openTarget: { runKind: "agent_team", runId: "root-team-run-001", agentRunId: "coordinator-run-001" },
  statusIds: ["coordinator-run-001"] };
const agentRow = { key: "agent:task-agent-run-001", parentKey: coordinatorRow.key, depth: 1, kind: "agent", name: "worker", address: "/worker",
  openTarget: { runKind: "agent", runId: "task-agent-run-001", agentRunId: "task-agent-run-001" }, statusIds: ["task-agent-run-001"], launch };
const teamRow = { key: "team:task-team-run-001", parentKey: coordinatorRow.key, depth: 1, kind: "team", name: "worker team", address: "/worker_team",
  openTarget: { runKind: "agent_team", runId: "task-team-run-001", agentRunId: "task-team-lead-run-001" }, statusIds: ["task-team-run-001"], launch };
const leadRow = { key: "team_member:task-team-run-001:task-team-lead-run-001", parentKey: teamRow.key, depth: 2, kind: "team_member", name: "lead",
  address: "/lead", openTarget: { runKind: "agent_team", runId: "task-team-run-001", agentRunId: "task-team-lead-run-001" },
  statusIds: ["task-team-lead-run-001"], launch: { ...launch, ownSource: false } };

describe("current Team delegated-execution stream contract (the view's tree, SR-084)", () => {
  it("parses the tree snapshot and a change carrying a delegated Agent and a delegated Team under its delegator", () => {
    const snapshot = parseTeamStreamServerMessage({ type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: 0, rows: [coordinatorRow] } });
    expect(snapshot).toMatchObject({ type: "RUN_TREE_SNAPSHOT", payload: { rows: [{ key: coordinatorRow.key }] } });

    const changed = parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED",
      payload: { change_sequence: 1, added: [agentRow, teamRow, leadRow], removed: [], updated: [] } });
    expect(changed).toMatchObject({ type: "RUN_TREE_CHANGED", payload: { change_sequence: 1, added: [
      { kind: "agent", parentKey: coordinatorRow.key, openTarget: { agentRunId: "task-agent-run-001" } },
      { kind: "team", parentKey: coordinatorRow.key, openTarget: { runId: "task-team-run-001", agentRunId: "task-team-lead-run-001" } },
      { kind: "team_member", parentKey: teamRow.key },
    ] } });

    // A closed Task's stopped runs leave the tree; an empty change still counts in the sequence.
    expect(parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED", payload: { change_sequence: 2, added: [], removed: [agentRow.key, teamRow.key, leadRow.key], updated: [] } }))
      .toMatchObject({ payload: { removed: [agentRow.key, teamRow.key, leadRow.key] } });
    expect(parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED", payload: { change_sequence: 3, added: [], removed: [], updated: [] } }))
      .toMatchObject({ payload: { change_sequence: 3 } });
  });

  it("rejects the retired per-execution events and malformed tree messages", () => {
    for (const type of ["TASK_EXECUTION_STARTED", "TASK_EXECUTIONS_CLOSED", "TASK_EXECUTIONS_REOPENED", "TASK_DELEGATION_EVENT"]) {
      expect(() => parseTeamStreamServerMessage({ type, payload: { change_sequence: 1, parent_team_run_id: "root-team-run-001" } }), type).toThrow();
    }
    // A change is numbered; a row has a known kind and no other fields.
    expect(() => parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED", payload: { added: [], removed: [], updated: [] } })).toThrow();
    expect(() => parseTeamStreamServerMessage({ type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: 0, rows: [{ ...agentRow, kind: "task_agent" }] } })).toThrow();
    expect(() => parseTeamStreamServerMessage({ type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: 0, rows: [{ ...agentRow, settled_at: null }] } })).toThrow();
  });
});
