import { describe, expect, it } from "vitest";
import { createTeamMemberExecutionIdentity } from "../../../src/agent-team-execution/domain/team-member-execution-identity.js";
import { addTaskExecutionToTree, adoptAgentPlatformBindingInTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-mutator.js";
import { projectTaskAgentExecution, projectTaskTeamExecution } from "../../../src/agent-team-execution/task-delegation/task-execution-tree-projection.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  address,
  testAgentNode,
  testAgentTeamNode,
  testExecutionTree,
} from "../../fixtures/current-team-run-fixtures.js";

const rootTeamRunId = "root-binding-run";

const binding = (memberAddress: string, agentRunId: string, platformAgentRunId: string) => ({
  execution: createTeamMemberExecutionIdentity({
    rootTeamRunId,
    memberAddress,
    agentRunId,
  }),
  platformAgentRunId,
});

const baseTree = () => testExecutionTree({
  rootTeamRunId,
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", {
      agentRunId: "run-coordinator",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentTeamNode({
      address: "/nested",
      coordinatorAddress: "/nested/reviewer",
      teamRunId: "nested-team-run",
      children: [testAgentNode("/nested/reviewer", {
        agentRunId: "run-reviewer",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      })],
    }),
  ],
});

describe("adoptAgentPlatformBindingInTree", () => {
  it("adopts exact configured root and nested identities without mutating the prior tree", () => {
    const original = baseTree();
    const rootMutation = adoptAgentPlatformBindingInTree({
      tree: original,
      binding: binding("/coordinator", "run-coordinator", "thread-1"),
    });
    const nestedMutation = adoptAgentPlatformBindingInTree({
      tree: rootMutation.tree,
      binding: binding("/nested/reviewer", "run-reviewer", "22222222-2222-4222-8222-222222222222"),
    });

    expect(rootMutation.outcome).toBe("adopted");
    expect(original.rootTeam.members[0]).toMatchObject({ platformAgentRunId: null });
    expect(nestedMutation.tree.rootTeam.members[0]).toMatchObject({ platformAgentRunId: "thread-1" });
    expect(nestedMutation.tree.rootTeam.members[1]).toMatchObject({
      members: [expect.objectContaining({
        address: address("/nested/reviewer"),
        agentRunId: "run-reviewer",
        platformAgentRunId: "22222222-2222-4222-8222-222222222222",
      })],
    });
  });

  it("adopts direct task and nested task-team member identities", () => {
    let tree = addTaskExecutionToTree({
      tree: baseTree(),
      ownerTeamRunId: rootTeamRunId,
      execution: projectTaskAgentExecution({
        address: address("/coordinator"),
        agentRunId: "task-worker-run",
        startedAt: "2026-08-17T20:00:00.000Z",
      }),
    });
    tree = addTaskExecutionToTree({
      tree,
      ownerTeamRunId: rootTeamRunId,
      execution: projectTaskTeamExecution({
        node: testAgentTeamNode({
          address: "/nested",
          coordinatorAddress: "/nested/reviewer",
          teamRunId: "task-team-run",
          children: [testAgentNode("/nested/reviewer", {
            agentRunId: "task-team-lead-run",
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          })],
        }),
        startedAt: "2026-08-17T20:01:00.000Z",
      }),
    });

    tree = adoptAgentPlatformBindingInTree({
      tree,
      binding: binding("/coordinator", "task-worker-run", "thread-task"),
    }).tree;
    tree = adoptAgentPlatformBindingInTree({
      tree,
      binding: binding("/nested/reviewer", "task-team-lead-run", "thread-task-team"),
    }).tree;

    expect(tree.rootTeam.taskExecutions[0]).toMatchObject({ platformAgentRunId: "thread-task" });
    expect(tree.rootTeam.taskExecutions[1]).toMatchObject({
      members: [expect.objectContaining({ platformAgentRunId: "thread-task-team" })],
    });
  });

  it("is idempotent only for the same exact identity and provider binding", () => {
    const adopted = adoptAgentPlatformBindingInTree({
      tree: baseTree(),
      binding: binding("/coordinator", "run-coordinator", "thread-1"),
    }).tree;

    const unchanged = adoptAgentPlatformBindingInTree({
      tree: adopted,
      binding: binding("/coordinator", "run-coordinator", "thread-1"),
    });

    expect(unchanged).toEqual({ outcome: "unchanged", tree: adopted });
    expect(unchanged.tree).toBe(adopted);
  });

  it("fails closed for a different root, a compound-identity miss, or a conflicting provider id", () => {
    const tree = baseTree();
    expect(() => adoptAgentPlatformBindingInTree({
      tree,
      binding: {
        ...binding("/coordinator", "run-coordinator", "thread-1"),
        execution: createTeamMemberExecutionIdentity({
          rootTeamRunId: "other-root",
          memberAddress: "/coordinator",
          agentRunId: "run-coordinator",
        }),
      },
    })).toThrow("different root TeamRun");
    expect(() => adoptAgentPlatformBindingInTree({
      tree,
      binding: binding("/coordinator", "wrong-run", "thread-1"),
    })).toThrow("target was not found");

    const adopted = adoptAgentPlatformBindingInTree({
      tree,
      binding: binding("/coordinator", "run-coordinator", "thread-1"),
    }).tree;
    expect(() => adoptAgentPlatformBindingInTree({
      tree: adopted,
      binding: binding("/coordinator", "run-coordinator", "thread-2"),
    })).toThrow("already has a different provider binding");
  });
});
