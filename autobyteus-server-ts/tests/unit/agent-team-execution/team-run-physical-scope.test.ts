import { describe, expect, it } from "vitest";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamExecutionIndex } from "../../../src/agent-team-execution/services/team-execution-index.js";
import { address, testAgentNode, testAgentTeamNode, testExecutionTree, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

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
      children: [testAgentNode("/lead"), childNode],
    });
    expect(() => new TeamRunContext({
      physicalScope: createRootTeamRunPhysicalScope("root-run"),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: childNode,
      runtimeContext: null,
    })).toThrow("Physical scope contains TeamRun 'root-run', not 'child-run'");
    expect(() => new TeamRunContext({
      physicalScope: createChildTeamRunPhysicalScope(
        createRootTeamRunPhysicalScope("root-run"),
        childNode.teamRunId,
      ),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      runtimeContext: null,
    })).toThrow("does not own TeamRun");
  });
});

describe("TeamExecutionIndex physical scope", () => {
  it("derives one root-exclusive configured and delegated TeamRun chain", () => {
    const deepAgent = testAgentNode("/child/deep/worker", { agentRunId: "deep-agent" });
    const tree = testExecutionTree({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/lead",
      children: [
        testAgentNode("/lead", { agentRunId: "root-agent" }),
        testAgentTeamNode({
          address: "/child",
          coordinatorAddress: "/child/worker",
          teamRunId: "child-run",
          children: [
            testAgentNode("/child/worker", { agentRunId: "child-agent" }),
            testAgentTeamNode({
              address: "/child/deep",
              coordinatorAddress: deepAgent.address,
              teamRunId: "deep-run",
              children: [deepAgent],
            }),
          ],
        }),
      ],
    });
    const withTasks = {
      ...tree,
      rootTeam: {
        ...tree.rootTeam,
        taskExecutions: [
          {
            address: address("/lead"),
            agentRunId: "task-agent",
            platformAgentRunId: null,
            startedAt: "2026-08-23T00:00:00.000Z",
            settledAt: null,
          },
          {
            address: address("/child"),
            teamRunId: "task-team-run",
            startedAt: "2026-08-23T00:00:00.000Z",
            settledAt: null,
            members: [{
              address: address("/child/worker"),
              agentRunId: "task-team-agent",
              platformAgentRunId: null,
            }],
            taskExecutions: [],
          },
        ],
      },
    } as const;
    const index = new TeamExecutionIndex(withTasks);

    expect(index.getTeamRunPhysicalScope("root-run").ancestorTeamRunIds).toEqual([]);
    expect(index.getTeamRunPhysicalScope("child-run").ancestorTeamRunIds).toEqual(["child-run"]);
    expect(index.getTeamRunPhysicalScope("deep-run").ancestorTeamRunIds)
      .toEqual(["child-run", "deep-run"]);
    expect(index.getTeamRunPhysicalScope(index.requireAgent("task-agent").containingTeamRunId)
      .ancestorTeamRunIds).toEqual([]);
    expect(index.getTeamRunPhysicalScope(index.requireAgent("task-team-agent").containingTeamRunId)
      .ancestorTeamRunIds).toEqual(["task-team-run"]);
  });
});
