import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunConfig, TeamRunNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
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
      getPlatformAgentRunId: () => `${runId}-platform`,
      getStatusSnapshot: () => ({ status: "idle" }),
      subscribeToEvents: () => () => undefined,
      postUserMessage: async () => ({ accepted: true }),
      approveToolInvocation: async () => ({ accepted: true }),
      interrupt: async () => ({ accepted: true }),
      terminate: async () => ({ accepted: true }),
    };
    return {
      runId,
      runtimeKind: config.runtimeKind,
      platformAgentRunId: `${runId}-platform`,
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
  const teamNode = findTeam(input.config.rootTeam);
  if (!teamNode) throw new Error(`missing Team node '${input.teamAddress}'`);
  const memberContext = new MixedAgentMemberContext({
    address: input.node.address,
    agentRunId: input.node.agentRunId,
    runtimeKind: input.node.runtimeKind,
    platformAgentRunId: null,
  });
  const teamContext = new TeamRunContext({
    rootTeamRunId: input.config.rootTeam.teamRunId,
    teamRunId: input.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode,
    handoffs: input.config.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
    }),
  });
  return new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config: input.node,
    activationMode: "fresh",
    agentRunManager: { prepareNewAgentRun: input.prepareNewAgentRun } as never,
    activityInspector: { inspect: () => ({ kind: "none" }) } as never,
    memberTeamContextBuilder: {
      build: vi.fn(async () => testMemberTeamContext({
        rootTeamRunId: input.config.rootTeam.teamRunId,
        memberAddress: input.node.address,
        agentRunId: input.node.agentRunId,
      })),
    } as never,
    publish: vi.fn(),
    acceptPlatformBinding: vi.fn(async () => undefined),
    deliverInterAgentMessage: vi.fn(),
  });
};

describe("MixedAgentMemberHandle memory location", () => {
  it("derives a direct member memory directory solely from root TeamRun and AgentRun identity", async () => {
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
    const handle = createHandle({
      config,
      teamRunId: "team-run-1",
      teamAddress: "/",
      node: worker,
      prepareNewAgentRun,
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(prepareNewAgentRun).toHaveBeenCalledWith({
      runId: "worker-run-1",
      config: expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({ rootTeamRunId: "team-run-1", ancestorTeamRunIds: [] }, "worker-run-1"),
      }),
    });
  });

  it("uses the root plus globally unique AgentRun identity for a nested configured member", async () => {
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
    const handle = createHandle({
      config,
      teamRunId: "sub-team-run",
      teamAddress: "/sub_team",
      node: worker,
      prepareNewAgentRun,
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(prepareNewAgentRun).toHaveBeenCalledWith({
      runId: "nested-worker-run",
      config: expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({
            rootTeamRunId: "root-run",
            ancestorTeamRunIds: [],
          }, "nested-worker-run"),
      }),
    });
  });
});
