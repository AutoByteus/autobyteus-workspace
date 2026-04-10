import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../../src/agent-tools/browser/browser-tool-contract.js";

const { getCurrentBindingMock } = vi.hoisted(() => ({
  getCurrentBindingMock: vi.fn(),
}));

vi.mock("../../../../src/agent-tools/browser/runtime-browser-bridge-registration-service.js", () => ({
  getRuntimeBrowserBridgeRegistrationService: () => ({
    getCurrentBinding: getCurrentBindingMock,
  }),
}));

import { getBrowserBridgeConfigResolver } from "../../../../src/agent-tools/browser/browser-bridge-config-resolver.js";

describe("BrowserBridgeConfigResolver", () => {
  afterEach(() => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
    getCurrentBindingMock.mockReset();
  });

  it("prefers environment-based browser bridge config when present", () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:30123";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "embedded-token";
    getCurrentBindingMock.mockReturnValue({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "remote-token",
    });

    const config = getBrowserBridgeConfigResolver().resolve(process.env);

    expect(config).toEqual({
      baseUrl: "http://127.0.0.1:30123",
      authToken: "embedded-token",
    });
  });

  it("falls back to the runtime browser bridge binding when environment config is missing", () => {
    getCurrentBindingMock.mockReturnValue({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "remote-token",
    });

    const config = getBrowserBridgeConfigResolver().resolve(process.env);

    expect(config).toEqual({
      baseUrl: "http://host.docker.internal:30123",
      authToken: "remote-token",
    });
  });

  it("reports no support when neither environment config nor runtime binding exists", () => {
    getCurrentBindingMock.mockReturnValue(null);

    expect(getBrowserBridgeConfigResolver().hasSupport(process.env)).toBe(false);
  });
});
