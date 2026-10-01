import { describe, expect, it } from "vitest";
import { validateAgentOrgRunExecutionTreePayload } from "../../../src/run-history/store/agent-org-run-execution-tree-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import {
  testAgentOrgExecutionTree,
  testOrgAgentNode,
  testOrgLaunchConfiguration,
  testOrgTeamNode,
} from "../../fixtures/current-agent-org-run-fixtures.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

const launch = testOrgLaunchConfiguration();
const agentEntry = (address = "/code_reviewer", agentRunId = `${address.slice(1)}-run`) => ({
  kind: "agent", address, agentDefinitionId: "reviewer-def", agentRunId, platformAgentRunId: null,
  launchConfiguration: launch, addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "run-coordinator",
});
const teamEntry = (address = "/product_team", taskExecutions: unknown[] = []) => ({
  kind: "agent_team", address, teamDefinitionId: "product-team-def", teamRunId: `${address.slice(1)}-team-run`,
  coordinatorAddress: `${address}/lead`,
  members: [
    { address: `${address}/lead`, agentDefinitionId: "lead-def", agentRunId: `${address.slice(1)}-lead-run`, platformAgentRunId: null },
    { address: `${address}/designer`, agentDefinitionId: "designer-def", agentRunId: `${address.slice(1)}-designer-run`, platformAgentRunId: null },
  ],
  handoffs: [{ from: `${address}/lead`, to: `${address}/designer`, rules: ["When UI work is needed."] }],
  defaultLaunchConfiguration: launch,
  taskExecutions,
  addedAt: "2026-09-30T00:00:00.000Z", addedViaAgentRunId: "run-coordinator",
});
const keys = (value: unknown) => Object.keys(value as object).sort();

const teamTree = () => testExecutionTree({
  children: [testAgentNode("/coordinator")],
  coordinatorAddress: "/coordinator",
});
const withTeamRoot = (extra: Record<string, unknown>) => {
  const tree = teamTree();
  return { ...tree, rootTeam: { ...tree.rootTeam, ...extra } };
};

describe("collaborators in Team and Org execution trees", () => {
  it("reads a tree without collaborators as none and always writes the field", () => {
    const tree = teamTree();
    const { collaborators: _omitted, ...legacyRoot } = tree.rootTeam;
    const read = validateTeamRunExecutionTreePayload({ ...tree, rootTeam: legacyRoot }, tree.rootTeam.teamRunId);
    expect(read.rootTeam.collaborators).toEqual([]);
    expect(keys(read.rootTeam)).toContain("collaborators");
    expect(JSON.parse(JSON.stringify(read)).rootTeam.collaborators).toEqual([]);
  });

  it("keeps Agent and Team entries exactly, with their run identities", () => {
    const read = validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [agentEntry(), { ...teamEntry(), stray: true }],
    }));
    expect(read.rootTeam.collaborators.map(keys)).toEqual([
      ["addedAt", "addedViaAgentRunId", "address", "agentDefinitionId", "agentRunId", "kind", "launchConfiguration", "platformAgentRunId"],
      ["addedAt", "addedViaAgentRunId", "address", "coordinatorAddress", "defaultLaunchConfiguration", "handoffs", "kind", "members", "taskExecutions", "teamDefinitionId", "teamRunId"],
    ]);
    const team = read.rootTeam.collaborators[1]!;
    expect(team.kind === "agent_team" && team.members.map(keys)).toEqual([
      ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"],
      ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"],
    ]);
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [{ ...agentEntry(), agentRunId: undefined }],
    }))).toThrow("rootTeam.collaborators[0].agentRunId");
  });

  it("rejects run IDs that repeat across collaborators or collide with the tree", () => {
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [agentEntry("/a", "same-run"), agentEntry("/b", "same-run")],
    }))).toThrow("Duplicate run ID 'same-run'");
    const tree = teamTree();
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [agentEntry("/a", tree.rootTeam.members[0]!.agentRunId)],
    }))).toThrow("Duplicate run ID");
  });

  it("accepts a collaborator Team's own delegations inside its entry", () => {
    const read = validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [teamEntry("/product_team", [{
        address: "/product_team/designer", agentRunId: "designer-copy-run", platformAgentRunId: null,
        delegatorAgentRunId: "product_team-lead-run", startedAt: "2026-09-30T00:00:01.000Z",
      }])],
    }));
    const team = read.rootTeam.collaborators[0]!;
    expect(team.kind === "agent_team" && team.taskExecutions).toHaveLength(1);
  });

  it("rejects collisions, non-root addresses, bad layouts and mismatched task executions", () => {
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({ collaborators: [agentEntry("/coordinator")] })))
      .toThrow("collides with a configured placement");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({ collaborators: [agentEntry(), agentEntry()] })))
      .toThrow("Duplicate collaborator address");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({ collaborators: [agentEntry("/a/b")] })))
      .toThrow("root-level address");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [{ ...teamEntry(), coordinatorAddress: "/product_team/ghost" }],
    }))).toThrow("coordinatorAddress is not one of its members");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [{ ...teamEntry(), handoffs: [{ from: "/product_team/lead", to: "/coordinator", rules: ["x"] }] }],
    }))).toThrow("leaves the Team");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [teamEntry()],
      taskExecutions: [{
        address: "/product_team", agentRunId: "task-run", platformAgentRunId: null,
        delegatorAgentRunId: "run-coordinator", startedAt: "2026-09-30T00:00:01.000Z",
      }],
    }))).toThrow("must be a Team");
    expect(() => validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [teamEntry()],
      taskExecutions: [{
        address: "/product_team", teamRunId: "task-team-run",
        members: [{ address: "/product_team/lead", agentRunId: "lead-run", platformAgentRunId: null }],
        taskExecutions: [], delegatorAgentRunId: "run-coordinator", startedAt: "2026-09-30T00:00:01.000Z",
      }],
    }))).toThrow("does not match collaborator");
  });

  it("accepts a matching extra copy at the root of the tree", () => {
    const read = validateTeamRunExecutionTreePayload(withTeamRoot({
      collaborators: [teamEntry()],
      taskExecutions: [{
        address: "/product_team", teamRunId: "task-team-run",
        members: [
          { address: "/product_team/lead", agentRunId: "lead-run", platformAgentRunId: null },
          { address: "/product_team/designer", agentRunId: "designer-run", platformAgentRunId: null },
        ],
        taskExecutions: [], delegatorAgentRunId: "run-coordinator", startedAt: "2026-09-30T00:00:01.000Z",
      }],
    }));
    expect(read.rootTeam.taskExecutions).toHaveLength(1);
  });

  it("applies the same rules to Org trees, including mounted Team member addresses", () => {
    const org = testAgentOrgExecutionTree({
      orgRunId: "org-run",
      members: [
        testOrgAgentNode("/director", "director-run"),
        testOrgTeamNode({
          address: "/team", teamRunId: "team-run", coordinatorAddress: "/team/lead",
          members: [testOrgAgentNode("/team/lead", "team-lead-run")],
        }),
      ],
    });
    expect(org.rootOrg.collaborators).toEqual([]);
    const withCollaborators = (collaborators: unknown[]) => ({ ...org, rootOrg: { ...org.rootOrg, collaborators } });
    expect(validateAgentOrgRunExecutionTreePayload(withCollaborators([teamEntry()]), "org-run").rootOrg.collaborators)
      .toHaveLength(1);
    expect(() => validateAgentOrgRunExecutionTreePayload(withCollaborators([agentEntry("/team")]), "org-run"))
      .toThrow("collides with a configured placement");
  });
});
