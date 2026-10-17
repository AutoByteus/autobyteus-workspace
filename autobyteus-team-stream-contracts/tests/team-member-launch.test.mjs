import test from "node:test";
import assert from "node:assert/strict";
import {
  taskTeamExecutionDtoSchema,
  teamMemberLaunchConfiguration,
  teamMemberLaunchSource,
} from "../dist/index.js";

const claude = { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus", llm_config: null, auto_execute_tools: false, workspace_root_path: "/w" };
const codex = { ...claude, runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", llm_config: { effort: "high" } };
const fallback = { layer: "agent_default", runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", reason: "runtime_unavailable", detail: "no codex" };
const members = [
  { address: "/se/lead", agent_definition_id: "lead" },
  { address: "/se/ie", agent_definition_id: "ie", launch_configuration: codex, launch_source: { origin: "agent_default", fallbacks: [] } },
  { address: "/se/cr", agent_definition_id: "cr", launch_source: { origin: "inherited", fallbacks: [fallback] } },
];
const source = {
  kind: "agent_team", team_definition_id: "se", coordinator_address: "/se/lead", handoffs: [], members,
  default_launch_configuration: claude, default_launch_source: { origin: "inherited", fallbacks: [] },
};
const copy = {
  kind: "task_team", address: "/se", team_run_id: "copy", task_executions: [], delegator_agent_run_id: "pm", started_at: "t",
  members: members.map((member, index) => ({ kind: "task_team_agent", address: member.address, agent_run_id: `run-${index}`, platform_agent_run_id: null })),
  source,
};

test("catalog Team copy DTOs carry optional per-member launch values and sources", () => {
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...copy, source: { ...source, default_launch_source: { origin: "routing", fallbacks: [] } } }));
});

test("records written before sources existed still parse", () => {
  const { default_launch_source: _omitted, ...bare } = source;
  const before = { ...copy, source: { ...bare, members: [members[0]] }, members: [copy.members[0]] };
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(before), before);
});

test("the effective member launch is the member's own, else the Team's; the source likewise, null when not recorded", () => {
  assert.equal(teamMemberLaunchConfiguration(source, members[0]), claude);
  assert.equal(teamMemberLaunchConfiguration(source, members[1]), codex);
  assert.equal(teamMemberLaunchConfiguration(source, members[2]), claude);
  assert.deepEqual(teamMemberLaunchSource(source, members[2]).fallbacks, [fallback]);
  assert.deepEqual(teamMemberLaunchSource(source, members[0]), source.default_launch_source);
  assert.equal(teamMemberLaunchSource({ default_launch_configuration: claude }, {}), null);
});
