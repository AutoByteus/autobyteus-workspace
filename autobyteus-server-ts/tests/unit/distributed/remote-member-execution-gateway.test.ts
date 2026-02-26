import { describe, expect, it, vi } from "vitest";
import { RemoteMemberExecutionGateway } from "../../../src/distributed/worker-execution/remote-member-execution-gateway.js";

describe("RemoteMemberExecutionGateway", () => {
  it("routes envelope dispatch by kind", async () => {
    const dispatchRunBootstrap = vi.fn(async () => undefined);
    const dispatchUserMessage = vi.fn(async () => undefined);
    const dispatchToolApproval = vi.fn(async () => undefined);
    const gateway = new RemoteMemberExecutionGateway({
      dispatchRunBootstrap,
      dispatchUserMessage,
      dispatchInterAgentMessage: vi.fn(async () => undefined),
      dispatchToolApproval,
      dispatchControlStop: vi.fn(async () => undefined),
    });

    await gateway.dispatchEnvelope({
      envelopeId: "env-0",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "RUN_BOOTSTRAP",
      payload: { teamDefinitionId: "def-1", memberBindings: [] },
    });
    await gateway.dispatchEnvelope({
      envelopeId: "env-1",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "USER_MESSAGE",
      payload: { content: "hello" },
    });
    await gateway.dispatchEnvelope({
      envelopeId: "env-2",
      teamRunId: "run-1",
      runVersion: 1,
      kind: "TOOL_APPROVAL",
      payload: { invocationId: "inv-1" },
    });

    expect(dispatchRunBootstrap).toHaveBeenCalledTimes(1);
    expect(dispatchUserMessage).toHaveBeenCalledTimes(1);
    expect(dispatchToolApproval).toHaveBeenCalledTimes(1);
  });

  it("throws for unsupported or unconfigured kinds", async () => {
    const gateway = new RemoteMemberExecutionGateway();

    await expect(
      gateway.dispatchEnvelope({
        envelopeId: "env-1",
        teamRunId: "run-1",
        runVersion: 1,
        kind: "USER_MESSAGE",
        payload: {},
      }),
    ).rejects.toThrow("Remote member execution handler is not configured");

    await expect(
      gateway.dispatchEnvelope({
        envelopeId: "env-2",
        teamRunId: "run-1",
        runVersion: 1,
        kind: "UNKNOWN",
        payload: {},
      }),
    ).rejects.toThrow("Unsupported remote execution envelope kind 'UNKNOWN'");
  });

  it("publishes member events to host when configured", async () => {
    const publishEventToHost = vi.fn(async () => undefined);
    const gateway = new RemoteMemberExecutionGateway({ publishEventToHost });

    await gateway.emitMemberEvent({
      teamRunId: "run-1",
      runVersion: 1,
      sourceNodeId: "node-worker-1",
      sourceEventId: "evt-1",
      memberName: "helper",
      agentId: "agent-1",
      eventType: "TOOL_EXECUTION_SUCCEEDED",
      payload: { invocation_id: "inv-1" },
    });

    expect(publishEventToHost).toHaveBeenCalledTimes(1);
  });

  it("throws when member event uplink handler is not configured", async () => {
    const gateway = new RemoteMemberExecutionGateway();

    await expect(
      gateway.emitMemberEvent({
        teamRunId: "run-1",
        runVersion: 1,
        sourceNodeId: "node-worker-1",
        sourceEventId: "evt-2",
        memberName: "helper",
        eventType: "ASSISTANT_CHUNK",
        payload: { content: "hello" },
      }),
    ).rejects.toThrow("uplink handler is not configured");
  });
});
