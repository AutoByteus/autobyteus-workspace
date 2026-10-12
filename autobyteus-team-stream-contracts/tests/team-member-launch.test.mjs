import test from "node:test";
import assert from "node:assert/strict";
import {
  collaboratorEntryDtoSchema,
  taskTeamExecutionDtoSchema,
  teamMemberLaunchConfiguration,
  teamMemberLaunchSource,
} from "../dist/index.js";

const claude = { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus", llm_config: null, auto_execute_tools: false, workspace_root_path: "/w" };
const codex = { ...claude, runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", llm_config: { effort: "high" } };
const fallback = { layer: "agent_default", runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", reason: "runtime_unavailable", detail: "no codex" };
const team = {
  kind: "agent_team", address: "/se", team_definition_id: "se", team_run_id: "se-run", coordinator_address: "/se/lead",
  members: [
    { address: "/se/lead", agent_definition_id: "lead", agent_run_id: "lead-run", platform_agent_run_id: null },
    { address: "/se/ie", agent_definition_id: "ie", agent_run_id: "ie-run", platform_agent_run_id: null,
      launch_configuration: codex, launch_source: { origin: "agent_default", fallbacks: [] } },
    { address: "/se/cr", agent_definition_id: "cr", agent_run_id: "cr-run", platform_agent_run_id: null,
      launch_source: { origin: "inherited", fallbacks: [fallback] } },
  ],
  handoffs: [], default_launch_configuration: claude, default_launch_source: { origin: "inherited", fallbacks: [] },
  task_executions: [], added_at: "2026-10-12T00:00:00.000Z", added_via_agent_run_id: "pm",
};

test("collaborator and copy DTOs carry optional per-member launch values and sources", () => {
  assert.deepEqual(collaboratorEntryDtoSchema.parse(team), team);
  const copy = {
    kind: "task_team", address: "/se", team_run_id: "copy", members: [], task_executions: [], delegator_agent_run_id: "pm", started_at: "t",
    source: { kind: "agent_team", team_definition_id: "se", coordinator_address: "/se/lead", handoffs: [],
      members: team.members.map(({ agent_run_id, platform_agent_run_id, ...member }) => member),
      default_launch_configuration: claude, default_launch_source: team.default_launch_source },
  };
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => collaboratorEntryDtoSchema.parse({ ...team, default_launch_source: { origin: "routing", fallbacks: [] } }));
});

test("records written before sources existed still parse", () => {
  const before = { ...team, default_launch_source: undefined, members: [team.members[0]] };
  delete before.default_launch_source;
  assert.deepEqual(collaboratorEntryDtoSchema.parse(before), before);
});

test("the effective member launch is the member's own, else the Team's; the source likewise, null when not recorded", () => {
  assert.equal(teamMemberLaunchConfiguration(team, team.members[0]), claude);
  assert.equal(teamMemberLaunchConfiguration(team, team.members[1]), codex);
  assert.equal(teamMemberLaunchConfiguration(team, team.members[2]), claude);
  assert.deepEqual(teamMemberLaunchSource(team, team.members[2]).fallbacks, [fallback]);
  assert.deepEqual(teamMemberLaunchSource(team, team.members[0]), team.default_launch_source);
  assert.equal(teamMemberLaunchSource({ default_launch_configuration: claude }, {}), null);
});
