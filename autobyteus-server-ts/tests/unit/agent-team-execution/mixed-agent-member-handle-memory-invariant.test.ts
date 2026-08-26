import { createNoopAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberTeamContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const createAgentRunManager = () => {
  const prepareNewAgentRun = vi.fn(async ({ config, runId }) => {
    const run = {
      runId,
      config,
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: () => () => undefined,
      postUserMessage: async () => ({ accepted: true }),
      approveToolInvocation: async () => ({ accepted: true }),
      interrupt: async () => ({ accepted: true }),
    };
    return {
      runId,
      runtimeKind: config.runtimeKind,
      platformAgentRunId: config.runtimeKind === RuntimeKind.AUTOBYTEUS
        ? runId
        : `platform-${runId}`,
      commitPublication: () => run,
      abort: async () => ({ kind: "aborted" as const }),
    };
  });
  return { prepareNewAgentRun };
};

const createHandle = (input: {
  config: TeamRunConfig;
  teamRunId: string;
  teamAddress: string;
  node: TeamRunAgentNode;
  prepareNewAgentRun: ReturnType<typeof vi.fn>;
}) => {
  const findTeam = (node: TeamRunNode): TeamRunAgentTeamNode | null => {
    if (node.kind === "agent") return null;
    if (node.address === input.teamAddress) return node;
    for (const child of node.children) {
      const found = findTeam(child);
      if (found) return found;
    }
    return null;
  };
  const findPhysicalScope = (
    node: TeamRunAgentTeamNode,
    scope: TeamRunPhysicalScope,
  ): TeamRunPhysicalScope | null => {
    if (node.address === input.teamAddress) return scope;
    for (const child of node.children) {
      if (child.kind !== "agent_team") continue;
      const found = findPhysicalScope(
        child,
        createChildTeamRunPhysicalScope(scope, child.teamRunId),
      );
      if (found) return found;
    }
    return null;
  };
  const teamNode = findTeam(input.config.rootTeam);
  if (!teamNode) throw new Error(`missing Team node '${input.teamAddress}'`);
  const physicalScope = findPhysicalScope(
    input.config.rootTeam,
    createRootTeamRunPhysicalScope(input.config.rootTeam.teamRunId),
  );
  if (!physicalScope) throw new Error(`missing Team scope '${input.teamAddress}'`);
  const memberContext = new MixedAgentMemberContext({
    address: input.node.address,
    agentRunId: input.node.agentRunId,
    runtimeKind: input.node.runtimeKind,
    platformAgentRunId: null,
  });
  const teamContext = new TeamRunContext({
    physicalScope,
    teamRunId: input.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode,
    handoffs: input.config.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
      configuredMemberActivationMode: "fresh",
    }),
  });
  const memoryLocationService = new AgentMemoryLocationService({
    memoryDir: appConfigProvider.config.getMemoryDir(),
  });
  const getTeamAgentRunLocation = vi.spyOn(
    memoryLocationService,
    "getTeamAgentRunLocation",
  );
  const acceptPlatformBinding = vi.fn(async () => undefined);
  const handle = new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config: input.node,
    activationMode: "fresh",
    agentRunManager: { prepareNewAgentRun: input.prepareNewAgentRun } as never,
    agentToolMcpRunSessionReleaser: createNoopAgentToolMcpRunSessionReleaser(),
    memoryLocationService,
    activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
    memberTeamContextBuilder: {
      build: vi.fn(async () => testMemberTeamContext({
        rootTeamRunId: input.config.rootTeam.teamRunId,
        memberAddress: input.node.address,
        agentRunId: input.node.agentRunId,
      })),
    } as never,
    publish: vi.fn(),
    acceptPlatformBinding,
    deliverInterAgentMessage: vi.fn(),
  });
  return {
    handle,
    getTeamAgentRunLocation,
    acceptPlatformBinding,
  };
};

describe("MixedAgentMemberHandle memory location", () => {
  it("uses the root scope for a direct root member", async () => {
    const worker = testAgentNode("/worker", {
      agentRunId: "worker-run-1",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "team-run-1",
      coordinatorAddress: worker.address,
      children: [worker],
    });
    const { prepareNewAgentRun } = createAgentRunManager();
    const {
      handle,
      getTeamAgentRunLocation,
        acceptPlatformBinding,
    } = createHandle({ config, teamRunId: "team-run-1", teamAddress: "/", node: worker, prepareNewAgentRun });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(prepareNewAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "worker-run-1",
        config: expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({ rootTeamRunId: "team-run-1", ancestorTeamRunIds: [] }, "worker-run-1"),
        }),
      }),
    );
    expect(getTeamAgentRunLocation).toHaveBeenCalledWith({
      rootTeamRunId: "team-run-1",
      ancestorTeamRunIds: [],
      agentRunId: "worker-run-1",
    });
    expect(acceptPlatformBinding).toHaveBeenCalledWith(expect.objectContaining({
      platformAgentRunId: "platform-worker-run-1",
    }));
    handle.dispose();
  });

  it("includes the containing configured TeamRun boundary for a nested member", async () => {
    const worker = testAgentNode("/sub_team/worker", {
      agentRunId: "nested-worker-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/root_lead",
      children: [
        testAgentNode("/root_lead"),
        testAgentTeamNode({
          address: "/sub_team",
          coordinatorAddress: worker.address,
          teamRunId: "sub-team-run",
          children: [worker],
        }),
      ],
    });
    const { prepareNewAgentRun } = createAgentRunManager();
    const {
      handle,
      getTeamAgentRunLocation,
        acceptPlatformBinding,
    } = createHandle({
      config,
      teamRunId: "sub-team-run",
      teamAddress: "/sub_team",
      node: worker,
      prepareNewAgentRun,
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(prepareNewAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "nested-worker-run",
        config: expect.objectContaining({
          memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
            .getTeamAgentRunDirPath({
              rootTeamRunId: "root-run",
              ancestorTeamRunIds: ["sub-team-run"],
            }, "nested-worker-run"),
        }),
      }),
    );
    expect(getTeamAgentRunLocation).toHaveBeenCalledWith({
      rootTeamRunId: "root-run",
      ancestorTeamRunIds: ["sub-team-run"],
      agentRunId: "nested-worker-run",
    });
    expect(acceptPlatformBinding).toHaveBeenCalledWith(expect.objectContaining({
      platformAgentRunId: "platform-nested-worker-run",
    }));
    handle.dispose();
  });
});
