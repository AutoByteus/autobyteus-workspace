import test from "node:test";
import assert from "node:assert/strict";
import { agentOrgExecutionTreeDtoSchema } from "../dist/index.js";

// autobyteus-348 (API/E2E, revised after CRR-004): the approved wire decision keeps a member's `pendingRuntimeSwitch` OFF the wire.
// The server removes it when it projects an Org's configuration for the web (`agent-org-run-config-wire.test.ts`), so the strict
// Org tree contract must keep rejecting the field: a tree that carries it is a stored tree, not a wire tree. The first version of
// this test asserted the opposite (it was written when the rendered Save showed a schema error) and is replaced.
const launch = (runtimeKind, llmModelIdentifier) => ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" });
const pending = {
  switchId: "5d6f8f6e-9a4c-4f6e-bd1c-5a1f7a3f2c11",
  from: { runtimeKind: "autobyteus", llmModelIdentifier: "native-model", llmConfig: null, platformAgentRunId: null },
};
const agent = (address, runId, extra = {}) => ({
  address, agentDefinitionId: "agent-def", role: null, description: null, agentRunId: runId, platformAgentRunId: null,
  launchConfiguration: launch("antigravity_cli", "gemini-model"), ...extra,
});
const tree = (members) => ({
  subjectKind: "agent_org", createdAt: "2026-11-02T00:00:00.000Z", archivedAt: null, applicationBinding: null, handoffs: [],
  rootOrg: {
    address: "/", orgDefinitionId: "org-def", orgDefinitionName: "Org", orgRunId: "org-run",
    defaultLaunchConfiguration: launch("autobyteus", "native-model"), members, taskExecutions: [],
  },
});
const crew = (worker) => ({
  address: "/crew", teamDefinitionId: "team-def", role: null, description: null, teamRunId: "team-run", coordinatorAddress: "/crew/lead",
  defaultLaunchConfiguration: launch("autobyteus", "native-model"), members: [agent("/crew/lead", "lead-run"), worker], taskExecutions: [],
});

test("a wire Org tree of members without a pending switch is valid", () => {
  assert.equal(agentOrgExecutionTreeDtoSchema.parse(tree([agent("/direct", "direct-run"), crew(agent("/crew/worker", "worker-run"))])).rootOrg.members.length, 2);
});

test("a direct Agent that carries pendingRuntimeSwitch is not a wire tree", () => {
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse(tree([agent("/direct", "direct-run", { pendingRuntimeSwitch: pending })])));
});

test("an Agent of a mounted Team that carries pendingRuntimeSwitch is not a wire tree", () => {
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse(tree([crew(agent("/crew/worker", "worker-run", { pendingRuntimeSwitch: pending }))])));
});
