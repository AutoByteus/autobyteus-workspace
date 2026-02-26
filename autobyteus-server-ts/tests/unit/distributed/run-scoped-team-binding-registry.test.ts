import { describe, expect, it } from "vitest";
import {
  RunScopedTeamBindingRegistry,
  TeamRunNotBoundError,
} from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";

describe("RunScopedTeamBindingRegistry", () => {
  it("binds and resolves run-scoped team runtime entries", () => {
    const registry = new RunScopedTeamBindingRegistry();
    registry.bindRun({
      teamRunId: "run-1",
      teamId: "team-1",
      runVersion: 2,
      teamDefinitionId: "def-1",
      runtimeTeamId: "team-runtime-1",
      memberBindings: [
        {
          memberName: "leader",
          agentDefinitionId: "agent-1",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: true,
          workspaceId: "workspace-1",
          workspaceRootPath: "/workspace/remote",
          llmConfig: { temperature: 0.1 },
          memberRouteKey: "coordinator/leader",
          memberAgentId: "member_leader_1",
          memoryDir: "/tmp/memory/agent_teams/team-1/member_leader_1",
        },
      ],
    });

    const resolved = registry.resolveRun("run-1");
    expect(resolved.teamId).toBe("team-1");
    expect(resolved.teamDefinitionId).toBe("def-1");
    expect(resolved.runtimeTeamId).toBe("team-runtime-1");
    expect(resolved.memberBindings[0]?.memberName).toBe("leader");
    expect(resolved.memberBindings[0]?.memberRouteKey).toBe("coordinator/leader");
    expect(resolved.memberBindings[0]?.memberAgentId).toBe("member_leader_1");
    expect(resolved.memberBindings[0]?.workspaceRootPath).toBe("/workspace/remote");
    expect(resolved.memberBindings[0]?.memoryDir).toBe(
      "/tmp/memory/agent_teams/team-1/member_leader_1",
    );

    resolved.memberBindings[0]!.memberName = "mutated";
    resolved.memberBindings[0]!.memberRouteKey = "mutated-route";
    resolved.memberBindings[0]!.memberAgentId = "mutated-agent";
    resolved.memberBindings[0]!.workspaceRootPath = "/tmp/mutated-root";
    resolved.memberBindings[0]!.memoryDir = "/tmp/mutated";
    const reResolved = registry.resolveRun("run-1");
    expect(reResolved.memberBindings[0]?.memberName).toBe("leader");
    expect(reResolved.memberBindings[0]?.memberRouteKey).toBe("coordinator/leader");
    expect(reResolved.memberBindings[0]?.memberAgentId).toBe("member_leader_1");
    expect(reResolved.memberBindings[0]?.workspaceRootPath).toBe("/workspace/remote");
    expect(reResolved.memberBindings[0]?.memoryDir).toBe(
      "/tmp/memory/agent_teams/team-1/member_leader_1",
    );
  });

  it("throws when resolving a missing run binding", () => {
    const registry = new RunScopedTeamBindingRegistry();
    expect(() => registry.resolveRun("missing-run")).toThrow(TeamRunNotBoundError);
    expect(registry.tryResolveRun("missing-run")).toBeNull();
  });

  it("unbinds run bindings deterministically", () => {
    const registry = new RunScopedTeamBindingRegistry();
    registry.bindRun({
      teamRunId: "run-2",
      teamId: "team-2",
      runVersion: 1,
      teamDefinitionId: "def-2",
      runtimeTeamId: "team-runtime-2",
      memberBindings: [],
    });

    expect(registry.unbindRun("run-2")).toBe(true);
    expect(registry.unbindRun("run-2")).toBe(false);
    expect(registry.tryResolveRun("run-2")).toBeNull();
  });
});
