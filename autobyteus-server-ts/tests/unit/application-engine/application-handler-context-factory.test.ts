import { describe, expect, it, vi } from "vitest";
import { ApplicationAgentEventStreamSubscribeError } from "@autobyteus/application-sdk-contracts";
import { ApplicationHandlerContextFactory } from "../../../src/application-engine/worker/application-handler-context-factory.js";
import { ApplicationAgentStreamObserverRegistry } from "../../../src/application-engine/worker/application-agent-stream-observer-registry.js";

const address = { bindingId: "binding-1", target: { kind: "AGENT_RUN" as const } };
const storage = {
  rootPath: "/tmp/app",
  runtimePath: "/tmp/app/runtime",
  logsPath: "/tmp/app/logs",
  appDatabasePath: "/tmp/app/app.sqlite",
  appDatabaseUrl: "file:/tmp/app/app.sqlite",
  assetsPath: null,
};

describe("ApplicationHandlerContextFactory agent event observer", () => {
  it("rejects an abort while host attachment is pending and dispatches no callback", async () => {
    const registry = new ApplicationAgentStreamObserverRegistry();
    let resolveSubscribe!: () => void;
    const invokeContextCapability = vi.fn(async (input: any) => {
      if (input.operation === "subscribeEventStream") {
        await new Promise<void>((resolve) => { resolveSubscribe = resolve; });
      }
      return input.operation === "unsubscribeEventStream" ? { unsubscribed: true } : { subscriptionId: input.input.subscriptionId };
    });
    const context = new ApplicationHandlerContextFactory({
      storage,
      supportedNotifications: false,
      publishNotification: vi.fn(),
      invokeContextCapability,
      observerRegistry: registry,
    }).create(null);
    const controller = new AbortController();
    const onEvent = vi.fn();

    const pending = context.agentExecution.subscribeEventStream(address, { onEvent }, { signal: controller.signal });
    controller.abort();
    resolveSubscribe();

    const error = await pending.catch((caught) => caught);
    expect(error).toBeInstanceOf(ApplicationAgentEventStreamSubscribeError);
    expect(error).toEqual(expect.objectContaining({
      name: "ApplicationAgentEventStreamSubscribeError",
      code: "SUBSCRIPTION_ABORTED",
      recoverable: true,
    }));
    expect(invokeContextCapability).toHaveBeenCalledWith(expect.objectContaining({
      operation: "unsubscribeEventStream",
      input: expect.objectContaining({ reason: "ABORTED" }),
    }));
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("settles the public subscription promise before draining a pending event", async () => {
    const registry = new ApplicationAgentStreamObserverRegistry();
    const order: string[] = [];
    const event = {
      sequence: 1,
      observedAt: "2026-07-21T00:00:00.000Z",
      applicationId: "app-1",
      address,
      runtimeSubject: "AGENT_RUN" as const,
      producer: null,
      event: { source: "AGENT" as const, type: "TURN_STARTED" as const, data: { turnId: "turn-1" } },
    };
    const context = new ApplicationHandlerContextFactory({
      storage,
      supportedNotifications: false,
      publishNotification: vi.fn(),
      invokeContextCapability: vi.fn(async (input: any) => {
        if (input.operation === "subscribeEventStream") registry.dispatchEvent(input.input.subscriptionId, event);
        return { subscriptionId: input.input.subscriptionId };
      }),
      observerRegistry: registry,
    }).create(null);

    const pending = context.agentExecution.subscribeEventStream(address, {
      onEvent: async () => { order.push("event"); },
    });
    pending.then(() => { order.push("resolved"); });
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(["resolved", "event"]);
  });
});
