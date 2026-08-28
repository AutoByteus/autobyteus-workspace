import { describe, expect, it, vi } from "vitest";
import { ApplicationAgentToolCallLifecycle } from "../../../src/application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import { ApplicationReentryService } from "../../../src/application-orchestration/services/application-reentry-service.js";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
};

const active = (applicationId: string) => ({
  applicationId,
  state: "ACTIVE" as const,
  detail: null,
  updatedAt: "2026-08-27T00:00:00.000Z",
});

describe("ApplicationReentryService application-tool participant lifecycle", () => {
  it("closes only target admission, drains an admitted call, then stops and recovers the worker", async () => {
    const order: string[] = [];
    const lifecycle = new ApplicationAgentToolCallLifecycle();
    lifecycle.open("app-a");
    lifecycle.open("app-b");
    const inFlight = deferred<void>();
    const admitted = lifecycle.runAdmitted("app-a", async () => {
      order.push("app-a.call.start");
      await inFlight.promise;
      order.push("app-a.call.finish");
      return "done";
    });
    const availability = new Map([
      ["app-a", active("app-a")],
      ["app-b", active("app-b")],
    ]);
    const service = new ApplicationReentryService({
      availabilityService: {
        getAvailability: vi.fn(async (applicationId: string) => availability.get(applicationId) ?? null),
        beginReentry: vi.fn((applicationId: string) => {
          order.push(`${applicationId}.availability.reentering`);
          return active(applicationId);
        }),
        activateApplication: vi.fn((applicationId: string) => {
          order.push(`${applicationId}.availability.active`);
          const record = active(applicationId);
          availability.set(applicationId, record);
          return record;
        }),
        quarantineApplication: vi.fn((applicationId: string, detail: string) => ({
          ...active(applicationId), state: "QUARANTINED" as const, detail,
        })),
      } as never,
      recoveryService: {
        resumeApplication: vi.fn(async (applicationId: string) => {
          order.push(`${applicationId}.recovery.resume`);
        }),
      },
      eventDispatchService: {
        suspendApplication: vi.fn((applicationId: string) => {
          order.push(`${applicationId}.events.suspend`);
        }),
        resumePendingEventsForApplication: vi.fn(async (applicationId: string) => {
          order.push(`${applicationId}.events.resume`);
        }),
      },
      engineLauncher: {
        stop: vi.fn(async (applicationId: string) => {
          order.push(`${applicationId}.worker.stop`);
        }),
        ensureReady: vi.fn(async (applicationId: string) => {
          order.push(`${applicationId}.worker.ready`);
        }),
      },
      applicationAgentToolCallLifecycle: lifecycle,
    });

    const preparation = service.prepareParticipants(["app-a"]);
    await vi.waitFor(() => {
      expect(order).toContain("app-a.events.suspend");
    });
    expect(order).not.toContain("app-a.worker.stop");
    await expect(lifecycle.runAdmitted("app-a", async () => "late"))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
    await expect(lifecycle.runAdmitted("app-b", async () => "unrelated"))
      .resolves.toBe("unrelated");

    inFlight.resolve();
    await expect(admitted).resolves.toBe("done");
    const token = await preparation;
    expect(order.indexOf("app-a.call.finish")).toBeLessThan(order.indexOf("app-a.worker.stop"));

    await service.recoverParticipants(token, ["app-a"], ["app-a"]);
    expect(order.slice(-4)).toEqual([
      "app-a.recovery.resume",
      "app-a.worker.ready",
      "app-a.events.resume",
      "app-a.availability.active",
    ]);
    await expect(lifecycle.runAdmitted("app-a", async () => "reopened"))
      .resolves.toBe("reopened");
  });

  it("keeps removed and non-recoverable participants closed and quarantined", async () => {
    const lifecycle = new ApplicationAgentToolCallLifecycle();
    lifecycle.open("removed");
    lifecycle.open("invalid");
    const quarantined: Array<{ applicationId: string; detail: string }> = [];
    const service = new ApplicationReentryService({
      availabilityService: {
        getAvailability: vi.fn(async (applicationId: string) => active(applicationId)),
        beginReentry: vi.fn((applicationId: string) => active(applicationId)),
        activateApplication: vi.fn((applicationId: string) => active(applicationId)),
        quarantineApplication: vi.fn((applicationId: string, detail: string) => {
          quarantined.push({ applicationId, detail });
          return { ...active(applicationId), state: "QUARANTINED" as const, detail };
        }),
      } as never,
      recoveryService: { resumeApplication: vi.fn(async () => undefined) },
      eventDispatchService: {
        suspendApplication: vi.fn(),
        resumePendingEventsForApplication: vi.fn(async () => undefined),
      },
      engineLauncher: {
        stop: vi.fn(async () => undefined),
        ensureReady: vi.fn(async () => undefined),
      },
      applicationAgentToolCallLifecycle: lifecycle,
    });

    const token = await service.prepareParticipants(["removed", "invalid"]);
    await service.recoverParticipants(token, ["invalid"], []);

    expect(quarantined).toEqual([
      { applicationId: "removed", detail: "Application is no longer present in the current catalog." },
      { applicationId: "invalid", detail: "Application setup is required after catalog transition." },
    ]);
    await expect(lifecycle.runAdmitted("removed", async () => undefined))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
    await expect(lifecycle.runAdmitted("invalid", async () => undefined))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
  });
});
