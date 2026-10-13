import test from "node:test";
import assert from "node:assert/strict";
import {
  collaborationCopyAgentLaunch,
  collaborationMemberFollowsTeam,
  collaboratorEntryDtoSchema,
  taskExecutionDtoSchema,
} from "../dist/index.js";

const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const sonnet = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" }, selectedAt: "2026-10-13T00:00:00.000Z" };
const haiku = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt: "2026-10-13T00:00:00.000Z" };

test("copy and collaborator DTOs carry optional user choices; malformed ones are refused", () => {
  const agent = { address: "/ie", agentRunId: "ie", platformAgentRunId: null, delegatorAgentRunId: "pm", startedAt: "t", userLaunchSelection: haiku };
  assert.deepEqual(taskExecutionDtoSchema.parse(agent), agent);
  const team = { address: "/se", teamRunId: "copy", taskExecutions: [], startedAt: "t", userTeamLaunchSelection: sonnet,
    members: [{ address: "/se/lead", agentRunId: "l", platformAgentRunId: null, userLaunchSelection: haiku }] };
  assert.deepEqual(taskExecutionDtoSchema.parse(team), team);
  const entry = { kind: "agent_team", address: "/se", teamDefinitionId: "se", teamRunId: "se-run", coordinatorAddress: "/se/lead",
    members: [{ address: "/se/lead", agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null, userLaunchSelection: haiku }],
    handoffs: [], defaultLaunchConfiguration: claude, taskExecutions: [], addedAt: "t", addedViaAgentRunId: "pm", userTeamLaunchSelection: sonnet };
  assert.deepEqual(collaboratorEntryDtoSchema.parse(entry), entry);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...agent, userLaunchSelection: { llmModelIdentifier: "x" } }));
});

test("the copy launch rule: own choice, else the followed Team's, else started", () => {
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude }), { launch: claude, selected: null });
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude, followsTeam: true, teamSelection: sonnet }),
    { launch: { ...claude, llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" } }, selected: "team" });
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude, followsTeam: false, teamSelection: sonnet, agentSelection: haiku }),
    { launch: { ...claude, llmModelIdentifier: "haiku", llmConfig: null }, selected: "agent" });
  assert.equal(collaborationMemberFollowsTeam({}), true);
  assert.equal(collaborationMemberFollowsTeam({ launchConfiguration: claude }), false);
});
