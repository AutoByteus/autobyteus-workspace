import test from "node:test";
import assert from "node:assert/strict";
import {
  collaboratorEntryDtoSchema,
  taskAgentExecutionDtoSchema,
  taskTeamExecutionDtoSchema,
  teamCopyAgentLaunch,
  teamMemberFollowsTeam,
} from "../dist/index.js";

const claude = { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus", llm_config: null, auto_execute_tools: false, workspace_root_path: "/w" };
const sonnet = { llm_model_identifier: "sonnet", llm_config: { thinking: "low" }, selected_at: "2026-10-13T00:00:00.000Z" };
const haiku = { llm_model_identifier: "haiku", llm_config: null, selected_at: "2026-10-13T00:00:00.000Z" };

test("copy and collaborator DTOs carry optional user choices; malformed ones are refused", () => {
  const agent = { kind: "task_agent", address: "/ie", agent_run_id: "ie", platform_agent_run_id: null, delegator_agent_run_id: "pm",
    started_at: "t", user_launch_selection: haiku };
  assert.deepEqual(taskAgentExecutionDtoSchema.parse(agent), agent);
  const team = { kind: "task_team", address: "/se", team_run_id: "copy", task_executions: [], delegator_agent_run_id: "pm", started_at: "t",
    members: [{ kind: "task_team_agent", address: "/se/lead", agent_run_id: "l", platform_agent_run_id: null, user_launch_selection: haiku }],
    user_team_launch_selection: sonnet };
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(team), team);
  const entry = { kind: "agent", address: "/r", agent_definition_id: "r", agent_run_id: "r", platform_agent_run_id: null,
    launch_configuration: claude, added_at: "t", added_via_agent_run_id: "pm", user_launch_selection: sonnet };
  assert.deepEqual(collaboratorEntryDtoSchema.parse(entry), entry);
  assert.throws(() => taskAgentExecutionDtoSchema.parse({ ...agent, user_launch_selection: { llm_model_identifier: "x", llm_config: null } }));
  const { user_launch_selection: _omitted, ...older } = agent;
  assert.deepEqual(taskAgentExecutionDtoSchema.parse(older), older);
});

test("the copy launch rule: own choice, else the followed Team's, else started; runtime and approval stay", () => {
  assert.deepEqual(teamCopyAgentLaunch({ started: claude }), { launch: claude, selected: null });
  assert.deepEqual(teamCopyAgentLaunch({ started: claude, followsTeam: false, teamSelection: sonnet }), { launch: claude, selected: null });
  assert.deepEqual(teamCopyAgentLaunch({ started: claude, followsTeam: true, teamSelection: sonnet }),
    { launch: { ...claude, llm_model_identifier: "sonnet", llm_config: { thinking: "low" } }, selected: "team" });
  assert.deepEqual(teamCopyAgentLaunch({ started: claude, followsTeam: true, teamSelection: sonnet, agentSelection: haiku }),
    { launch: { ...claude, llm_model_identifier: "haiku", llm_config: null }, selected: "agent" });
  assert.equal(teamMemberFollowsTeam({}), true);
  assert.equal(teamMemberFollowsTeam({ launch_configuration: claude }), false);
});
