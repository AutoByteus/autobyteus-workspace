import { describe, expect, it, vi } from "vitest";
import { ApplicationEngineController } from "../../../src/application-engine/services/application-engine-controller.js";

const createHandle = () => ({
  client: {
    request: vi.fn(async (_method: string, input: unknown) => input),
    close: vi.fn(async () => undefined),
  },
  supervisor: {
    stop: vi.fn(async () => undefined),
  },
});

describe("ApplicationEngineController", () => {
  it("completion-couples every application-work method without a request deadline", async () => {
    const controller = new ApplicationEngineController();
    const handle = createHandle();
    controller.attach("app-1", handle as never);

    await Promise.all([
      controller.invokeApplicationQuery("app-1", {} as never),
      controller.invokeApplicationCommand("app-1", {} as never),
      controller.routeApplicationRequest("app-1", {} as never),
      controller.executeApplicationGraphql("app-1", {} as never),
      controller.openApplicationWebSocket("app-1", {} as never),
      controller.deliverApplicationWebSocketMessage("app-1", {} as never),
      controller.closeApplicationWebSocket("app-1", {} as never),
      controller.invokeApplicationEventHandler("app-1", {} as never),
      controller.invokeApplicationArtifactHandler("app-1", {} as never),
    ]);

    expect(handle.client.request).toHaveBeenCalledTimes(9);
    for (const call of handle.client.request.mock.calls) expect(call).toHaveLength(2);
  });

  it("owns the exact attached handle, status, invocation, and listener identity", async () => {
    const controller = new ApplicationEngineController();
    const handle = createHandle();
    const notification = vi.fn();
    const unsubscribe = controller.onNotification(notification);
    controller.attach("app-1", handle as never);
    controller.updateStatus("app-1", {
      applicationId: "app-1",
      state: "ready",
      ready: true,
      startedAt: "2026-07-31T08:00:00.000Z",
      lastFailure: null,
      exposures: null,
    });

    await expect(controller.invokeApplicationCommand("app-1", {
      commandName: "create",
      requestContext: { applicationId: "app-1" },
      input: { title: "Draft" },
    })).resolves.toMatchObject({ commandName: "create" });
    controller.publishNotification("app-1", {
      topic: "draft.ready",
      payload: { id: "draft-1" },
      publishedAt: "2026-07-31T08:00:01.000Z",
    });

    expect(controller.hasAttachedEngine("app-1")).toBe(true);
    expect(controller.getStatus("app-1").state).toBe("ready");
    expect(notification).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: "app-1",
    }));
    expect(controller.detachIfCurrent("app-1", createHandle() as never)).toBe(false);
    expect(controller.hasAttachedEngine("app-1")).toBe(true);
    unsubscribe();
  });

  it("stops and detaches the exact handle idempotently", async () => {
    const controller = new ApplicationEngineController();
    const handle = createHandle();
    controller.attach("app-1", handle as never);

    await controller.stopAttachedEngine("app-1");
    await controller.stopAttachedEngine("app-1");

    expect(handle.client.request).toHaveBeenCalledOnce();
    expect(handle.client.close).toHaveBeenCalledOnce();
    expect(handle.supervisor.stop).toHaveBeenCalledOnce();
    expect(controller.hasAttachedEngine("app-1")).toBe(false);
    expect(controller.getStatus("app-1")).toMatchObject({
      state: "stopped",
      ready: false,
    });
  });
});
