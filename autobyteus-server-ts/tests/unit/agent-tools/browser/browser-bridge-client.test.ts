import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BROWSER_BRIDGE_BASE_URL_ENV,
  BROWSER_BRIDGE_TOKEN_ENV,
  BrowserToolError,
} from "../../../../src/agent-tools/browser/browser-tool-contract.js";
import { BrowserBridgeClient } from "../../../../src/agent-tools/browser/browser-bridge-client.js";

describe("BrowserBridgeClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[BROWSER_BRIDGE_BASE_URL_ENV];
    delete process.env[BROWSER_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when browser bridge environment variables are incomplete", () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";

    expect(BrowserBridgeClient.fromEnvironment(process.env)).toBeNull();
  });

  it("sends authenticated browser requests and returns the normalized result", async () => {
    process.env[BROWSER_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001/";
    process.env[BROWSER_BRIDGE_TOKEN_ENV] = "browser-token";

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        result: {
          tab_id: "browser-session-1",
          status: "opened",
          url: "http://localhost:3000/demo",
          title: "Demo",
        },
      }),
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = BrowserBridgeClient.fromEnvironment(process.env);
    expect(client).not.toBeNull();

    const result = await client!.openTab({
      url: "http://localhost:3000/demo",
      wait_until: "load",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:39001/browser/open", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-autobyteus-browser-token": "browser-token",
      },
      body: JSON.stringify({
        url: "http://localhost:3000/demo",
        wait_until: "load",
      }),
    });
    expect(result.tab_id).toBe("browser-session-1");
    expect(result.status).toBe("opened");
  });

  it("raises BrowserToolError when the bridge returns an error payload", async () => {
    const client = new BrowserBridgeClient({
      baseUrl: "http://127.0.0.1:39001",
      authToken: "browser-token",
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        ok: false,
        error: {
          code: "browser_tab_closed",
          message: "Browser session 'browser-session-1' has already been closed.",
        },
      }),
    }) as typeof globalThis.fetch;

    await expect(
      client.closeTab({ tab_id: "browser-session-1" }),
    ).rejects.toMatchObject<Partial<BrowserToolError>>({
      code: "browser_tab_closed",
      message: "Browser session 'browser-session-1' has already been closed.",
    });
  });

  it("normalizes non-canonical bridge transport errors into browser_bridge_unavailable", async () => {
    const client = new BrowserBridgeClient({
      baseUrl: "http://127.0.0.1:39001",
      authToken: "browser-token",
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({
        ok: false,
        error: {
          code: "browser_bridge_unauthorized",
          message: "Browser bridge authorization failed.",
        },
      }),
    }) as typeof globalThis.fetch;

    await expect(
      client.openTab({ url: "http://localhost:3000/demo", wait_until: "load" }),
    ).rejects.toMatchObject<Partial<BrowserToolError>>({
      code: "browser_bridge_unavailable",
      message: "Browser bridge authorization failed.",
    });
  });
});
