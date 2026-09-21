import { describe, expect, it } from "vitest";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamExecutionIndex } from "../../../src/agent-team-execution/services/team-execution-index.js";
import { createRootExecutionPhysicalScope, createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { addTaskExecutionToTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js";
import { projectTaskTeamExecution } from "../../../src/agent-team-execution/task-delegation/task-execution-tree-projection.js";
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
      children: [testAgentNode("/lead")],
    });
    expect(() => new TeamRunContext({
      physicalScope: createRootExecutionPhysicalScope({
        root: createTeamRootExecutionIdentity("root-run"),
        ancestorTeamRunIds: [],
      }),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: childNode,
      runtimeContext: null,
    })).toThrow("Physical scope contains TeamRun 'root-run', not 'child-run'");
    expect(() => new TeamRunContext({
      physicalScope: createRootExecutionPhysicalScope({
        root: createTeamRootExecutionIdentity("root-run"),
        ancestorTeamRunIds: [childNode.teamRunId],
      }),
      teamRunId: childNode.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: config.rootTeam,
      runtimeContext: null,
    })).toThrow("does not own TeamRun");
  });
});

describe("TeamExecutionIndex physical scope", () => {
  it("derives one root-exclusive recursive task TeamRun chain", () => {
    const baseTree = testExecutionTree({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "root-agent" })],
    });
    let withTasks = addTaskExecutionToTree({
      tree: baseTree,
      ownerTeamRunId: "root-run",
      execution: {
        address: address("/lead"), agentRunId: "task-agent", platformAgentRunId: null,
        startedAt: "2026-08-23T00:00:00.000Z", settledAt: null,
      },
    });
    withTasks = addTaskExecutionToTree({
      tree: withTasks,
      ownerTeamRunId: "root-run",
      execution: projectTaskTeamExecution({
        node: testAgentTeamNode({
          address: "/task-team", coordinatorAddress: "/task-team/worker", teamRunId: "task-team-run",
          children: [testAgentNode("/task-team/worker", { agentRunId: "task-team-agent" })],
        }),
        startedAt: "2026-08-23T00:01:00.000Z",
      }),
    });
    withTasks = addTaskExecutionToTree({
      tree: withTasks,
      ownerTeamRunId: "task-team-run",
      execution: projectTaskTeamExecution({
        node: testAgentTeamNode({
          address: "/task-team/deep", coordinatorAddress: "/task-team/deep/worker", teamRunId: "deep-run",
          children: [testAgentNode("/task-team/deep/worker", { agentRunId: "deep-agent" })],
        }),
        startedAt: "2026-08-23T00:02:00.000Z",
      }),
    });
    const index = new TeamExecutionIndex(withTasks);

    expect(index.getTeamRunPhysicalScope("root-run").ancestorTeamRunIds).toEqual([]);
    expect(index.getTeamRunPhysicalScope("deep-run").ancestorTeamRunIds)
      .toEqual(["task-team-run", "deep-run"]);
    expect(index.getTeamRunPhysicalScope(index.requireAgent("task-agent").containingTeamRunId)
      .ancestorTeamRunIds).toEqual([]);
    expect(index.getTeamRunPhysicalScope(index.requireAgent("task-team-agent").containingTeamRunId)
      .ancestorTeamRunIds).toEqual(["task-team-run"]);
  });
});
