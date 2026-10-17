import test from "node:test";
import assert from "node:assert/strict";
import {
  collaborationMemberLaunchConfiguration,
  collaborationMemberLaunchSource,
  taskExecutionDtoSchema,
} from "../dist/index.js";

const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1" };
const fallback = { layer: "team_default", runtimeKind: null, llmModelIdentifier: "x", reason: "incomplete", detail: "It names no runtime." };
const team = {
  kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead",
  members: [
    { address: "/se/lead", agentDefinitionId: "lead" },
    { address: "/se/ie", agentDefinitionId: "ie", launchConfiguration: codex, launchSource: { origin: "agent_default", fallbacks: [] } },
  ],
  handoffs: [], defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [fallback] },
};

test("catalog-copy DTOs carry optional per-member launch values and sources", () => {
  const copy = {
    address: "/se", teamRunId: "copy", startedAt: "t", taskExecutions: [], delegatorAgentRunId: "pm",
    members: team.members.map((member, index) => ({ address: member.address, agentRunId: `run-${index}`, platformAgentRunId: null })),
    source: team,
  };
  assert.deepEqual(taskExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, source: { ...team, defaultLaunchSource: { origin: "inherited" } } }));
});

test("the effective member launch is the member's own, else the Team's; the source likewise, null when not recorded", () => {
  assert.equal(collaborationMemberLaunchConfiguration(team, team.members[0]), claude);
  assert.equal(collaborationMemberLaunchConfiguration(team, team.members[1]), codex);
  assert.deepEqual(collaborationMemberLaunchSource(team, team.members[0]), team.defaultLaunchSource);
  assert.equal(collaborationMemberLaunchSource({ defaultLaunchConfiguration: claude }, {}), null);
});
