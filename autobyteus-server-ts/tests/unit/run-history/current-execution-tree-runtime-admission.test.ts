import { describe, expect, it } from "vitest";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { testAgentNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgTeamNode,
} from "../../fixtures/current-agent-org-run-fixtures.js";

describe("current Team/Org execution-tree runtime admission", () => {
  it("admits AGY at the Team root and configured member during current launch and reload validation", () => {
    const coordinator = testAgentNode("/coordinator", {
      runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
      workspaceRootPath: "/workspace",
    });
    const member = testAgentNode("/member", {
      runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
      workspaceRootPath: "/workspace",
    });
    const tree = buildInitialTeamRunExecutionTree({
      config: testTeamRunConfig({ children: [coordinator, member], coordinatorAddress: coordinator.address }),
      teamDefinitionName: "AGY Team",
      createdAt: "2026-09-24T00:00:00.000Z",
    });

    expect(tree.rootTeam.defaultLaunchConfiguration.runtimeKind).toBe(RuntimeKind.ANTIGRAVITY_CLI);
    expect(tree.rootTeam.members.map((agent) => agent.launchConfiguration.runtimeKind))
      .toEqual([RuntimeKind.ANTIGRAVITY_CLI, RuntimeKind.ANTIGRAVITY_CLI]);
    expect(validateTeamRunExecutionTreePayload(tree, tree.rootTeam.teamRunId)).toEqual(tree);
  });

  it("admits AGY at Org root, direct Agent, nested Team and nested Agent scopes", () => {
    const direct = testOrgAgentNode("/director", "director-run");
    const lead = testOrgAgentNode("/software/lead", "lead-run");
    const team = testOrgTeamNode({
      address: "/software", teamRunId: "software-run",
      coordinatorAddress: lead.address, members: [lead],
    });
    const base = testAgentOrgExecutionTree({ orgRunId: "agy-org-run", members: [direct, team] });
    const agy = (launch: typeof base.rootOrg.defaultLaunchConfiguration) => ({
      ...launch, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
    });
    const tree = validateAgentOrgRunExecutionTreePayload({
      ...base,
      rootOrg: {
        ...base.rootOrg,
        defaultLaunchConfiguration: agy(base.rootOrg.defaultLaunchConfiguration),
        members: [
          { ...direct, launchConfiguration: agy(direct.launchConfiguration) },
          { ...team, defaultLaunchConfiguration: agy(team.defaultLaunchConfiguration),
            members: [{ ...lead, launchConfiguration: agy(lead.launchConfiguration) }] },
        ],
      },
    }, base.rootOrg.orgRunId);

    expect(tree.rootOrg.defaultLaunchConfiguration.runtimeKind).toBe(RuntimeKind.ANTIGRAVITY_CLI);
    expect(tree.rootOrg.members[0]).toMatchObject({ launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } });
    expect(tree.rootOrg.members[1]).toMatchObject({
      defaultLaunchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI },
      members: [{ launchConfiguration: { runtimeKind: RuntimeKind.ANTIGRAVITY_CLI } }],
    });
  });

  it("continues to reject unsupported runtime values in current trees", () => {
    const coordinator = testAgentNode("/coordinator");
    const tree = buildInitialTeamRunExecutionTree({
      config: testTeamRunConfig({ children: [coordinator], coordinatorAddress: coordinator.address }),
      teamDefinitionName: "Known Team",
      createdAt: "2026-09-24T00:00:00.000Z",
    });
    expect(() => validateTeamRunExecutionTreePayload({
      ...tree,
      rootTeam: {
        ...tree.rootTeam,
        defaultLaunchConfiguration: { ...tree.rootTeam.defaultLaunchConfiguration, runtimeKind: "unknown" },
      },
    })).toThrow("rootTeam.defaultLaunchConfiguration.runtimeKind is unsupported.");
  });
});
