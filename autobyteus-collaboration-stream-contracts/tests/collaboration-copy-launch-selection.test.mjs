import test from "node:test";
import assert from "node:assert/strict";
import {
  collaborationCopyAgentLaunch,
  agentOrgExecutionEventDtoSchema,
  agentRunCollaborationEventDtoSchema,
  taskExecutionDtoSchema,
} from "../dist/index.js";

const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const sonnet = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" }, selectedAt: "2026-10-13T00:00:00.000Z" };
const haiku = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt: "2026-10-13T00:00:00.000Z" };

const agentSource = { kind: "agent", agentDefinitionId: "ie", launchConfiguration: claude };
const teamSource = { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead", handoffs: [], defaultLaunchConfiguration: claude,
  members: [{ address: "/se/lead", agentDefinitionId: "lead", launchConfiguration: claude, followsTeam: true }] };

test("copy DTOs carry optional user choices; malformed ones are refused", () => {
  const agent = { address: "/ie", agentRunId: "ie", platformAgentRunId: null, delegatorAgentRunId: "pm", startedAt: "t", source: agentSource, userLaunchSelection: haiku };
  assert.deepEqual(taskExecutionDtoSchema.parse(agent), agent);
  const team = { address: "/se", teamRunId: "copy", taskExecutions: [], startedAt: "t", source: teamSource, userTeamLaunchSelection: sonnet,
    members: [{ address: "/se/lead", agentRunId: "l", platformAgentRunId: null, userLaunchSelection: haiku }] };
  assert.deepEqual(taskExecutionDtoSchema.parse(team), team);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...agent, userLaunchSelection: { llmModelIdentifier: "x" } }));
});

test("the copy launch rule: own choice, else the followed Team's, else started", () => {
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude }), { launch: claude, selected: null });
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude, followsTeam: true, teamSelection: sonnet }),
    { launch: { ...claude, llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" } }, selected: "team" });
  assert.deepEqual(collaborationCopyAgentLaunch({ started: claude, followsTeam: false, teamSelection: sonnet, agentSelection: haiku }),
    { launch: { ...claude, llmModelIdentifier: "haiku", llmConfig: null }, selected: "agent" });
});

test("a live Save's event carries each saved choice by run ID, on Org and Agent streams", () => {
  const event = { kind: "delegated_launch_selections_changed", selections: [{ agentRunId: "ie", selection: haiku }, { teamRunId: "se", selection: sonnet }] };
  assert.deepEqual(agentOrgExecutionEventDtoSchema.parse(event), event);
  assert.deepEqual(agentRunCollaborationEventDtoSchema.parse(event), event);
  assert.throws(() => agentOrgExecutionEventDtoSchema.parse({ ...event, selections: [] }));
  assert.throws(() => agentRunCollaborationEventDtoSchema.parse({ ...event, selections: [{ agentRunId: "ie", teamRunId: "se", selection: haiku }] }));
  assert.throws(() => agentOrgExecutionEventDtoSchema.parse({ ...event, selections: [{ agentRunId: "ie", selection: { llmModelIdentifier: "x" } }] }));
});
