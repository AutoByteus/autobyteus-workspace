import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
  PreviewToolError,
} from "../../../../src/agent-tools/preview/preview-tool-contract.js";
import { PreviewBridgeClient } from "../../../../src/agent-tools/preview/preview-bridge-client.js";

describe("PreviewBridgeClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
    delete process.env[PREVIEW_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when preview bridge environment variables are incomplete", () => {
    process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";

    expect(PreviewBridgeClient.fromEnvironment(process.env)).toBeNull();
  });

  it("sends authenticated preview requests and returns the normalized result", async () => {
    process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001/";
    process.env[PREVIEW_BRIDGE_TOKEN_ENV] = "preview-token";

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        result: {
          preview_session_id: "preview-session-1",
          status: "opened",
          url: "http://localhost:3000/demo",
          title: "Demo",
        },
      }),
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const client = PreviewBridgeClient.fromEnvironment(process.env);
    expect(client).not.toBeNull();

    const result = await client!.openPreview({
      url: "http://localhost:3000/demo",
      wait_until: "load",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:39001/preview/open", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-autobyteus-preview-token": "preview-token",
      },
      body: JSON.stringify({
        url: "http://localhost:3000/demo",
        wait_until: "load",
      }),
    });
    expect(result.preview_session_id).toBe("preview-session-1");
    expect(result.status).toBe("opened");
  });

  it("raises PreviewToolError when the bridge returns an error payload", async () => {
    const client = new PreviewBridgeClient({
      baseUrl: "http://127.0.0.1:39001",
      authToken: "preview-token",
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 400,
      json: async () => ({
        ok: false,
        error: {
          code: "preview_session_closed",
          message: "Preview session 'preview-session-1' has already been closed.",
        },
      }),
    }) as typeof globalThis.fetch;

    await expect(
      client.closePreview({ preview_session_id: "preview-session-1" }),
    ).rejects.toMatchObject<Partial<PreviewToolError>>({
      code: "preview_session_closed",
      message: "Preview session 'preview-session-1' has already been closed.",
    });
  });

  it("normalizes non-canonical bridge transport errors into preview_bridge_unavailable", async () => {
    const client = new PreviewBridgeClient({
      baseUrl: "http://127.0.0.1:39001",
      authToken: "preview-token",
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({
        ok: false,
        error: {
          code: "preview_bridge_unauthorized",
          message: "Preview bridge authorization failed.",
        },
      }),
    }) as typeof globalThis.fetch;

    await expect(
      client.openPreview({ url: "http://localhost:3000/demo", wait_until: "load" }),
    ).rejects.toMatchObject<Partial<PreviewToolError>>({
      code: "preview_bridge_unavailable",
      message: "Preview bridge authorization failed.",
    });
  });
});
