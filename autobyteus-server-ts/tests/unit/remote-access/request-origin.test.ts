import { describe, expect, it } from "vitest";
import {
  createRequestOriginPolicy,
  createToolEndpointOriginPolicy,
} from "../../../src/api/security/remote-access-request-origin.js";

const policy = createRequestOriginPolicy(["https://gateway.example", "http://127.0.0.1:3000"]);
const allowed = (headers: Record<string, string | string[] | undefined>): boolean => policy.isAllowed(headers);

describe("RequestOriginPolicy (403 REQ-002; 416 REQ-004)", () => {
  it("allows a request without Origin (desktop app fetch, peers, native clients)", () => {
    expect(allowed({ host: "192.168.1.25:29695" })).toBe(true);
    expect(allowed({})).toBe(true);
  });

  it("allows exactly file:// (packaged desktop app) and refuses other file origins", () => {
    expect(allowed({ origin: "file://", host: "127.0.0.1:29695" })).toBe(true);
    expect(allowed({ origin: "file:///x", host: "127.0.0.1:29695" })).toBe(false);
  });

  it("allows the same origin by host[:port], case-insensitive, scheme not compared", () => {
    expect(allowed({ origin: "http://192.168.1.25:29695", host: "192.168.1.25:29695" })).toBe(true);
    expect(allowed({ origin: "https://Desktop.Tail.ts.net", host: "desktop.tail.ts.net" })).toBe(true);
    expect(allowed({ origin: "https://desktop.tail.ts.net", host: "DESKTOP.TAIL.TS.NET" })).toBe(true);
    expect(allowed({ origin: "http://192.168.1.25:8080", host: "192.168.1.25:29695" })).toBe(false);
  });

  it("allows the first X-Forwarded-Host value when a gateway rewrites Host", () => {
    expect(allowed({
      origin: "https://node.gateway.example",
      host: "127.0.0.1:29695",
      "x-forwarded-host": "node.gateway.example, internal.proxy",
    })).toBe(true);
    expect(allowed({
      origin: "https://internal.proxy",
      host: "127.0.0.1:29695",
      "x-forwarded-host": "node.gateway.example, internal.proxy",
    })).toBe(false);
  });

  it("refuses loopback origins on any port unless listed exactly (416 DEC-002 = A)", () => {
    for (const origin of ["http://localhost:5173", "https://localhost", "http://127.0.0.1:8080", "http://127.5.6.7:1", "http://[::1]:3000", "http://localhost:3000"]) {
      expect(allowed({ origin, host: "192.168.1.25:29695" }), origin).toBe(false);
    }
    expect(allowed({ origin: "http://127.0.0.1:3000", host: "192.168.1.25:29695" })).toBe(true);
  });

  it("still allows the node's own loopback origin (same origin)", () => {
    expect(allowed({ origin: "http://127.0.0.1:29695", host: "127.0.0.1:29695" })).toBe(true);
    expect(allowed({ origin: "http://localhost:29695", host: "localhost:29695" })).toBe(true);
  });

  it("allows configured origins exactly", () => {
    expect(allowed({ origin: "https://gateway.example", host: "10.0.0.2:29695" })).toBe(true);
    expect(allowed({ origin: "http://gateway.example", host: "10.0.0.2:29695" })).toBe(false);
    expect(allowed({ origin: "https://gateway.example:8443", host: "10.0.0.2:29695" })).toBe(false);
  });

  it("refuses foreign origins, near misses, null, other schemes and malformed values", () => {
    for (const origin of [
      "https://evil.example",
      "https://desktop.tail.ts.net.evil.example",
      "http://127.0.0.1.evil.example",
      "http://localhost.evil.example",
      "null",
      "chrome-extension://abcdef",
      "ws://desktop.tail.ts.net",
      "not a url",
      "",
    ]) {
      expect(allowed({ origin, host: "desktop.tail.ts.net" }), origin).toBe(false);
    }
    expect(allowed({ origin: ["https://desktop.tail.ts.net"], host: "desktop.tail.ts.net" })).toBe(false);
  });
});

describe("tool-endpoint origin rule (416 REQ-004, DEC-007)", () => {
  const toolPolicy = createToolEndpointOriginPolicy(["http://127.0.0.1:3000"]);
  const toolAllowed = (headers: Record<string, string | string[] | undefined>): boolean => toolPolicy.isAllowed(headers);

  it("allows programs (no Origin) and configured origins only", () => {
    expect(toolAllowed({ host: "127.0.0.1:8000" })).toBe(true);
    expect(toolAllowed({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:8000" })).toBe(true);
  });

  it("refuses loopback origins on any port, the node's own origin, file:// and null", () => {
    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:8080",
      "http://[::1]:3000",
      "http://127.0.0.1:8000",
      "file://",
      "null",
      "",
      "https://evil.example",
    ]) {
      expect(toolAllowed({ origin, host: "127.0.0.1:8000" }), origin).toBe(false);
    }
    expect(toolAllowed({ origin: ["http://127.0.0.1:3000"], host: "127.0.0.1:8000" })).toBe(false);
  });
});
