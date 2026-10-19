import test from "node:test";
import assert from "node:assert/strict";
import {
  collaborationMemberLaunchSource,
  taskExecutionDtoSchema,
} from "../dist/index.js";

const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1" };
const fallback = { layer: "team_default", runtimeKind: null, llmModelIdentifier: "x", reason: "incomplete", detail: "It names no runtime." };
const team = {
  kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead",
  members: [
    { address: "/se/lead", agentDefinitionId: "lead", launchConfiguration: claude, followsTeam: true },
    { address: "/se/ie", agentDefinitionId: "ie", launchConfiguration: codex, followsTeam: false, launchSource: { origin: "agent_default", fallbacks: [] } },
  ],
  handoffs: [], defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [fallback] },
};
const copy = {
  address: "/se", teamRunId: "copy", startedAt: "t", taskExecutions: [], delegatorAgentRunId: "pm",
  members: team.members.map((member, index) => ({ address: member.address, agentRunId: `run-${index}`, platformAgentRunId: null })),
  source: team,
};

test("Team copy DTOs carry each member's complete launch, whether it follows the Team, and optional sources", () => {
  assert.deepEqual(taskExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, source: { ...team, defaultLaunchSource: { origin: "inherited" } } }));
  const { followsTeam: _follows, ...noFollows } = team.members[0];
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, source: { ...team, members: [noFollows, team.members[1]] } }));
});

test("every copy carries its source; the configured origin is accepted", () => {
  const { source: _omitted, ...sourceless } = copy;
  assert.throws(() => taskExecutionDtoSchema.parse(sourceless));
  const configured = { ...copy, source: { ...team, defaultLaunchSource: { origin: "configured", fallbacks: [] } } };
  assert.deepEqual(taskExecutionDtoSchema.parse(configured), configured);
});

test("a member's launch source is its own, else the Team's; null when not recorded", () => {
  assert.deepEqual(collaborationMemberLaunchSource(team, team.members[1]), team.members[1].launchSource);
  assert.deepEqual(collaborationMemberLaunchSource(team, team.members[0]), team.defaultLaunchSource);
  assert.equal(collaborationMemberLaunchSource({}, {}), null);
});
