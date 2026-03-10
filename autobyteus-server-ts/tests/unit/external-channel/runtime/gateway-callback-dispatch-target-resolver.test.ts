import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import * as managedMessagingDefaults from "../../../../src/managed-capabilities/messaging-gateway/defaults.js";
import {
  buildManagedMessagingCallbackBaseUrl,
  resolveGatewayCallbackDispatchTarget,
} from "../../../../src/external-channel/runtime/gateway-callback-dispatch-target-resolver.js";

describe("gateway-callback-dispatch-target-resolver", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers explicit callback base URL overrides", async () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue("http://gateway.example:9000"),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue("shared-secret"),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(9_000),
    });
    const managedServiceSpy = vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    );

    const result = await resolveGatewayCallbackDispatchTarget();

    expect(result).toEqual({
      state: "AVAILABLE",
      options: {
        baseUrl: "http://gateway.example:9000",
        sharedSecret: "shared-secret",
        timeoutMs: 9_000,
      },
      reason: null,
    });
    expect(managedServiceSpy).not.toHaveBeenCalled();
  });

  it("returns managed gateway options when the managed runtime is running", async () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue(null),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue("shared-secret"),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(5_000),
    });
    vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    ).mockReturnValue({
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        lifecycleState: "RUNNING",
        runtimeRunning: true,
        bindHost: "127.0.0.1",
        bindPort: 8010,
      }),
    } as any);

    const result = await resolveGatewayCallbackDispatchTarget();

    expect(result).toEqual({
      state: "AVAILABLE",
      options: {
        baseUrl: "http://127.0.0.1:8010",
        sharedSecret: "shared-secret",
        timeoutMs: 5_000,
      },
      reason: null,
    });
  });

  it("treats managed delivery as unavailable when managed messaging is enabled but not running", async () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue(null),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue(null),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(5_000),
    });
    vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    ).mockReturnValue({
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        lifecycleState: "DEGRADED",
        runtimeRunning: false,
        bindHost: "127.0.0.1",
        bindPort: 8010,
      }),
    } as any);

    const result = await resolveGatewayCallbackDispatchTarget();

    expect(result).toEqual({
      state: "UNAVAILABLE",
      options: null,
      reason: "Managed messaging gateway target is not currently available.",
    });
  });

  it("treats callback delivery as disabled when managed messaging is not enabled", async () => {
    mockAppConfig({
      getChannelCallbackBaseUrl: vi.fn().mockReturnValue(null),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue(null),
      getChannelCallbackTimeoutMs: vi.fn().mockReturnValue(5_000),
    });
    vi.spyOn(
      managedMessagingDefaults,
      "getManagedMessagingGatewayService",
    ).mockReturnValue({
      getStatus: vi.fn().mockResolvedValue({
        enabled: false,
      }),
    } as any);

    const result = await resolveGatewayCallbackDispatchTarget();

    expect(result).toEqual({
      state: "DISABLED",
      options: null,
      reason: "Channel callback delivery is not configured.",
    });
  });

  it("normalizes wildcard managed hosts into loopback callback URLs", () => {
    expect(
      buildManagedMessagingCallbackBaseUrl({
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
