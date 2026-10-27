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
  it("closes only target admission, drains an admitted call, stops the worker, then recovers, activates and dispatches with the worker stopped", async () => {
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

    await service.recoverParticipants(token, ["app-a"], new Map());
    // autobyteus-296 (AC-005), as startup: bindings recovered, ACTIVE, then pending events (dispatch needs ACTIVE).
    // Reentry starts no worker (its launcher dependency is `stop` only); it starts on demand once ACTIVE.
    expect(order.slice(order.indexOf("app-a.worker.stop") + 1)).toEqual([
      "app-a.recovery.resume",
      "app-a.availability.active",
      "app-a.events.resume",
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
      },
      applicationAgentToolCallLifecycle: lifecycle,
    });

    const token = await service.prepareParticipants(["removed", "invalid"]);
    const setupRequired = "Application setup is required: invalid/slot:draftingTeam: Codex authentication is unavailable: no logged-in account.";
    await service.recoverParticipants(token, ["invalid"], new Map([["invalid", setupRequired]]));

    // A not-ready application is quarantined with its readiness reason (autobyteus-296, AC-006).
    expect(quarantined).toEqual([
      { applicationId: "removed", detail: "Application is no longer present in the current catalog." },
      { applicationId: "invalid", detail: setupRequired },
    ]);
    await expect(lifecycle.runAdmitted("removed", async () => undefined))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
    await expect(lifecycle.runAdmitted("invalid", async () => undefined))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
  });

  it("quarantines with the recovery failure, stops the worker and keeps tools closed when returning a participant fails", async () => {
    const lifecycle = new ApplicationAgentToolCallLifecycle();
    lifecycle.open("app-a");
    const stop = vi.fn(async () => undefined);
    const quarantineApplication = vi.fn((applicationId: string, detail: string) => ({
      ...active(applicationId), state: "QUARANTINED" as const, detail,
    }));
    const activateApplication = vi.fn((applicationId: string) => active(applicationId));
    const service = new ApplicationReentryService({
      availabilityService: {
        getAvailability: vi.fn(async (applicationId: string) => active(applicationId)),
        beginReentry: vi.fn((applicationId: string) => active(applicationId)),
        activateApplication,
        quarantineApplication,
      } as never,
      recoveryService: { resumeApplication: vi.fn(async () => { throw new Error("binding recovery failed"); }) },
      eventDispatchService: { suspendApplication: vi.fn(), resumePendingEventsForApplication: vi.fn(async () => undefined) },
      engineLauncher: { stop },
      applicationAgentToolCallLifecycle: lifecycle,
    });

    const token = await service.prepareParticipants(["app-a"]);
    const results = await service.recoverParticipants(token, ["app-a"], new Map());

    expect(results.get("app-a")).toMatchObject({ state: "QUARANTINED", detail: "binding recovery failed" });
    expect(activateApplication).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledTimes(2); // preparation, then the failure path
    await expect(lifecycle.runAdmitted("app-a", async () => undefined))
      .rejects.toMatchObject({ code: "APPLICATION_TOOL_UNAVAILABLE" });
  });
});
