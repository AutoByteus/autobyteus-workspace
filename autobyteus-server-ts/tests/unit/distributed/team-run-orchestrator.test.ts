import { describe, expect, it, vi } from "vitest";
import type { TeamRoutingPort } from "autobyteus-ts";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { RunDegradationPolicy } from "../../../src/distributed/policies/run-degradation-policy.js";
import { TeamRunOrchestrator } from "../../../src/distributed/team-run-orchestrator/team-run-orchestrator.js";

describe("TeamRunOrchestrator", () => {
  const buildDefinition = () =>
    new AgentTeamDefinition({
      id: "def-1",
      name: "dist-team",
      description: "Distributed",
      coordinatorMemberName: "leader",
      nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-a",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-2",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-b",
        }),
      ],
    });

  const buildAdapter = () => {
    const dispatchUserMessage = vi.fn(async () => ({ accepted: true }));
    const dispatchInterAgentMessageRequest = vi.fn(async () => ({ accepted: true }));
    const dispatchToolApproval = vi.fn(async () => ({ accepted: true }));
    const dispatchControlStop = vi.fn(async () => ({ accepted: true }));
    const adapter: TeamRoutingPort = {
      dispatchUserMessage,
      dispatchInterAgentMessageRequest,
      dispatchToolApproval,
      dispatchControlStop,
    };
    return {
      adapter,
      dispatchUserMessage,
      dispatchInterAgentMessageRequest,
      dispatchToolApproval,
      dispatchControlStop,
    };
  };

  it("starts run once per team definition and reuses active run", () => {
    const adapterStub = buildAdapter();
    const createRoutingAdapter = vi.fn(() => adapterStub.adapter);
    const orchestrator = new TeamRunOrchestrator({ createRoutingAdapter });
    const teamDefinition = buildDefinition();

    const first = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    const second = orchestrator.startRunIfMissing({
      teamDefinition,
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    expect(first.teamRunId).toBe(second.teamRunId);
    expect(createRoutingAdapter).toHaveBeenCalledTimes(1);
    expect(first.runVersion).toBe(1);
  });

  it("dispatches events through registered routing adapter", async () => {
    const adapterStub = buildAdapter();
    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapterStub.adapter,
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition: buildDefinition(),
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    await orchestrator.dispatchInterAgentMessage(run.teamRunId, {
      senderAgentId: "agent-1",
      recipientName: "helper",
      content: "hello",
      messageType: "message",
    } as any);

    expect(adapterStub.dispatchInterAgentMessageRequest).toHaveBeenCalledTimes(1);
  });

  it("stops and removes run when control stop succeeds", async () => {
    const adapterStub = buildAdapter();
    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapterStub.adapter,
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition: buildDefinition(),
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    const result = await orchestrator.dispatchControlStop(run.teamRunId);

    expect(result.accepted).toBe(true);
    expect(orchestrator.getRunRecord(run.teamRunId)).toBeNull();
    expect(adapterStub.dispatchControlStop).toHaveBeenCalledTimes(1);
  });

  it("runs dependency hydration before allocating run", () => {
    const adapterStub = buildAdapter();
    const ensureMemberDependenciesAvailable = vi.fn();
    const orchestrator = new TeamRunOrchestrator({
      dependencyHydrationService: {
        ensureMemberDependenciesAvailable,
      } as any,
      createRoutingAdapter: () => adapterStub.adapter,
    });

    orchestrator.startRunIfMissing({
      teamDefinition: buildDefinition(),
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    expect(ensureMemberDependenciesAvailable).toHaveBeenCalledTimes(1);
  });

  it("degrades then auto-stops after repeated coordinator route failures", async () => {
    const dispatchUserMessage = vi.fn(async () => ({
      accepted: false,
      errorCode: "DISPATCH_FAILED",
      errorMessage: "timeout",
    }));
    const dispatchControlStop = vi.fn(async () => ({ accepted: true }));
    const adapter: TeamRoutingPort = {
      dispatchUserMessage,
      dispatchInterAgentMessageRequest: vi.fn(async () => ({ accepted: true })),
      dispatchToolApproval: vi.fn(async () => ({ accepted: true })),
      dispatchControlStop,
    };

    const orchestrator = new TeamRunOrchestrator({
      createRoutingAdapter: () => adapter,
      runDegradationPolicy: new RunDegradationPolicy({
        coordinatorFailureThreshold: 1,
        globalFailureThreshold: 100,
        globalFailureWindowMs: 60_000,
      }),
    });

    const run = orchestrator.startRunIfMissing({
      teamDefinition: buildDefinition(),
      hostNodeId: "node-host",
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      defaultNodeId: "node-a",
    });

    const firstFailure = await orchestrator.dispatchUserMessage(run.teamRunId, {
      targetAgentName: "leader",
      userMessage: { content: "hello" },
    } as any);
    expect(firstFailure.accepted).toBe(false);
    expect(orchestrator.getRunRecord(run.teamRunId)?.status).toBe("degraded");

    const secondFailure = await orchestrator.dispatchUserMessage(run.teamRunId, {
      targetAgentName: "leader",
      userMessage: { content: "retry" },
    } as any);
    expect(secondFailure.accepted).toBe(false);
    expect(secondFailure.errorCode).toBe("RUN_AUTO_STOPPED");
    expect(orchestrator.getRunRecord(run.teamRunId)).toBeNull();
    expect(dispatchControlStop).toHaveBeenCalledTimes(1);
  });
});
