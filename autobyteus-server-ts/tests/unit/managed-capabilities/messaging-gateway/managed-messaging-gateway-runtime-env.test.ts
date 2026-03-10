import { afterEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import {
  AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR,
} from "../../../../src/config/server-runtime-endpoints.js";
import {
  buildManagedMessagingGatewayRuntimeEnv,
} from "../../../../src/managed-capabilities/messaging-gateway/managed-messaging-gateway-runtime-env.js";
import {
  createDefaultManagedMessagingProviderConfig,
} from "../../../../src/managed-capabilities/messaging-gateway/types.js";

describe("managed-messaging-gateway-runtime-env", () => {
  const originalInternalBaseUrl =
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];

  afterEach(() => {
    if (originalInternalBaseUrl === undefined) {
      delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    } else {
      process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
        originalInternalBaseUrl;
    }
    vi.restoreAllMocks();
  });

  it("uses the runtime-only internal server base url for gateway callbacks", () => {
    process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR] =
      "http://127.0.0.1:8000";
    const mockConfig = {
      get: vi.fn().mockReturnValue("server-shared-secret"),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue(
        "callback-shared-secret",
      ),
      getBaseUrl: vi.fn().mockReturnValue("http://localhost:60634"),
    };
    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue(mockConfig as any);

    const runtimeEnv = buildManagedMessagingGatewayRuntimeEnv({
      providerConfig: createDefaultManagedMessagingProviderConfig(),
      bindHost: "127.0.0.1",
      bindPort: 8010,
      adminToken: "admin-token",
      runtimeDataRoot: "/tmp/runtime-data",
    });

    expect(runtimeEnv.GATEWAY_SERVER_BASE_URL).toBe("http://127.0.0.1:8000");
    expect(mockConfig.getBaseUrl).not.toHaveBeenCalled();
  });

  it("fails explicitly when the runtime-only internal server base url is unavailable", () => {
    delete process.env[AUTOBYTEUS_INTERNAL_SERVER_BASE_URL_ENV_VAR];
    vi.spyOn(appConfigProvider, "config", "get").mockReturnValue({
      get: vi.fn().mockReturnValue(""),
      getChannelCallbackSharedSecret: vi.fn().mockReturnValue(""),
    } as any);

    expect(() =>
      buildManagedMessagingGatewayRuntimeEnv({
        providerConfig: createDefaultManagedMessagingProviderConfig(),
        bindHost: "127.0.0.1",
        bindPort: 8010,
        adminToken: "admin-token",
        runtimeDataRoot: "/tmp/runtime-data",
      }),
    ).toThrow(/AUTOBYTEUS_INTERNAL_SERVER_BASE_URL/);
  });
});
