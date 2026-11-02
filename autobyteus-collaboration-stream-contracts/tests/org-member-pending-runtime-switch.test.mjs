import test from "node:test";
import assert from "node:assert/strict";
import { agentOrgExecutionTreeDtoSchema } from "../dist/index.js";

// autobyteus-348 (API/E2E): a stopped Org's member that has a saved, not yet activated agent runtime switch carries
// `pendingRuntimeSwitch` in the Org's execution tree (the server writes it on a direct Agent and on an Agent of a mounted
// Team). The web parses that tree with this schema when it reads or saves the Org's Settings; the schema must accept the field,
// or the Settings show a raw schema error after Save (seen in the rendered journey `runtime-switch-members-probe.mjs`, RSM-02/03).
const launch = (runtimeKind, llmModelIdentifier) => ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" });
const pending = {
  switchId: "5d6f8f6e-9a4c-4f6e-bd1c-5a1f7a3f2c11",
  from: { runtimeKind: "autobyteus", llmModelIdentifier: "native-model", llmConfig: null, platformAgentRunId: null },
};
const agent = (address, runId, runtimeKind, extra = {}) => ({
  address, agentDefinitionId: "agent-def", role: null, description: null, agentRunId: runId, platformAgentRunId: null,
  launchConfiguration: launch(runtimeKind, runtimeKind === "autobyteus" ? "native-model" : "gemini-model"), ...extra,
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
  defaultLaunchConfiguration: launch("autobyteus", "native-model"), members: [agent("/crew/lead", "lead-run", "autobyteus"), worker], taskExecutions: [],
});

test("an Org's direct Agent with a pending runtime switch is a valid Org tree", () => {
  const parsed = agentOrgExecutionTreeDtoSchema.parse(tree([agent("/direct", "direct-run", "antigravity_cli", { pendingRuntimeSwitch: pending })]));
  assert.equal(parsed.rootOrg.members[0].pendingRuntimeSwitch?.from.runtimeKind, "autobyteus");
});

test("an Agent of a mounted Team with a pending runtime switch is a valid Org tree", () => {
  const worker = agent("/crew/worker", "worker-run", "antigravity_cli", { pendingRuntimeSwitch: pending });
  const parsed = agentOrgExecutionTreeDtoSchema.parse(tree([crew(worker)]));
  assert.equal(parsed.rootOrg.members[0].members[1].pendingRuntimeSwitch?.switchId, pending.switchId);
});

test("a pending runtime switch must keep its shape", () => {
  assert.throws(() => agentOrgExecutionTreeDtoSchema.parse(tree([agent("/direct", "direct-run", "antigravity_cli", { pendingRuntimeSwitch: { switchId: "x" } })])));
});
