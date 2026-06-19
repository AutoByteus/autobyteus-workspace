import { afterEach, describe, expect, it } from "vitest";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
} from "../../../../src/agent-tools/browser/browser-tool-contract.js";
import { getBrowserBridgeConfigResolver } from "../../../../src/agent-tools/browser/browser-bridge-config-resolver.js";

describe("BrowserBridgeConfigResolver", () => {
  afterEach(() => {
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
  });

  it("returns environment-based browser bridge config when present", () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:30123";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "embedded-token";

    const config = getBrowserBridgeConfigResolver().resolve(process.env);

    expect(config).toEqual({
      baseUrl: "http://127.0.0.1:30123",
      authToken: "embedded-token",
    });
  });

  it("reports no support when Electron bridge environment config is missing", () => {
    expect(getBrowserBridgeConfigResolver().resolve(process.env)).toBeNull();
    expect(getBrowserBridgeConfigResolver().hasSupport(process.env)).toBe(false);
  });
});
