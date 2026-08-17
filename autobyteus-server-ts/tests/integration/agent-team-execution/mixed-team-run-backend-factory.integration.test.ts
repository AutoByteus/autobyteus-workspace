import { afterEach, describe, expect, it, vi } from "vitest";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const createManagerStub = () => ({
  isActive: vi.fn(() => true),
  getLeafAgentStatusSnapshots: vi.fn(() => []),
  hasOpenExecutionWork: vi.fn(() => false),
});

const createConfig = () => {
  const coordinator = testAgentNode("/Coordinator", {
    agentRunId: "coord-run",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    workspaceRootPath: "/tmp/coordinator",
  });
  const reviewer = testAgentNode("/Reviewer", {
    agentRunId: "reviewer-run",
    runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    workspaceRootPath: "/tmp/reviewer",
  });
  const subCoordinator = testAgentNode("/BuildSquad/Builder", {
    agentRunId: "builder-run",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
  });
  const subTeam = testAgentTeamNode({
    address: "/BuildSquad",
    coordinatorAddress: subCoordinator.address,
    teamRunId: "build-squad-run",
    teamDefinitionId: "build-squad-definition",
    children: [subCoordinator],
  });
  return testTeamRunConfig({
    rootTeamRunId: "team-mixed-run-1",
    rootTeamDefinitionId: "team-def-mixed-1",
    coordinatorAddress: coordinator.address,
    children: [coordinator, reviewer, subTeam],
  });
};

afterEach(() => vi.clearAllMocks());

describe("MixedTeamRunBackendFactory current execution identity integration", () => {
  it("hydrates exact AgentRun and configured child TeamRun contexts from the immutable TeamRunConfig", async () => {
    const contexts: Array<TeamRunContext<MixedTeamRunContext>> = [];
    const manager = createManagerStub();
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<MixedTeamRunContext>) => {
        contexts.push(context);
        return manager;
      }) as never,
    });

    const config = createConfig();
    const backend = await factory.createBackend(config, config.rootTeam.teamRunId);

    expect(contexts).toHaveLength(1);
    const context = contexts[0]!;
    expect(context).toMatchObject({
      rootTeamRunId: "team-mixed-run-1",
      teamRunId: "team-mixed-run-1",
      teamBackendKind: TeamBackendKind.MIXED,
      teamAddress: "/",
      teamNode: config.rootTeam,
    });
    expect(context.runtimeContext.memberContexts).toEqual([
      expect.objectContaining({
        kind: "agent",
        address: "/Coordinator",
        agentRunId: "coord-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: null,
      }),
      expect.objectContaining({
        kind: "agent",
        address: "/Reviewer",
        agentRunId: "reviewer-run",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        platformAgentRunId: null,
      }),
      expect.objectContaining({
        kind: "agent_team",
        address: "/BuildSquad",
        teamDefinitionId: "build-squad-definition",
        teamRunId: "build-squad-run",
        childRuntimeContext: null,
      }),
    ]);
    expect(backend.teamRunId).toBe("team-mixed-run-1");
    expect(backend.getTeamRunContext()).toBe(context);
    expect(backend.isActive()).toBe(true);
  });

  it("rejects a root allocation mismatch before manager construction", async () => {
    const createTeamManager = vi.fn(() => createManagerStub());
    const factory = new MixedTeamRunBackendFactory({ createTeamManager: createTeamManager as never });
    const config = createConfig();

    await expect(factory.createBackend(config, "foreign-root-run")).rejects.toThrow(
      "Root TeamRun id 'team-mixed-run-1' does not match 'foreign-root-run'",
    );
    expect(createTeamManager).not.toHaveBeenCalled();
  });

  it("restores configured provenance and exact external identities while ignoring native self-bindings", async () => {
    const contexts: Array<TeamRunContext<MixedTeamRunContext>> = [];
    const manager = createManagerStub();
    const factory = new MixedTeamRunBackendFactory({
      createTeamManager: ((context: TeamRunContext<MixedTeamRunContext>) => {
        contexts.push(context);
        return manager;
      }) as never,
    });
    const base = createConfig();
    const config = testTeamRunConfig({
      rootTeamRunId: base.rootTeam.teamRunId,
      rootTeamDefinitionId: base.rootTeam.teamDefinitionId,
      coordinatorAddress: base.rootTeam.coordinatorAddress,
      children: base.rootTeam.children.map((node) => {
        if (node.kind === "agent" && node.address === "/Coordinator") {
          return { ...node, platformAgentRunId: "thread-coordinator" };
        }
        if (node.kind === "agent" && node.address === "/Reviewer") {
          return { ...node, platformAgentRunId: "session-reviewer" };
        }
        if (node.kind === "agent_team") {
          return {
            ...node,
            children: node.children.map((child) => child.kind === "agent"
              ? { ...child, platformAgentRunId: child.agentRunId }
              : child),
          };
        }
        return node;
      }),
    });

    const backend = await factory.restoreBackend(config, config.rootTeam.teamRunId);

    const runtime = contexts[0]!.runtimeContext;
    expect(runtime.configuredMemberActivationMode).toBe("restore");
    expect(runtime.memberContexts[0]).toMatchObject({ platformAgentRunId: "thread-coordinator" });
    expect(runtime.memberContexts[1]).toMatchObject({ platformAgentRunId: "session-reviewer" });
    expect(runtime.memberContexts[2]).toMatchObject({ childRuntimeContext: null });
    expect(backend.getRuntimeContext()).toBe(runtime);
  });
});
