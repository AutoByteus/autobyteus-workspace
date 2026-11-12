import test from "node:test";
import assert from "node:assert/strict";
import { childRunIdentityDtoSchema, runCollaborationStatusesDtoSchema, RUN_COLLABORATION_STATUSES_MAX_RUNS } from "../dist/index.js";

const agentChild = { kind: "agent", address: "/worker", agentRunId: "worker-run", agentDefinitionId: "worker", delegatorAgentRunId: "manager-run", startedAt: "2026-11-12T00:00:00.000Z" };
const teamChild = { kind: "agent_team", address: "/dev_team", teamRunId: "dev-team-run", coordinatorAgentRunId: "lead-run", startedAt: "2026-11-12T00:00:00.000Z",
  members: [{ address: "/lead", agentRunId: "lead-run", agentDefinitionId: null }] };

test("a child run's identity is an agent run or a team run, with nothing a run changes while it runs (SR-055, SR-056)", () => {
  assert.deepEqual(childRunIdentityDtoSchema.parse(agentChild), agentChild);
  assert.deepEqual(childRunIdentityDtoSchema.parse(teamChild), teamChild);
  // No launch details: the view's row adds them, read fresh.
  assert.throws(() => childRunIdentityDtoSchema.parse({ ...agentChild, source: { kind: "agent" } }));
  assert.throws(() => childRunIdentityDtoSchema.parse({ ...teamChild, agentRunId: "x" }));
  // A team row opens its coordinator.
  const { coordinatorAgentRunId: _coordinator, ...withoutCoordinator } = teamChild;
  assert.throws(() => childRunIdentityDtoSchema.parse(withoutCoordinator));
});

test("the listed-runs poll answers every kind with each run's activity and children (SR-055)", () => {
  const answer = [
    { kind: "agent_team", runId: "team-run", isActive: false, children: [{ row: agentChild, delegatorAddress: "/manager", statuses: [{ agentRunId: "worker-run", memberAddress: "/worker", status: "running" }] }] },
    { kind: "agent_org", runId: "org-run", isActive: true, children: [] },
    { kind: "agent", runId: "host-run", isActive: false, children: [{ row: teamChild, delegatorAddress: null, statuses: [] }] },
  ];
  assert.deepEqual(runCollaborationStatusesDtoSchema.parse(answer), answer);
  assert.throws(() => runCollaborationStatusesDtoSchema.parse([{ kind: "agent_team", runId: "t", isActive: false, children: [], statuses: [] }]));
  // Every child names its delegator's address, or null.
  assert.throws(() => runCollaborationStatusesDtoSchema.parse([{ kind: "agent", runId: "h", isActive: false, children: [{ row: agentChild, statuses: [] }] }]));
  assert.equal(RUN_COLLABORATION_STATUSES_MAX_RUNS, 100);
});
