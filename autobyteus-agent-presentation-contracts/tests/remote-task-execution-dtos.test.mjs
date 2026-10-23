import test from "node:test";
import assert from "node:assert/strict";
import {
  remoteTaskExecutionAgentsOf,
  remoteTaskExecutionDtoSchema,
  remoteTaskExecutionRunIdOf,
  remoteTaskExecutionSummaryDtoSchema,
} from "../dist/index.js";

const agent = {
  kind: "agent", address: "/market_researcher", agent_run_id: "researcher-run", node_id: "srv_docker", node_name: "docker",
  delegator_agent_run_id: "manager-run", started_at: "2026-10-23T08:00:00.000Z",
};
const team = {
  kind: "agent_team", address: "/marketing_team", team_run_id: "marketing-team-run", node_id: "srv_docker", node_name: "docker",
  coordinator_address: "/marketing_team/campaign_lead",
  members: [
    { address: "/marketing_team/campaign_lead", agent_run_id: "lead-run" },
    { address: "/marketing_team/copywriter", agent_run_id: "writer-run" },
  ],
  delegator_agent_run_id: "manager-run", started_at: "2026-10-23T08:01:00.000Z",
};

test("a remote execution is an Agent run or a Team run with its mounted members, named by node", () => {
  assert.deepEqual(remoteTaskExecutionDtoSchema.parse(agent), agent);
  assert.deepEqual(remoteTaskExecutionDtoSchema.parse(team), team);
  assert.equal(remoteTaskExecutionRunIdOf(agent), "researcher-run");
  assert.equal(remoteTaskExecutionRunIdOf(team), "marketing-team-run");
  assert.deepEqual(remoteTaskExecutionAgentsOf(agent), [{ address: "/market_researcher", agent_run_id: "researcher-run" }]);
  assert.deepEqual(remoteTaskExecutionAgentsOf(team).map((member) => member.agent_run_id), ["lead-run", "writer-run"]);
  assert.throws(() => remoteTaskExecutionDtoSchema.parse({ ...team, members: [] }));
  assert.throws(() => remoteTaskExecutionDtoSchema.parse({ ...agent, node_name: "" }));
  assert.throws(() => remoteTaskExecutionDtoSchema.parse({ ...agent, title: "extra field" }));
});

test("a summary says whether the node answered, with its title and its agents' statuses", () => {
  const answered = { node_id: "srv_docker", run_id: "marketing-team-run", reachable: true, title: "Plan the October campaign",
    statuses: [{ agent_run_id: "lead-run", status: "running" }, { agent_run_id: "writer-run", status: "idle" }] };
  assert.deepEqual(remoteTaskExecutionSummaryDtoSchema.parse(answered), answered);
  const unreachable = { node_id: "srv_office", run_id: "office-run", reachable: false, title: null, statuses: [] };
  assert.deepEqual(remoteTaskExecutionSummaryDtoSchema.parse(unreachable), unreachable);
  assert.throws(() => remoteTaskExecutionSummaryDtoSchema.parse({ ...answered, statuses: [{ agent_run_id: "lead-run", status: "waiting" }] }));
});
