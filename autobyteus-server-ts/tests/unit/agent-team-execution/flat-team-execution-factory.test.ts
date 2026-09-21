import { describe, expect, it, vi } from "vitest";
import {
  createAgentOrgRootExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { testAgentNode, testAgentTeamNode } from "../../fixtures/current-team-run-fixtures.js";

const callbacks = Object.freeze({
  buildMemberExecutionContext: vi.fn(),
  publishAgentEvent: vi.fn(),
  commitPlatformBindingChange: vi.fn(),
});

const node = (address: "/" | "/ReviewTeam", teamRunId: string) => testAgentTeamNode({
  address,
  teamRunId,
  coordinatorAddress: `${address === "/" ? "" : address}/Lead`,
  children: [testAgentNode(`${address === "/" ? "" : address}/Lead`)],
});

describe("FlatTeamExecutionFactory", () => {
  it.each([
    {
      kind: "Team root",
      root: createTeamRootExecutionIdentity("team-root-run"),
      ancestors: [] as string[],
      teamNode: node("/", "team-root-run"),
    },
    {
      kind: "Org-mounted Team",
      root: createAgentOrgRootExecutionIdentity("org-root-run"),
      ancestors: ["mounted-team-run"],
      teamNode: node("/ReviewTeam", "mounted-team-run"),
    },
  ])("materializes one Agent-only $kind without a public root aggregate", async ({ root, ancestors, teamNode }) => {
    const physicalScope = createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: ancestors });
    const prepared = await new FlatTeamExecutionFactory().materialize({
      physicalScope,
      teamNode,
      handoffs: [],
      activationMode: "fresh",
      callbacks,
      prepareConfiguredAgents: false,
    });

    expect(prepared.teamRun.teamRunId).toBe(teamNode.teamRunId);
    expect(prepared.teamRun.context.physicalScope).toEqual(physicalScope);
    expect(prepared.teamRun.context.runtimeContext?.memberContexts.map((item) => item.address))
      .toEqual(teamNode.children.map((item) => item.address));
    expect(prepared.stagedPlatformBindings).toEqual([]);
    expect(prepared.stagedNoConversationBindingReplacements).toEqual([]);
    prepared.commitAfterDurability();
    expect(prepared.teamRun.isActive()).toBe(true);
  });

  it("rejects a configured child Team before any Agent activation", async () => {
    const root = createTeamRootExecutionIdentity("team-root-run");
    const teamNode = testAgentTeamNode({
      address: "/",
      teamRunId: "team-root-run",
      coordinatorAddress: "/Lead",
      children: [
        testAgentNode("/Lead"),
        testAgentTeamNode({
          address: "/Nested",
          teamRunId: "nested-run",
          coordinatorAddress: "/Nested/Worker",
          children: [testAgentNode("/Nested/Worker")],
        }),
      ],
    });
    await expect(new FlatTeamExecutionFactory().materialize({
      physicalScope: createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] }),
      teamNode,
      handoffs: [],
      activationMode: "fresh",
      callbacks,
      prepareConfiguredAgents: false,
    })).rejects.toThrow("cannot contain a configured Team");
    expect(callbacks.buildMemberExecutionContext).not.toHaveBeenCalled();
  });

  it("rejects an Org-mounted Team scope that omits its physical TeamRun ancestry", async () => {
    const root = createAgentOrgRootExecutionIdentity("org-root-run");
    await expect(new FlatTeamExecutionFactory().materialize({
      physicalScope: createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] }),
      teamNode: node("/ReviewTeam", "mounted-team-run"),
      handoffs: [],
      activationMode: "fresh",
      callbacks,
      prepareConfiguredAgents: false,
    })).rejects.toThrow("contains TeamRun 'none', not 'mounted-team-run'");
  });
});
