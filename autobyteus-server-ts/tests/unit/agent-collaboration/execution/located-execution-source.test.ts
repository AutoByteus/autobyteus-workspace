import { describe, expect, it } from "vitest";
import {
  locatedExecutionSource,
  locatedLaunchConfiguration,
  tagTeamAgentExecution,
  type LocatedCollaborationAgentExecution,
} from "../../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import type { LocatedTeamAgentExecution } from "../../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgLaunchConfiguration,
  testOrgTeamNode,
} from "../../../fixtures/current-agent-org-run-fixtures.js";

/**
 * `locatedExecutionSource` (AR-002): the one owner of "what a located execution runs with" — its
 * configured placement, else its catalog-copy source recorded in the located tree — for all three
 * families. `locatedLaunchConfiguration` delegates to it, so a team's or org's task agent keeps its
 * own launch workspace.
 */
const T0 = "2026-10-19T00:00:00.000Z";
const copyLaunch = (workspaceRootPath: string) => testOrgLaunchConfiguration(workspaceRootPath);
const catalogCopy = (address: string, agentRunId: string, delegatorAgentRunId: string, workspaceRootPath: string) => ({
  address, agentRunId, platformAgentRunId: null, delegatorAgentRunId, startedAt: T0,
  source: { kind: "agent", agentDefinitionId: `definition-${agentRunId}`, launchConfiguration: copyLaunch(workspaceRootPath) },
});

const teamBase = testExecutionTree({
  rootTeamRunId: "team-1",
  coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "team-lead", workspaceRootPath: "/ws/team" })],
});
const teamTree = validateTeamRunExecutionTreePayload({
  ...teamBase,
  rootTeam: { ...teamBase.rootTeam, taskExecutions: [catalogCopy("/reviewer", "team-copy", "team-lead", "/ws/team-copy")] },
}, "team-1");
const teamLocation = (agentRunId: string, configured: boolean): LocatedTeamAgentExecution => ({
  rootTeamRunId: "team-1",
  containingTeamRunId: "team-1",
  ancestorTeamRunIds: [],
  agentRunId,
  memberAddress: "/lead" as never,
  configuredPlacement: configured ? teamTree.rootTeam.members[0] as never : null,
  executionKind: configured ? "configured" : "task",
  startedAt: null,
  groupPath: [],
  memoryDir: `/memory/${agentRunId}`,
  tree: teamTree,
  isActive: false,
});

const director = testOrgAgentNode("/director", "org-director");
const mountedLead = testOrgAgentNode("/delivery/lead", "org-lead");
const orgBase = testAgentOrgExecutionTree({
  orgRunId: "org-1",
  members: [director, testOrgTeamNode({ address: "/delivery", teamRunId: "org-team", coordinatorAddress: "/delivery/lead", members: [mountedLead] })],
});
const orgTree = validateAgentOrgRunExecutionTreePayload({
  ...orgBase,
  rootOrg: {
    ...orgBase.rootOrg,
    members: orgBase.rootOrg.members.map((member) => "teamRunId" in member
      ? { ...member, taskExecutions: [catalogCopy("/delivery/tester", "org-team-copy", "org-lead", "/ws/org-team-copy")] }
      : member),
    taskExecutions: [catalogCopy("/analyst", "org-copy", "org-director", "/ws/org-copy")],
  },
}, "org-1");
const orgLocation = (agentRunId: string, configuredPlacement: unknown): LocatedCollaborationAgentExecution => ({
  rootSubjectKind: "agent_org",
  rootRunId: "org-1",
  agentRunId,
  configuredPlacement,
  tree: orgTree,
}) as never;

const hubLocation = (agentRunId: string): LocatedCollaborationAgentExecution => ({
  rootSubjectKind: "agent",
  rootRunId: "hub",
  agentRunId,
  configuredPlacement: null,
  launchConfiguration: null,
  tree: {
    subjectKind: "agent",
    createdAt: T0,
    host: { address: "/host", agentRunId: "hub", agentDefinitionId: "host" },
    taskExecutions: [catalogCopy("/writer", "hub-copy", "hub", "/ws/hub-copy")],
  },
}) as never;

describe("locatedExecutionSource", () => {
  it("returns a configured member's placement", () => {
    const location = tagTeamAgentExecution(teamLocation("team-lead", true));
    expect(locatedExecutionSource(location)).toBe(teamTree.rootTeam.members[0]);
    expect(locatedLaunchConfiguration(location)?.workspaceRootPath).toBe("/ws/team");
    expect(locatedExecutionSource(orgLocation("org-director", director))).toBe(director);
  });

  it("returns a team task agent's catalog source from the root team's task executions", () => {
    const location = tagTeamAgentExecution(teamLocation("team-copy", false));
    expect(locatedExecutionSource(location)).toEqual({
      agentDefinitionId: "definition-team-copy",
      launchConfiguration: copyLaunch("/ws/team-copy"),
    });
    expect(locatedLaunchConfiguration(location)?.workspaceRootPath).toBe("/ws/team-copy");
  });

  it("returns an org task agent's catalog source from the org root's and from a member team's task executions", () => {
    expect(locatedExecutionSource(orgLocation("org-copy", null))).toEqual({
      agentDefinitionId: "definition-org-copy",
      launchConfiguration: copyLaunch("/ws/org-copy"),
    });
    expect(locatedLaunchConfiguration(orgLocation("org-team-copy", null))?.workspaceRootPath).toBe("/ws/org-team-copy");
  });

  it("returns a hub copy's catalog source", () => {
    expect(locatedExecutionSource(hubLocation("hub-copy"))).toEqual({
      agentDefinitionId: "definition-hub-copy",
      launchConfiguration: copyLaunch("/ws/hub-copy"),
    });
    expect(locatedLaunchConfiguration(hubLocation("hub-copy"))?.workspaceRootPath).toBe("/ws/hub-copy");
  });

  it("returns null for an execution with neither a placement nor a catalog source in its tree", () => {
    expect(locatedExecutionSource(tagTeamAgentExecution(teamLocation("unknown-run", false)))).toBeNull();
    expect(locatedLaunchConfiguration(orgLocation("unknown-run", null))).toBeNull();
    expect(locatedExecutionSource(hubLocation("unknown-run"))).toBeNull();
  });
});

describe("tagTeamAgentExecution", () => {
  it("tags a team location with its root TeamRun", () => {
    expect(tagTeamAgentExecution(teamLocation("team-lead", true))).toMatchObject({
      rootSubjectKind: "agent_team",
      rootRunId: "team-1",
      rootTeamRunId: "team-1",
      agentRunId: "team-lead",
    });
  });
});
