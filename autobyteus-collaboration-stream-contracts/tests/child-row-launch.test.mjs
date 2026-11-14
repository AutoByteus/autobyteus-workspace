import test from "node:test";
import assert from "node:assert/strict";
import { taskExecutionDtoSchema } from "../dist/index.js";

/** autobyteus-461 CR-461-007: a child row carries the launch its own run has; there is no recorded copy choice. */
const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const agentSource = { kind: "agent", agentDefinitionId: "ie", launchConfiguration: claude };
const teamSource = { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead", handoffs: [], defaultLaunchConfiguration: claude,
  members: [{ address: "/se/lead", agentDefinitionId: "lead", launchConfiguration: claude }] };
const choice = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt: "2026-10-13T00:00:00.000Z" };

test("a child row has its run's launch; a recorded copy choice is refused", () => {
  const agent = { address: "/ie", agentRunId: "ie", platformAgentRunId: null, delegatorAgentRunId: "pm", startedAt: "t", source: agentSource };
  assert.deepEqual(taskExecutionDtoSchema.parse(agent), agent);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...agent, userLaunchSelection: choice }));
  const team = { address: "/se", teamRunId: "copy", taskExecutions: [], startedAt: "t", source: teamSource,
    members: [{ address: "/se/lead", agentRunId: "l", platformAgentRunId: null }] };
  assert.deepEqual(taskExecutionDtoSchema.parse(team), team);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...team, userTeamLaunchSelection: choice }));
  assert.throws(() => taskExecutionDtoSchema.parse({ ...team, members: [{ ...team.members[0], userLaunchSelection: choice }] }));
});
