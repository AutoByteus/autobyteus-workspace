import test from "node:test";
import assert from "node:assert/strict";
import {
  taskAgentExecutionDtoSchema,
  taskTeamExecutionDtoSchema,
  teamMemberLaunchSource,
} from "../dist/index.js";

const claude = { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus", llm_config: null, auto_execute_tools: false, workspace_root_path: "/w" };
const codex = { ...claude, runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", llm_config: { effort: "high" } };
const fallback = { layer: "agent_default", runtime_kind: "codex_app_server", llm_model_identifier: "sol-6.1", reason: "runtime_unavailable", detail: "no codex" };
const members = [
  { address: "/se/lead", agent_definition_id: "lead", launch_configuration: claude, follows_team: true },
  { address: "/se/ie", agent_definition_id: "ie", launch_configuration: codex, follows_team: false, launch_source: { origin: "agent_default", fallbacks: [] } },
  { address: "/se/cr", agent_definition_id: "cr", launch_configuration: claude, follows_team: true, launch_source: { origin: "inherited", fallbacks: [fallback] } },
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

test("Team copy DTOs carry each member's complete launch, whether it follows the Team, and optional sources", () => {
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...copy, source: { ...source, default_launch_source: { origin: "routing", fallbacks: [] } } }));
  const { launch_configuration: _launch, ...noLaunch } = members[0];
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...copy, source: { ...source, members: [noLaunch, ...members.slice(1)] } }));
  const { follows_team: _follows, ...noFollows } = members[0];
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...copy, source: { ...source, members: [noFollows, ...members.slice(1)] } }));
});

test("every copy carries its source; a copy started from a configured placement records the configured origin", () => {
  const { source: _omitted, ...sourceless } = copy;
  assert.throws(() => taskTeamExecutionDtoSchema.parse(sourceless));
  const configured = { ...copy, source: { ...source, default_launch_source: { origin: "configured", fallbacks: [] } } };
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(configured), configured);
  const agent = { kind: "task_agent", address: "/ie", agent_run_id: "ie", platform_agent_run_id: null, delegator_agent_run_id: "pm", started_at: "t",
    source: { kind: "agent", agent_definition_id: "ie", launch_configuration: codex, launch_source: { origin: "configured", fallbacks: [] } } };
  assert.deepEqual(taskAgentExecutionDtoSchema.parse(agent), agent);
  const { source: _agentSource, ...sourcelessAgent } = agent;
  assert.throws(() => taskAgentExecutionDtoSchema.parse(sourcelessAgent));
});

test("a member's launch source is its own, else the Team's; null when not recorded", () => {
  assert.deepEqual(teamMemberLaunchSource(source, members[2]).fallbacks, [fallback]);
  assert.deepEqual(teamMemberLaunchSource(source, members[0]), source.default_launch_source);
  assert.equal(teamMemberLaunchSource({}, {}), null);
});
