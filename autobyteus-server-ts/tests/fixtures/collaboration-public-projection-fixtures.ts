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
// Reader/DTO contract fixture: a Team copy whose members delegate further (a Team copy that delegates an
// Agent, and follow-on copies). Every delegation is linked at the coordinating run's top level (CM-7,
// U-5): task Teams hold no task executions; every public field and every worker must survive.
const team = (linked: boolean) => [{
  address: "/packet", teamRunId: "packet-copy", startedAt, delegatorAgentRunId: "manager", ...stamp(linked, "assignment"),
  members: [
    { address: "/packet/lead", agentRunId: "packet-lead", platformAgentRunId: "provider-lead" },

  ],
  taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "packet-definition", coordinatorAddress: "/packet/lead",
    members: [{ address: "/packet/lead", agentDefinitionId: "lead-definition", launchConfiguration: projectionLaunch, followsTeam: true }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },
}, {
  address: "/packet/subteam", teamRunId: "delegated-subteam", startedAt, delegatorAgentRunId: "packet-lead", ...stamp(linked),
  members: [{ address: "/packet/subteam/worker", agentRunId: "subteam-worker", platformAgentRunId: "provider-subteam" }],
  taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "subteam-definition", coordinatorAddress: "/packet/subteam/worker",
    members: [{ address: "/packet/subteam/worker", agentDefinitionId: "worker-definition", launchConfiguration: projectionLaunch, followsTeam: true }], handoffs: [], defaultLaunchConfiguration: projectionLaunch },
},
taskAgent("/packet/subteam/helper", "subteam-helper", linked, "subteam-worker"),
taskAgent("/packet/researcher", "follow-on-agent", linked, "packet-lead"), {
  address: "/packet/review", teamRunId: "follow-on-team", startedAt, ...stamp(linked, "helper"),
  members: [{ address: "/packet/review/lead", agentRunId: "review-lead", platformAgentRunId: null }],
  taskExecutions: [],
  source: { kind: "agent_team", teamDefinitionId: "review-definition", coordinatorAddress: "/packet/review/lead",
    members: [{ address: "/packet/review/lead", agentDefinitionId: "reviewer", launchConfiguration: projectionLaunch, followsTeam: true }],
    handoffs: [], defaultLaunchConfiguration: projectionLaunch },
},
taskAgent("/packet/review/helper", "review-helper", linked, "review-lead")];
/** Root-level delegated runs started by `manager` for catalog Agents and Teams (formerly collaborators). */
const delegatedRuns = (linked: boolean) => [
  taskAgent("/borrowed", "borrowed-run", linked, "manager"),
  {
    address: "/shared", teamRunId: "shared-team", startedAt, delegatorAgentRunId: "manager", ...stamp(linked),
    members: [{ address: "/shared/lead", agentRunId: "shared-lead", platformAgentRunId: "shared-provider" }],
    taskExecutions: [],
    source: { kind: "agent_team", teamDefinitionId: "shared-definition", coordinatorAddress: "/shared/lead",
      members: [{ address: "/shared/lead", agentDefinitionId: "shared-lead-definition", launchConfiguration: projectionLaunch, followsTeam: true }],
      handoffs: [{ from: "/shared/lead", to: "/shared/lead", rules: ["deliver"] }], defaultLaunchConfiguration: projectionLaunch },
  },
  taskAgent("/shared/helper", "shared-helper", linked, "shared-lead"),
];
/** A remote run the manager delegated to on a peer node (CM-10): in memory only, never in a public tree (S3). */
export const REMOTE_RUN_ID = "remote-publisher-run";
const remoteRuns = [{ address: "/publisher", agentRunId: REMOTE_RUN_ID, nodeId: "srv_test_peer", delegatorAgentRunId: "manager", startedAt }];
/** A composed tree without its in-memory remote links: exactly the strict public shape. */
export const withoutRemoteLinks = <T extends Record<string, any>>(tree: T): T => {
  const strip = ({ remoteTaskExecutions: _remote, ...rest }: Record<string, unknown>) => rest;
  return (tree.rootOrg ? { ...tree, rootOrg: strip(tree.rootOrg) } : strip(tree)) as T;
};
export const agentProjectionTree = (linked: boolean) => validateStandaloneRootTreePayload({
  subjectKind: "agent", createdAt: startedAt,
  host: { address: "/manager", agentRunId: "manager", agentDefinitionId: "manager-definition" },
  taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), ...team(linked), ...delegatedRuns(linked)],
  remoteTaskExecutions: remoteRuns,
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
      taskExecutions: [taskAgent("/solo", "solo-copy", linked, "manager"), ...team(linked), ...delegatedRuns(linked)],
      remoteTaskExecutions: remoteRuns },
  }, "org-root");
};
