import { describe, expect, it } from "vitest";
import { normalizeNodeBaseUrl } from "../../../src/remote-access/services/url-normalization.js";

describe("remote access URL normalization", () => {
  it("strips mobile shell paths and preserves deployment base paths", () => {
    expect(normalizeNodeBaseUrl("https://desktop.tailnet.ts.net/mobile?pairing=abc")).toBe(
      "https://desktop.tailnet.ts.net",
    );
    expect(normalizeNodeBaseUrl("https://gateway.example.com/autobyteus/mobile")).toBe(
      "https://gateway.example.com/autobyteus",
    );
    expect(normalizeNodeBaseUrl("https://gateway.example.com/autobyteus/mobile/workspace#top")).toBe(
      "https://gateway.example.com/autobyteus",
    );
  });

  it("strips API and WebSocket surfaces into the canonical server base", () => {
    expect(normalizeNodeBaseUrl("https://desktop.tailnet.ts.net/rest/remote-access/status")).toBe(
      "https://desktop.tailnet.ts.net",
    );
    expect(normalizeNodeBaseUrl("https://gateway.example.com/autobyteus/graphql")).toBe(
      "https://gateway.example.com/autobyteus",
    );
    expect(normalizeNodeBaseUrl("https://gateway.example.com/autobyteus/ws/agent")).toBe(
      "https://gateway.example.com/autobyteus",
    );
  });

  it("keeps plain base paths and rejects unsupported schemes", () => {
    expect(normalizeNodeBaseUrl("gateway.example.com/autobyteus/")).toBe(
      "http://gateway.example.com/autobyteus",
    );
    expect(() => normalizeNodeBaseUrl("ftp://gateway.example.com/autobyteus/mobile")).toThrow(
      "Server base URL must use http or https.",
    );
  });
});
