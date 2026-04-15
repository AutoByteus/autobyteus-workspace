import { describe, expect, it, vi } from "vitest";
import { ApplicationBackendGatewayService } from "../../../src/application-backend-gateway/services/application-backend-gateway-service.js";

describe("ApplicationBackendGatewayService", () => {
  it("keeps the backend gateway app-scoped and forwards optional session context explicitly", async () => {
    const bundleService = {
      getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
    };
    const engineHostService = {
      invokeApplicationQuery: vi.fn().mockResolvedValue({ ok: true }),
    };
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: bundleService as never,
      engineHostService: engineHostService as never,
      notificationStreamService: { publish: vi.fn() } as never,
    });

    const result = await service.invokeApplicationQuery(
      "app-1",
      "tickets.get",
      {
        applicationId: "app-1",
        applicationSessionId: "session-123",
      },
      { ticketId: "t-1" },
    );

    expect(result).toEqual({ ok: true });
    expect(engineHostService.invokeApplicationQuery).toHaveBeenCalledWith("app-1", {
      queryName: "tickets.get",
      requestContext: {
        applicationId: "app-1",
        applicationSessionId: "session-123",
      },
      input: { ticketId: "t-1" },
    });
  });

  it("rejects mismatched requestContext identity so callers cannot bypass the app boundary", async () => {
    const service = new ApplicationBackendGatewayService({
      applicationBundleService: {
        getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
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
        applicationSessionId: null,
      },
      { title: "Hello" },
    )).rejects.toThrow("requestContext.applicationId must match the route applicationId");
  });
});
