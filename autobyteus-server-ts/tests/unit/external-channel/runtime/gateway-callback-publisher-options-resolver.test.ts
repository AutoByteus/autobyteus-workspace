import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import * as managedMessagingDefaults from "../../../../src/managed-capabilities/messaging-gateway/defaults.js";
import {
  buildManagedMessagingCallbackBaseUrl,
  resolveGatewayCallbackPublisherOptions,
} from "../../../../src/external-channel/runtime/gateway-callback-publisher-options-resolver.js";

describe("gateway-callback-publisher-options-resolver", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers explicit callback base URL overrides", () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue("http://gateway.example:9000"),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue("shared-secret"),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(9_000),
    });
    const managedServiceSpy = vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    );

    const result = resolveGatewayCallbackPublisherOptions();

    expect(result).toEqual({
      baseUrl: "http://gateway.example:9000",
      sharedSecret: "shared-secret",
      timeoutMs: 9_000,
    });
    expect(managedServiceSpy).not.toHaveBeenCalled();
  });

  it("falls back to the running managed gateway runtime endpoint", () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue(null),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue("shared-secret"),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(5_000),
    });
    vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    ).mockReturnValue({
      getRuntimeSnapshot: () => ({
        running: true,
        bindHost: "127.0.0.1",
        bindPort: 8010,
        pid: 123,
        startedAt: "2026-03-09T00:00:00.000Z",
      }),
    } as any);

    const result = resolveGatewayCallbackPublisherOptions();

    expect(result).toEqual({
      baseUrl: "http://127.0.0.1:8010",
      sharedSecret: "shared-secret",
      timeoutMs: 5_000,
    });
  });

  it("returns null when no explicit override exists and managed runtime is unavailable", () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue(null),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue(null),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(5_000),
    });
    vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    ).mockReturnValue({
      getRuntimeSnapshot: () => ({
        running: false,
        bindHost: null,
        bindPort: null,
        pid: null,
        startedAt: null,
      }),
    } as any);

    expect(resolveGatewayCallbackPublisherOptions()).toBeNull();
  });

  it("normalizes wildcard managed hosts into loopback callback URLs", () => {
    expect(
      buildManagedMessagingCallbackBaseUrl({
        running: true,
        bindHost: "0.0.0.0",
        bindPort: 8010,
      }),
    ).toBe("http://127.0.0.1:8010");
  });
});

const mockAppConfig = (mockConfig: {
  getChannelCallbackBaseUrl: () => string | null;
  getChannelCallbackSharedSecret: () => string | null;
  getChannelCallbackTimeoutMs: () => number;
}): void => {
  vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(mockConfig as any);
};
