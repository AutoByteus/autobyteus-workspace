import { validateStandaloneRootTreePayload } from "../../src/standalone-agent-run-root/persistence/standalone-root-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testOrgAgentNode, testOrgTeamNode, testAgentOrgExecutionTree } from "./current-agent-org-run-fixtures.js";

export const projectionLaunch = {
  runtimeKind: "codex_app_server", llmModelIdentifier: "test-only-model",
  llmConfig: { reasoning_effort: "low", nested: { enabled: true, budget: 2, options: [null, "x"] } },
  autoExecuteTools: true, workspaceRootPath: "/tmp/test-owned-projection-workspace",
};
const startedAt = "2026-10-03T00:00:01.000Z";
/** `linked`: dev data from unshipped ticket builds carried a `taskLifetime` field; the current tolerant reader drops it (C-1). */
const stamp = (linked: boolean, purpose: "assignment" | "delegation" | "helper" = "delegation") =>
  linked ? { taskLifetime: { lifetimeId: "task-owned-lifetime", purpose } } : {};
const taskAgent = (address: string, id: string, linked: boolean, delegatorAgentRunId?: string) => ({
  address, agentRunId: id, platformAgentRunId: `provider-${id}`, startedAt,
  ...(delegatorAgentRunId ? { delegatorAgentRunId } : {}), ...stamp(linked),
  source: { kind: "agent", agentDefinitionId: `definition-${id}`, launchConfiguration: projectionLaunch },
});
// Reader/DTO contract fixture: a delegation forest (a Team copy that delegates a Team copy that
// delegates an Agent) exercises recursive wire preservation, not real-provider reachability.
const team = (linked: boolean) => ({
  address: "/packet", teamRunId: "packet-copy", startedAt, delegatorAgentRunId: "manager", ...stamp(linked, "assignment"),
  members: [
    { address: "/packet/lead", agentRunId: "packet-lead", platformAgentRunId: "provider-lead" },

  ],
  taskExecutions: [{ address: "/packet/subteam", teamRunId: "delegated-subteam", startedAt, delegatorAgentRunId: "packet-lead", ...stamp(linked),
    members: [{ address: "/packet/subteam/worker", agentRunId: "subteam-worker", platformAgentRunId: "provider-subteam" }],
    taskExecutions: [taskAgent("/packet/subteam/helper", "subteam-helper", linked, "subteam-worker")] }, taskAgent("/packet/researcher", "follow-on-agent", linked, "packet-lead"), {
    address: "/packet/review", teamRunId: "follow-on-team", startedAt, ...stamp(linked, "helper"),
    members: [{ address: "/packet/review/lead", agentRunId: "review-lead", platformAgentRunId: null }],
    taskExecutions: [taskAgent("/packet/review/helper", "review-helper", linked, "review-lead")],
    source: { kind: "agent_team", teamDefinitionId: "review-definition", coordinatorAddress: "/packet/review/lead",
      members: [{ address: "/packet/review/lead", agentDefinitionId: "reviewer" }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },
  }],
  source: { kind: "agent_team", teamDefinitionId: "packet-definition", coordinatorAddress: "/packet/lead",
    members: [{ address: "/packet/lead", agentDefinitionId: "lead-definition" }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },

});
/** Root-level delegated runs started by `manager` for catalog Agents and Teams (formerly collaborators). */
const delegatedRuns = (linked: boolean) => [
  taskAgent("/borrowed", "borrowed-run", linked, "manager"),
  {
    address: "/shared", teamRunId: "shared-team", startedAt, delegatorAgentRunId: "manager", ...stamp(linked),
    members: [{ address: "/shared/lead", agentRunId: "shared-lead", platformAgentRunId: "shared-provider" }],
    taskExecutions: [taskAgent("/shared/helper", "shared-helper", linked, "shared-lead")],
    source: { kind: "agent_team", teamDefinitionId: "shared-definition", coordinatorAddress: "/shared/lead",
      members: [{ address: "/shared/lead", agentDefinitionId: "shared-lead-definition" }],
      handoffs: [{ from: "/shared/lead", to: "/shared/lead", rules: ["deliver"] }], defaultLaunchConfiguration: projectionLaunch },
  },
];
export const agentProjectionTree = (linked: boolean) => validateStandaloneRootTreePayload({
  subjectKind: "agent", createdAt: startedAt,
  host: { address: "/manager", agentRunId: "manager", agentDefinitionId: "manager-definition" },
  taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), team(linked), ...delegatedRuns(linked)],
}, "manager");
export const orgProjectionTree = (linked: boolean) => {
  const base = testAgentOrgExecutionTree({ orgRunId: "org-root", members: [testOrgAgentNode("/manager", "manager"), {
    ...testOrgTeamNode({ address: "/configured", teamRunId: "configured-team", coordinatorAddress: "/configured/lead",
      members: [testOrgAgentNode("/configured/lead", "configured-lead")] }),
    role: "Delivery", description: "Configured Team", defaultLaunchConfiguration: projectionLaunch,
    taskExecutions: [taskAgent("/configured/helper", "configured-helper", linked, "configured-lead")],
  }] });
  return validateAgentOrgRunExecutionTreePayload({
    ...base, archivedAt: "2026-10-03T01:00:00.000Z", applicationBinding: { applicationId: "app", bindingId: "binding" },
    handoffs: [{ from: "/manager", to: "/configured/lead", rules: ["coordinate"] }],
    rootOrg: { ...base.rootOrg, defaultLaunchConfiguration: projectionLaunch,
      taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), team(linked), ...delegatedRuns(linked)] },
  }, "org-root");
};
