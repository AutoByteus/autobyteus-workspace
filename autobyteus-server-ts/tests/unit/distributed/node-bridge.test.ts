import { describe, expect, it, vi } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { HostNodeBridgeClient } from "../../../src/distributed/node-bridge/host-node-bridge-client.js";
import { WorkerNodeBridgeServer } from "../../../src/distributed/node-bridge/worker-node-bridge-server.js";
import { CommandRetryPolicy } from "../../../src/distributed/policies/command-retry-policy.js";

describe("Node bridge", () => {
  const envelope = new EnvelopeBuilder().buildEnvelope({
    envelopeId: "env-1",
    teamRunId: "run-1",
    runVersion: 1,
    kind: "INTER_AGENT_MESSAGE_REQUEST",
    payload: { recipientName: "helper", content: "hello" },
  });

  it("host client retries retryable failures and eventually delivers", async () => {
    const sendEnvelopeToWorker = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("temporary network issue"))
      .mockResolvedValueOnce(undefined);

    const client = new HostNodeBridgeClient({
      sendEnvelopeToWorker: sendEnvelopeToWorker as any,
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 3,
        jitterRatio: 0,
        retryClassifier: () => true,
        sleep: async () => undefined,
      }),
    });

    const result = await client.sendCommand("node-remote-1", envelope);

    expect(result).toEqual({
      delivered: true,
      attempts: 2,
      deduped: false,
    });
    expect(sendEnvelopeToWorker).toHaveBeenCalledTimes(2);
  });

  it("host client does not retry non-retryable failures", async () => {
    const sendEnvelopeToWorker = vi
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockRejectedValue(new Error("permission denied"));
    const client = new HostNodeBridgeClient({
      sendEnvelopeToWorker: sendEnvelopeToWorker as any,
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 3,
        jitterRatio: 0,
        retryClassifier: (error) => !String(error).includes("permission"),
        sleep: async () => undefined,
      }),
    });

    await expect(client.sendCommand("node-remote-1", envelope)).rejects.toThrow("permission denied");
    expect(sendEnvelopeToWorker).toHaveBeenCalledTimes(1);
  });

  it("host client dedupes same envelope id while in-flight", async () => {
    let release: (() => void) | null = null;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sendEnvelopeToWorker = vi.fn(async () => {
      await blocked;
    });
    const client = new HostNodeBridgeClient({
      sendEnvelopeToWorker,
      retryPolicy: new CommandRetryPolicy({
        maxAttempts: 1,
        jitterRatio: 0,
      }),
    });

    const firstSend = client.sendCommand("node-remote-1", envelope);
    const secondSend = await client.sendCommand("node-remote-1", envelope);

    expect(secondSend).toEqual({
      delivered: true,
      attempts: 0,
      deduped: true,
    });

    release?.();
    await expect(firstSend).resolves.toEqual({
      delivered: true,
      attempts: 1,
      deduped: false,
    });
    expect(sendEnvelopeToWorker).toHaveBeenCalledTimes(1);
  });

  it("worker server dedupes repeated envelope IDs", async () => {
    const executeCommand = vi.fn(async () => undefined);
    const server = new WorkerNodeBridgeServer(executeCommand);

    const first = await server.handleCommand(envelope);
    const second = await server.handleCommand(envelope);

    expect(first).toEqual({ handled: true, deduped: false });
    expect(second).toEqual({ handled: true, deduped: true });
    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(server.hasProcessed(envelope.envelopeId)).toBe(true);
  });
});
