import { describe, expect, it } from "vitest";
import {
  createRequestOriginPolicy,
  parseConfiguredOrigins,
} from "../../../src/api/security/remote-access-request-origin.js";

const policy = createRequestOriginPolicy(["https://gateway.example"]);
const allowed = (headers: Record<string, string | string[] | undefined>): boolean => policy.isAllowed(headers);

describe("RequestOriginPolicy (REQ-002)", () => {
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

  it("allows http/https loopback origins on any port", () => {
    for (const origin of ["http://localhost:3000", "https://localhost", "http://127.0.0.1:5173", "http://127.5.6.7:1", "http://[::1]:3000"]) {
      expect(allowed({ origin, host: "192.168.1.25:29695" }), origin).toBe(true);
    }
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

describe("parseConfiguredOrigins", () => {
  it("normalizes comma-separated web origins and reports invalid entries", () => {
    expect(parseConfiguredOrigins(" https://Gateway.Example/base , http://10.0.0.5:8080,,file://,null, ftp://x ")).toEqual({
      origins: ["https://gateway.example", "http://10.0.0.5:8080"],
      invalidEntries: ["file://", "null", "ftp://x"],
    });
    expect(parseConfiguredOrigins("")).toEqual({ origins: [], invalidEntries: [] });
  });
});
