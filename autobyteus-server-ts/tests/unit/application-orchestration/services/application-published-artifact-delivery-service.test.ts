import { describe, expect, it, vi } from "vitest";
import { ApplicationPublishedArtifactDeliveryQueue } from "../../../../src/application-orchestration/services/application-published-artifact-delivery-queue.js";
import { ApplicationPublishedArtifactDeliveryService } from "../../../../src/application-orchestration/services/application-published-artifact-delivery-service.js";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => { resolve = next; });
  return { promise, resolve };
};

const command = (runId: string, revisionId: string) => ({
  runId,
  applicationId: `app-${runId}`,
  bindingId: `binding-${runId}`,
  revisionId,
  event: { revisionId } as never,
});

describe("ApplicationPublishedArtifactDeliveryService", () => {
  it("ensures the worker before every invoke, preserves run FIFO, and drains accepted work", async () => {
    const queue = new ApplicationPublishedArtifactDeliveryQueue();
    const firstRunGate = deferred();
    const order: string[] = [];
    const launcher = {
      ensureReady: vi.fn(async (applicationId: string) => {
        order.push(`ensure:${applicationId}`);
      }),
    };
    const controller = {
      invokeApplicationArtifactHandler: vi.fn(async (
        applicationId: string,
        input: { event: { revisionId: string } },
      ) => {
        order.push(`invoke:${applicationId}:${input.event.revisionId}`);
        if (input.event.revisionId === "r1-a") {
          await firstRunGate.promise;
        }
        return { accepted: true };
      }),
    };
    const service = new ApplicationPublishedArtifactDeliveryService({
      queue,
      launcher,
      controller,
    } as never);

    const run1a = queue.accept(command("run-1", "r1-a"));
    const run1b = queue.accept(command("run-1", "r1-b"));
    const run2a = queue.accept(command("run-2", "r2-a"));
    await vi.waitFor(() => expect(controller.invokeApplicationArtifactHandler)
      .toHaveBeenCalledTimes(2));
    expect(order).toContain("invoke:app-run-2:r2-a");
    expect(order).not.toContain("invoke:app-run-1:r1-b");

    firstRunGate.resolve();
    await Promise.all([run1a, run1b, run2a]);
    service.stopAccepting();
    await service.awaitDrained();

    expect(order.indexOf("ensure:app-run-1")).toBeLessThan(
      order.indexOf("invoke:app-run-1:r1-a"),
    );
    expect(order.indexOf("ensure:app-run-2")).toBeLessThan(
      order.indexOf("invoke:app-run-2:r2-a"),
    );
    expect(order.indexOf("invoke:app-run-1:r1-a")).toBeLessThan(
      order.indexOf("invoke:app-run-1:r1-b"),
    );
    expect(order.indexOf("invoke:app-run-2:r2-a")).toBeLessThan(
      order.indexOf("invoke:app-run-1:r1-b"),
    );
  });

  it("restarts an absent worker before delivering the accepted artifact command", async () => {
    const queue = new ApplicationPublishedArtifactDeliveryQueue();
    let workerReady = false;
    const launcher = {
      ensureReady: vi.fn(async () => {
        workerReady = true;
        return { state: "ready" };
      }),
    };
    const controller = {
      invokeApplicationArtifactHandler: vi.fn(async () => {
        if (!workerReady) throw new Error("worker was not restarted");
        return { accepted: true };
      }),
    };
    const service = new ApplicationPublishedArtifactDeliveryService({
      queue,
      launcher,
      controller,
    } as never);

    await expect(queue.accept(command("run-1", "after-worker-exit")))
      .resolves.toBeUndefined();
    expect(launcher.ensureReady).toHaveBeenCalledWith("app-run-1");
    expect(controller.invokeApplicationArtifactHandler).toHaveBeenCalledOnce();

    service.stopAccepting();
    await service.awaitDrained();
  });
});
