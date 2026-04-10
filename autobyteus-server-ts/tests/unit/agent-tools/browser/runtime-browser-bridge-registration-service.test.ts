import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { syncWithSupportMock } = vi.hoisted(() => ({
  syncWithSupportMock: vi.fn(),
}));

vi.mock("../../../../src/agent-tools/browser/browser-tool-registry-sync.js", () => ({
  getBrowserToolRegistrySync: () => ({
    syncWithSupport: syncWithSupportMock,
  }),
}));

import { getRuntimeBrowserBridgeRegistrationService } from "../../../../src/agent-tools/browser/runtime-browser-bridge-registration-service.js";

describe("RuntimeBrowserBridgeRegistrationService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    syncWithSupportMock.mockReset();
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
  });

  afterEach(() => {
    getRuntimeBrowserBridgeRegistrationService().clearBinding("manual_revoke");
    vi.useRealTimers();
  });

  it("registers a runtime bridge binding and exposes the current bridge config", () => {
    const service = getRuntimeBrowserBridgeRegistrationService();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const binding = service.registerBinding({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "browser-token",
      expiresAt,
    });

    expect(binding.baseUrl).toBe("http://host.docker.internal:30123");
    expect(service.getCurrentBinding()).toEqual({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "browser-token",
    });
    expect(syncWithSupportMock).toHaveBeenCalledWith({
      hasRuntimeBinding: true,
    });
  });

  it("clears the runtime binding and unregisters browser tools when revoked", () => {
    const service = getRuntimeBrowserBridgeRegistrationService();
    service.registerBinding({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "browser-token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    service.clearBinding("manual_revoke");

    expect(service.getCurrentBinding()).toBeNull();
    expect(syncWithSupportMock).toHaveBeenLastCalledWith({
      hasRuntimeBinding: false,
    });
  });

  it("expires the runtime binding on schedule", () => {
    const service = getRuntimeBrowserBridgeRegistrationService();
    service.registerBinding({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "browser-token",
      expiresAt: new Date(Date.now() + 5_000).toISOString(),
    });

    vi.advanceTimersByTime(5_001);

    expect(service.getCurrentBinding()).toBeNull();
    expect(syncWithSupportMock).toHaveBeenLastCalledWith({
      hasRuntimeBinding: false,
    });
  });
});
