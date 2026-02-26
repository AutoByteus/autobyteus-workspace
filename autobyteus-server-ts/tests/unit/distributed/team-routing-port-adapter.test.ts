import { describe, expect, it, vi } from "vitest";
import { TeamRoutingPortAdapter } from "../../../src/distributed/routing/team-routing-port-adapter.js";

describe("TeamRoutingPortAdapter", () => {
  it("routes inter-agent messages locally when target member is on local node", async () => {
    const dispatchRemoteEnvelope = vi.fn(async () => undefined);
    const dispatchLocalInterAgentMessage = vi.fn(async () => undefined);

    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 7,
      localNodeId: "node-local",
      placementByMember: {
        helper: { memberName: "helper", nodeId: "node-local", source: "required" },
      },
      dispatchRemoteEnvelope,
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage,
      dispatchLocalToolApproval: vi.fn(async () => undefined),
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-1",
      recipientName: "helper",
      content: "hello",
      messageType: "message",
    } as any);

    expect(result.accepted).toBe(true);
    expect(dispatchLocalInterAgentMessage).toHaveBeenCalledTimes(1);
    expect(dispatchRemoteEnvelope).not.toHaveBeenCalled();
  });

  it("routes inter-agent messages remotely when target member is on remote node", async () => {
    const dispatchRemoteEnvelope = vi.fn(async () => undefined);

    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 9,
      localNodeId: "node-local",
      placementByMember: {
        helper: { memberName: "helper", nodeId: "node-remote", source: "preferred" },
      },
      dispatchRemoteEnvelope,
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: vi.fn(async () => undefined),
      dispatchLocalToolApproval: vi.fn(async () => undefined),
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-1",
      recipientName: "helper",
      content: "hello",
      messageType: "message",
    } as any);

    expect(result.accepted).toBe(true);
    expect(dispatchRemoteEnvelope).toHaveBeenCalledTimes(1);
    expect(dispatchRemoteEnvelope).toHaveBeenCalledWith(
      "node-remote",
      expect.objectContaining({
        teamRunId: "run-1",
        runVersion: 9,
        kind: "INTER_AGENT_MESSAGE_REQUEST",
      })
    );
    const dispatchedEnvelope = dispatchRemoteEnvelope.mock.calls[0]?.[1] as { payload: Record<string, unknown> };
    expect(dispatchedEnvelope.payload).not.toHaveProperty("teamDefinitionId");
  });

  it("rejects when target member is missing from placement map", async () => {
    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 1,
      localNodeId: "node-local",
      placementByMember: {},
      dispatchRemoteEnvelope: vi.fn(async () => undefined),
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: vi.fn(async () => undefined),
      dispatchLocalToolApproval: vi.fn(async () => undefined),
    });

    const result = await adapter.dispatchInterAgentMessageRequest({
      senderAgentId: "agent-1",
      recipientName: "missing",
      content: "hello",
      messageType: "message",
    } as any);

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe("TARGET_MEMBER_NOT_PLACED");
  });

  it("dispatches control stop once per unique node", async () => {
    const dispatchRemoteEnvelope = vi.fn(async () => undefined);
    const dispatchLocalControlStop = vi.fn(async () => undefined);

    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 5,
      localNodeId: "node-local",
      placementByMember: {
        localA: { memberName: "localA", nodeId: "node-local", source: "default" },
        remoteA: { memberName: "remoteA", nodeId: "node-remote-1", source: "default" },
        remoteB: { memberName: "remoteB", nodeId: "node-remote-1", source: "default" },
        remoteC: { memberName: "remoteC", nodeId: "node-remote-2", source: "default" },
      },
      dispatchRemoteEnvelope,
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: vi.fn(async () => undefined),
      dispatchLocalToolApproval: vi.fn(async () => undefined),
      dispatchLocalControlStop,
    });

    const result = await adapter.dispatchControlStop();

    expect(result.accepted).toBe(true);
    expect(dispatchLocalControlStop).toHaveBeenCalledTimes(1);
    expect(dispatchRemoteEnvelope).toHaveBeenCalledTimes(2);
  });

  it("bootstraps remote node readiness once before remote dispatch", async () => {
    const dispatchRemoteEnvelope = vi.fn(async () => undefined);
    const ensureRemoteNodeReady = vi.fn(async () => undefined);
    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 2,
      localNodeId: "node-local",
      placementByMember: {
        helperA: { memberName: "helperA", nodeId: "node-remote", source: "default" },
        helperB: { memberName: "helperB", nodeId: "node-remote", source: "default" },
      },
      dispatchRemoteEnvelope,
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: vi.fn(async () => undefined),
      dispatchLocalToolApproval: vi.fn(async () => undefined),
      ensureRemoteNodeReady,
    });

    await adapter.dispatchUserMessage({
      targetAgentName: "helperA",
      userMessage: { content: "first" },
    } as any);
    await adapter.dispatchToolApproval({
      agentName: "helperB",
      toolInvocationId: "inv-1",
      isApproved: true,
      reason: null,
    } as any);

    expect(ensureRemoteNodeReady).toHaveBeenCalledTimes(1);
    expect(ensureRemoteNodeReady).toHaveBeenCalledWith("node-remote");
    expect(dispatchRemoteEnvelope).toHaveBeenCalledTimes(2);
  });

  it("returns dispatch failure when remote bootstrap readiness fails", async () => {
    const dispatchRemoteEnvelope = vi.fn(async () => undefined);
    const adapter = new TeamRoutingPortAdapter({
      teamRunId: "run-1",
      runVersion: 2,
      localNodeId: "node-local",
      placementByMember: {
        helper: { memberName: "helper", nodeId: "node-remote", source: "default" },
      },
      dispatchRemoteEnvelope,
      dispatchLocalUserMessage: vi.fn(async () => undefined),
      dispatchLocalInterAgentMessage: vi.fn(async () => undefined),
      dispatchLocalToolApproval: vi.fn(async () => undefined),
      ensureRemoteNodeReady: vi.fn(async () => {
        throw new Error("bootstrap failed");
      }),
    });

    const result = await adapter.dispatchUserMessage({
      targetAgentName: "helper",
      userMessage: { content: "first" },
    } as any);

    expect(result.accepted).toBe(false);
    expect(result.errorCode).toBe("DISPATCH_FAILED");
    expect(String(result.errorMessage)).toContain("bootstrap failed");
    expect(dispatchRemoteEnvelope).not.toHaveBeenCalled();
  });
});
