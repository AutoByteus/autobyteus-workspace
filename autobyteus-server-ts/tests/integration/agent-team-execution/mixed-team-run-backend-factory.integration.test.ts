import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MixedTeamRunBackendFactory,
  type MixedTeamManagerConstructionInput,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberTaskRootResolver,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";
import { createNoopAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";

const createManagerStub = () => ({
  isActive: vi.fn(() => true),
  getLeafAgentStatusSnapshots: vi.fn(() => []),
  hasOpenExecutionWork: vi.fn(() => false),
}) as never;

const callbacks = () => ({
  taskRootResolver: testMemberTaskRootResolver(),
  publish: vi.fn(),
  deliverInterAgentMessage: vi.fn(async () => ({ accepted: true as const })),
  acceptPlatformBinding: vi.fn(async () => undefined),
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
    const managerInputs: MixedTeamManagerConstructionInput[] = [];
    const manager = createManagerStub();
    const releaser = createNoopAgentToolMcpRunSessionReleaser();
    const factory = new MixedTeamRunBackendFactory({
      agentToolMcpRunSessionReleaser: releaser,
      createTeamManager: (input) => {
        managerInputs.push(input);
        expect(input.agentToolMcpRunSessionReleaser).toBe(releaser);
        contexts.push(input.context);
        return manager;
      },
    });

    const config = createConfig();
    const backend = await factory.createBackend(config, config.rootTeam.teamRunId, callbacks());

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

    const child = config.rootTeam.children.find((node) => node.kind === "agent_team");
    if (!child || child.kind !== "agent_team") {
      throw new Error("Configured child Team fixture is required.");
    }
    await managerInputs[0]!.subTeamRunFactory.materializeConfiguredChild({
      parentContext: context,
      teamNode: child,
      configuredMemberActivationMode: "fresh",
    });
    await managerInputs[0]!.subTeamRunFactory.prepareFreshTaskTeam({
      parentContext: context,
      handoffs: [],
      teamNode: { ...child, teamRunId: "task-build-squad-run" },
    });
    expect(managerInputs).toHaveLength(3);
    for (const input of managerInputs) {
      expect(input.agentToolMcpRunSessionReleaser).toBe(releaser);
      expect(input.subTeamRunFactory).toBe(managerInputs[0]!.subTeamRunFactory);
      expect(input.callbacks).toBe(managerInputs[0]!.callbacks);
    }
  });

  it("rejects a root allocation mismatch before manager construction", async () => {
    const createTeamManager = vi.fn(() => createManagerStub());
    const factory = new MixedTeamRunBackendFactory({
      agentToolMcpRunSessionReleaser:
        createNoopAgentToolMcpRunSessionReleaser(),
      createTeamManager,
    });
    const config = createConfig();

    await expect(factory.createBackend(config, "foreign-root-run", callbacks())).rejects.toThrow(
      "Root TeamRun id 'team-mixed-run-1' does not match 'foreign-root-run'",
    );
    expect(createTeamManager).not.toHaveBeenCalled();
  });

  it("restores configured provenance and exact external identities while ignoring native self-bindings", async () => {
    const contexts: Array<TeamRunContext<MixedTeamRunContext>> = [];
    const manager = createManagerStub();
    const releaser = createNoopAgentToolMcpRunSessionReleaser();
    const factory = new MixedTeamRunBackendFactory({
      agentToolMcpRunSessionReleaser: releaser,
      createTeamManager: (input) => {
        expect(input.agentToolMcpRunSessionReleaser).toBe(releaser);
        contexts.push(input.context);
        return manager;
      },
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

    const backend = await factory.restoreBackend(config, config.rootTeam.teamRunId, callbacks());

    const runtime = contexts[0]!.runtimeContext;
    expect(runtime.configuredMemberActivationMode).toBe("restore");
    expect(runtime.memberContexts[0]).toMatchObject({ platformAgentRunId: "thread-coordinator" });
    expect(runtime.memberContexts[1]).toMatchObject({ platformAgentRunId: "session-reviewer" });
    expect(runtime.memberContexts[2]).toMatchObject({ childRuntimeContext: null });
    expect(backend.getRuntimeContext()).toBe(runtime);
  });
});
