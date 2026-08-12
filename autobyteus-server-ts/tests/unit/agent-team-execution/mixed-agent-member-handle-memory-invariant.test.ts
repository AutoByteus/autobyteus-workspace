import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import type { TeamRunAgentNode, TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberTeamContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const createAgentRunManager = () => {
  const createAgentRun = vi.fn(async (config, runId) => ({
    runId,
    config,
    isActive: () => true,
    getPlatformAgentRunId: () => null,
    getStatusSnapshot: () => ({ status: "idle" }),
    subscribeToEvents: () => () => undefined,
    postUserMessage: async () => ({ accepted: true }),
    approveToolInvocation: async () => ({ accepted: true }),
    interrupt: async () => ({ accepted: true }),
    terminate: async () => ({ accepted: true }),
  }));
  return { createAgentRun };
};

const createHandle = (input: {
  config: TeamRunConfig;
  teamRunId: string;
  teamAddress: string;
  node: TeamRunAgentNode;
  createAgentRun: ReturnType<typeof vi.fn>;
}) => {
  const memberContext = new MixedAgentMemberContext({
    address: input.node.address,
    agentRunId: input.node.agentRunId,
    runtimeKind: input.node.runtimeKind,
    platformAgentRunId: null,
  });
  const teamContext = new TeamRunContext({
    teamRunId: input.teamRunId,
    teamAddress: input.teamAddress as never,
    teamBackendKind: TeamBackendKind.MIXED,
    config: input.config,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [memberContext],
      teamExecutionAddress: createTeamExecutionAddress({
        rootTeamRunId: input.config.rootTeam.teamRunId,
        taskTeamRunIds: [],
        memberAddress: input.node.address,
      }),
    }),
  });
  return new MixedAgentMemberHandle({
    teamContext,
    context: memberContext,
    config: input.node,
    agentRunManager: { createAgentRun: input.createAgentRun } as never,
    memberTeamContextBuilder: {
      build: vi.fn(async () => testMemberTeamContext({
        rootTeamRunId: input.config.rootTeam.teamRunId,
        teamRunId: input.teamRunId,
        teamAddress: input.teamAddress,
        memberAddress: input.node.address,
        agentRunId: input.node.agentRunId,
        runtimeKind: input.node.runtimeKind,
      })),
    } as never,
    publish: vi.fn(),
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
    const { createAgentRun } = createAgentRunManager();
    const handle = createHandle({ config, teamRunId: "team-run-1", teamAddress: "/", node: worker, createAgentRun });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({ rootTeamRunId: "team-run-1", ancestorTeamRunIds: [] }, "worker-run-1"),
      }),
      "worker-run-1",
    );
  });

  it("includes exact physical ancestor TeamRun IDs for a nested member", async () => {
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
    const { createAgentRun } = createAgentRunManager();
    const handle = createHandle({
      config,
      teamRunId: "sub-team-run",
      teamAddress: "/sub_team",
      node: worker,
      createAgentRun,
    });

    await expect(handle.postMessage(new AgentInputUserMessage("hello", SenderType.USER)))
      .resolves.toMatchObject({ accepted: true });
    expect(createAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
          .getTeamAgentRunDirPath({
            rootTeamRunId: "root-run",
            ancestorTeamRunIds: ["sub-team-run"],
          }, "nested-worker-run"),
      }),
      "nested-worker-run",
    );
  });
});
