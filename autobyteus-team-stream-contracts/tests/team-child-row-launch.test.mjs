import test from "node:test";
import assert from "node:assert/strict";
import { taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema } from "../dist/index.js";

/** autobyteus-461 CR-461-007: a child row carries the launch its own run has; there is no recorded copy choice. */
const claude = { runtime_kind: "claude_agent_sdk", llm_model_identifier: "opus", llm_config: null, auto_execute_tools: false, workspace_root_path: "/w" };
const agentSource = { kind: "agent", agent_definition_id: "ie", launch_configuration: claude };
const teamSource = { kind: "agent_team", team_definition_id: "se", coordinator_address: "/se/lead", handoffs: [], default_launch_configuration: claude,
  members: [{ address: "/se/lead", agent_definition_id: "lead", launch_configuration: claude }] };
const choice = { llm_model_identifier: "haiku", llm_config: null, selected_at: "2026-10-13T00:00:00.000Z" };

test("a child row has its run's launch; a recorded copy choice is refused", () => {
  const agent = { kind: "task_agent", address: "/ie", agent_run_id: "ie", platform_agent_run_id: null, delegator_agent_run_id: "pm", started_at: "t", source: agentSource };
  assert.deepEqual(taskAgentExecutionDtoSchema.parse(agent), agent);
  assert.throws(() => taskAgentExecutionDtoSchema.parse({ ...agent, user_launch_selection: choice }));
  const team = { kind: "task_team", address: "/se", team_run_id: "copy", task_executions: [], delegator_agent_run_id: "pm", started_at: "t",
    members: [{ kind: "task_team_agent", address: "/se/lead", agent_run_id: "l", platform_agent_run_id: null }], source: teamSource };
  assert.deepEqual(taskTeamExecutionDtoSchema.parse(team), team);
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...team, user_team_launch_selection: choice }));
  assert.throws(() => taskTeamExecutionDtoSchema.parse({ ...team, members: [{ ...team.members[0], user_launch_selection: choice }] }));
});

