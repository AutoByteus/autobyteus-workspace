import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTeamStreamClientMessage,
  parseTeamStreamServerMessage,
  teamRunExecutionTreeDtoSchema,
} from "../dist/index.js";

const launch = { runtime_kind: "autobyteus", llm_model_identifier: "m", llm_config: null, auto_execute_tools: false, workspace_root_path: null };
const teamCollaborator = {
  kind: "agent_team", address: "/product_team", team_definition_id: "product-team",
  coordinator_address: "/product_team/lead", members: [{ address: "/product_team/lead", agent_definition_id: "lead" }],
  handoffs: [], default_launch_configuration: launch, added_at: "2026-09-30T00:00:00.000Z", added_via_agent_run_id: "member-run",
};

test("SEND_MESSAGE accepts optional mentions", () => {
  const base = { content: "hi @Product Team", context_file_paths: [], image_urls: [], agent_run_id: "a", message_id: "m", dedupe_key: "d" };
  assert.equal(parseTeamStreamClientMessage({ type: "SEND_MESSAGE", payload: base }).payload.mentions, undefined);
  assert.equal(parseTeamStreamClientMessage({
    type: "SEND_MESSAGE", payload: { ...base, mentions: [{ kind: "agent_team", definition_id: "product-team" }] },
  }).payload.mentions.length, 1);
  assert.throws(() => parseTeamStreamClientMessage({ type: "SEND_MESSAGE", payload: { ...base, mentions: [{ kind: "agent_org", definition_id: "x" }] } }));
});

test("the Team tree carries collaborators and COLLABORATOR_ADDED carries one entry", () => {
  const tree = {
    created_at: "t", archived_at: null, application_binding: null, handoffs: [],
    root_team: {
      address: "/", team_definition_id: "se", team_definition_name: "SE", team_run_id: "team-run",
      coordinator_address: "/lead", default_launch_configuration: launch, members: [],
      collaborators: [teamCollaborator], task_executions: [],
    },
  };
  assert.equal(teamRunExecutionTreeDtoSchema.parse(tree).root_team.collaborators.length, 1);
  assert.equal(parseTeamStreamServerMessage({
    type: "COLLABORATOR_ADDED", payload: { change_sequence: 2, collaborator: teamCollaborator },
  }).payload.collaborator.address, "/product_team");
  assert.throws(() => parseTeamStreamServerMessage({
    type: "COLLABORATOR_ADDED", payload: { change_sequence: 2, collaborator: { ...teamCollaborator, team_run_id: "x" } },
  }));
});
