import test from "node:test";
import assert from "node:assert/strict";
import {
  collaborationMemberLaunchConfiguration,
  collaborationMemberLaunchSource,
  collaboratorEntryDtoSchema,
  taskExecutionDtoSchema,
} from "../dist/index.js";

const claude = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: false, workspaceRootPath: "/w" };
const codex = { ...claude, runtimeKind: "codex_app_server", llmModelIdentifier: "sol-6.1" };
const fallback = { layer: "team_default", runtimeKind: null, llmModelIdentifier: "x", reason: "incomplete", detail: "It names no runtime." };
const team = {
  kind: "agent_team", address: "/se", teamDefinitionId: "se", teamRunId: "se-run", coordinatorAddress: "/se/lead",
  members: [
    { address: "/se/lead", agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
    { address: "/se/ie", agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null,
      launchConfiguration: codex, launchSource: { origin: "agent_default", fallbacks: [] } },
  ],
  handoffs: [], defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [fallback] },
  taskExecutions: [], addedAt: "2026-10-12T00:00:00.000Z", addedViaAgentRunId: "pm",
};

test("collaborator and catalog-copy DTOs carry optional per-member launch values and sources", () => {
  assert.deepEqual(collaboratorEntryDtoSchema.parse(team), team);
  const agent = {
    kind: "agent", address: "/w", agentDefinitionId: "w", agentRunId: "w", platformAgentRunId: null, launchConfiguration: claude,
    launchSource: { origin: "inherited", fallbacks: [] }, addedAt: "t", addedViaAgentRunId: "pm",
  };
  assert.deepEqual(collaboratorEntryDtoSchema.parse(agent), agent);
  const copy = {
    address: "/se", teamRunId: "copy", members: [], taskExecutions: [], startedAt: "t",
    source: { kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead", handoffs: [],
      members: team.members.map(({ agentRunId, platformAgentRunId, ...member }) => member),
      defaultLaunchConfiguration: claude, defaultLaunchSource: team.defaultLaunchSource },
  };
  assert.deepEqual(taskExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => collaboratorEntryDtoSchema.parse({ ...team, defaultLaunchSource: { origin: "inherited" } }));
});

test("the effective member launch is the member's own, else the Team's; the source likewise, null when not recorded", () => {
  assert.equal(collaborationMemberLaunchConfiguration(team, team.members[0]), claude);
  assert.equal(collaborationMemberLaunchConfiguration(team, team.members[1]), codex);
  assert.deepEqual(collaborationMemberLaunchSource(team, team.members[0]), team.defaultLaunchSource);
  assert.equal(collaborationMemberLaunchSource({ defaultLaunchConfiguration: claude }, {}), null);
});
