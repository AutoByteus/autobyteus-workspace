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
    { address: "/se/lead", agentDefinitionId: "lead", launchConfiguration: claude },
    { address: "/se/ie", agentDefinitionId: "ie", launchConfiguration: codex, launchSource: { origin: "agent_default", fallbacks: [] } },
  ],
  handoffs: [], defaultLaunchConfiguration: claude, defaultLaunchSource: { origin: "inherited", fallbacks: [fallback] },
};
const copy = {
  address: "/se", teamRunId: "copy", startedAt: "t", taskExecutions: [], delegatorAgentRunId: "pm",
  members: team.members.map((member, index) => ({ address: member.address, agentRunId: `run-${index}`, platformAgentRunId: null })),
  source: team,
};

test("Team copy DTOs carry each member's complete launch and optional sources, and no follower flag (CR-461-089)", () => {
  assert.deepEqual(taskExecutionDtoSchema.parse(copy), copy);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, source: { ...team, defaultLaunchSource: { origin: "inherited" } } }));
  // autobyteus-461 CR-461-089: a Team-level choice is the Team's default only; no member says it follows the Team.
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, source: { ...team, members: [{ ...team.members[0], followsTeam: true }, team.members[1]] } }));
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

test("SR-083: a row may carry where it opens (its run and the agent to focus), or null for a row error", () => {
  const opened = { ...copy, openTarget: { runKind: "agent_team", runId: "copy", agentRunId: "run-0" } };
  assert.deepEqual(taskExecutionDtoSchema.parse(opened), opened);
  assert.deepEqual(taskExecutionDtoSchema.parse({ ...copy, openTarget: null }).openTarget, null);
  assert.throws(() => taskExecutionDtoSchema.parse({ ...copy, openTarget: { runKind: "agent_team", runId: "copy" } }));
});
