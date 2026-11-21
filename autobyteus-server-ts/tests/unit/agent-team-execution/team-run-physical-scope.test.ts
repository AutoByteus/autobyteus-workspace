import { describe, expect, it } from "vitest";
import { TeamRunMembership } from "../../../src/agent-team-execution/domain/team-run-membership.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { address, testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

describe("TeamRunPhysicalScope", () => {
  it("builds immutable root, child, and deep scopes without mutating a parent", () => {
    const root = createRootTeamRunPhysicalScope(" root-run ");
    const child = createChildTeamRunPhysicalScope(root, " child-run ");
    const deep = createChildTeamRunPhysicalScope(child, "deep-run");

    expect(root).toEqual({ rootTeamRunId: "root-run", ancestorTeamRunIds: [] });
    expect(child).toEqual({ rootTeamRunId: "root-run", ancestorTeamRunIds: ["child-run"] });
    expect(deep).toEqual({
      rootTeamRunId: "root-run",
      ancestorTeamRunIds: ["child-run", "deep-run"],
    });
    expect(Object.isFrozen(deep)).toBe(true);
    expect(Object.isFrozen(deep.ancestorTeamRunIds)).toBe(true);
    expect(() => (deep.ancestorTeamRunIds as string[]).push("invalid")).toThrow();
  });

  it("rejects missing, root-repeated, and duplicate child TeamRun IDs", () => {
    const root = createRootTeamRunPhysicalScope("root-run");
    const child = createChildTeamRunPhysicalScope(root, "child-run");

    expect(() => createChildTeamRunPhysicalScope(undefined as never, "child-run"))
      .toThrow("physicalScope is required");
    expect(() => createRootTeamRunPhysicalScope(" ")).toThrow("rootTeamRunId is required");
    expect(() => createChildTeamRunPhysicalScope(root, "root-run"))
      .toThrow("must exclude the root");
    expect(() => createChildTeamRunPhysicalScope(child, "child-run"))
      .toThrow("must contain distinct");
  });

  it("requires the live context scope to end at its exact containing TeamRun", () => {
    const childNode = testAgentTeamNode({
      address: "/child",
      coordinatorAddress: "/child/worker",
      teamRunId: "child-run",
      children: [testAgentNode("/child/worker")],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/lead",
      children: [testAgentNode("/lead")],
    });
    expect(() => new TeamRunContext({
      physicalScope: createRootExecutionPhysicalScope({
        root: createTeamRootExecutionIdentity("root-run"),
        ancestorTeamRunIds: [],
      }),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      membership: new TeamRunMembership({ teamNode: childNode, handoffs: [] }),
      runtimeContext: null,
    })).toThrow("Physical scope contains TeamRun 'root-run', not 'child-run'");
    expect(() => new TeamRunContext({
      physicalScope: createRootExecutionPhysicalScope({
        root: createTeamRootExecutionIdentity("root-run"),
        ancestorTeamRunIds: [childNode.teamRunId],
      }),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      membership: new TeamRunMembership({ teamNode: config.rootTeam, handoffs: [] }),
      runtimeContext: null,
    })).toThrow("does not own TeamRun");
  });
});
