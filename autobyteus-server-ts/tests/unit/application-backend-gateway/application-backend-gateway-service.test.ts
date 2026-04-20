import { describe, expect, it, vi } from "vitest";
import { ApplicationUnavailableError } from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";

describe("ApplicationBackendGatewayService", () => {
  it("keeps the backend gateway app-scoped and forwards optional launch context explicitly", async () => {
    const bundleService = {
      getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
    };
    const engineHostService = {
      invokeApplicationQuery: vi.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: engineHostService as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    const result = await service.invokeApplicationQuery(
      "app-1",
      "tickets.get",
      {
        applicationId: "app-1",
        launchInstanceId: "launch-123",
      },
      { ticketId: "t-1" },
    );

    expect(result).toEqual({ ok: true });
    expect(engineHostService.invokeApplicationQuery).toHaveBeenCalledWith("app-1", {
      queryName: "tickets.get",
      requestContext: {
        applicationId: "app-1",
        launchInstanceId: "launch-123",
      },
      input: { ticketId: "t-1" },
    });
  });

  it("rejects mismatched requestContext identity so callers cannot bypass the app boundary", async () => {
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      engineHostService: {
        invokeApplicationCommand: vi.fn(),
      } as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    await expect(service.invokeApplicationCommand(
      "app-1",
      "tickets.create",
      {
        applicationId: "other-app",
        launchInstanceId: null,
      },
      { title: "Hello" },
    )).rejects.toThrow("requestContext.applicationId must match the route applicationId");
  });

  it("surfaces application availability failures before worker launch", async () => {
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn(),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => {
          throw new ApplicationUnavailableError("app-1", "QUARANTINED", "manifest invalid");
        }),
      } as never,
      engineHostService: {
        ensureApplicationEngine: vi.fn(),
      } as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    await expect(service.ensureApplicationReady("app-1")).rejects.toThrow(
      "Application 'app-1' is currently quarantined: manifest invalid",
    );
  });
});
