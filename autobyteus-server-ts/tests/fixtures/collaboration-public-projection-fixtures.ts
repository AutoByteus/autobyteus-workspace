import { validateAgentRunCollaborationTreePayload } from "../../src/run-history/store/agent-run-collaboration-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testOrgAgentNode, testOrgTeamNode, testAgentOrgExecutionTree } from "./current-agent-org-run-fixtures.js";

export const projectionLaunch = {
  runtimeKind: "codex_app_server", llmModelIdentifier: "test-only-model",
  llmConfig: { reasoning_effort: "low", nested: { enabled: true, budget: 2, options: [null, "x"] } },
  autoExecuteTools: true, workspaceRootPath: "/tmp/test-owned-projection-workspace",
};
const startedAt = "2026-10-03T00:00:01.000Z";
const stamp = (linked: boolean, purpose: "assignment" | "delegation" | "helper" = "delegation") =>
  linked ? { taskLifetime: { lifetimeId: "task-owned-lifetime", purpose } } : {};
const taskAgent = (address: string, id: string, linked: boolean, delegatorAgentRunId?: string) => ({
  address, agentRunId: id, platformAgentRunId: `provider-${id}`, startedAt,
  ...(delegatorAgentRunId ? { delegatorAgentRunId } : {}), ...stamp(linked),
  source: { kind: "agent", agentDefinitionId: `definition-${id}`, launchConfiguration: projectionLaunch },
});
// Reader/DTO contract fixture: nested recorded members exercise recursive wire
// preservation, not real-provider reachability or completion certification.
const team = (linked: boolean) => ({
  address: "/packet", teamRunId: "packet-copy", startedAt, delegatorAgentRunId: "manager", ...stamp(linked, "assignment"),
  members: [
    { address: "/packet/lead", agentRunId: "packet-lead", platformAgentRunId: "provider-lead" },

  ],
  taskExecutions: [{ address: "/packet/subteam", teamRunId: "nested-task-team", startedAt, ...stamp(linked),
    members: [{ address: "/packet/nested", teamRunId: "nested-member",
      members: [{ address: "/packet/nested/worker", agentRunId: "nested-worker", platformAgentRunId: "provider-nested" }],
      taskExecutions: [taskAgent("/packet/nested/helper", "nested-helper", linked, "nested-worker")] }], taskExecutions: [] }, taskAgent("/packet/researcher", "follow-on-agent", linked, "packet-lead"), {
    address: "/packet/review", teamRunId: "follow-on-team", startedAt, ...stamp(linked, "helper"),
    members: [{ address: "/packet/review/lead", agentRunId: "review-lead", platformAgentRunId: null }],
    taskExecutions: [taskAgent("/packet/review/helper", "review-helper", linked, "review-lead")],
    source: { kind: "agent_team", teamDefinitionId: "review-definition", coordinatorAddress: "/packet/review/lead",
      members: [{ address: "/packet/review/lead", agentDefinitionId: "reviewer" }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },
  }],
  source: { kind: "agent_team", teamDefinitionId: "packet-definition", coordinatorAddress: "/packet/lead",
    members: [{ address: "/packet/lead", agentDefinitionId: "lead-definition" }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },

});
const collaborators = (linked: boolean) => [{
  kind: "agent", address: "/borrowed", agentDefinitionId: "borrowed-definition", agentRunId: "borrowed-run",
  platformAgentRunId: "borrowed-provider", launchConfiguration: projectionLaunch, addedAt: startedAt, addedViaAgentRunId: "manager",
}, {
  kind: "agent_team", address: "/shared", teamDefinitionId: "shared-definition", teamRunId: "shared-team",
  coordinatorAddress: "/shared/lead", members: [{ address: "/shared/lead", agentDefinitionId: "shared-lead-definition", agentRunId: "shared-lead", platformAgentRunId: "shared-provider" }],
  handoffs: [{ from: "/shared/lead", to: "/shared/lead", rules: ["deliver"] }], defaultLaunchConfiguration: projectionLaunch,
  taskExecutions: [taskAgent("/shared/helper", "shared-helper", linked, "shared-lead")],
  addedAt: startedAt, addedViaAgentRunId: "manager",
}];
export const agentProjectionTree = (linked: boolean) => validateAgentRunCollaborationTreePayload({
  subjectKind: "agent", createdAt: startedAt,
  host: { address: "/manager", agentRunId: "manager", agentDefinitionId: "manager-definition" },
  collaborators: collaborators(linked),
  taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), team(linked)],
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
    rootOrg: { ...base.rootOrg, defaultLaunchConfiguration: projectionLaunch, collaborators: collaborators(linked),
      taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), team(linked)] },
  }, "org-root");
};
